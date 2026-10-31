import { test, expect } from "./fixtures";
import {
  createPairHandler,
  memoryStore,
  redisStore,
} from "../server/pairing.js";
function client(handler) {
  return async (body) => {
    let result;
    const res = {
      setHeader() {},
      status(status) {
        this.code = status;
        return this;
      },
      json(value) {
        result = { status: this.code, ...value };
      },
    };
    await handler({ method: "POST", headers: {}, body }, res);
    return result;
  };
}
const sample = () => ({
  students: [],
  groups: [],
  stages: [{ id: "a", name: "פתיחה", minutes: 5 }],
  stage: 0,
  timer: { remaining: 300, end: null },
  projection: { type: "slides" },
  slide: 0,
});
test("pair API rejects unauthorized access, consumes code once, detects conflicts, deduplicates retries and revokes devices", async () => {
  const request = client(createPairHandler(() => store)),
    store = memoryStore();
  const created = await request({
    action: "create",
    password: "1111",
    classroom: { id: "g2", name: "כיתת דמה" },
    state: sample(),
  });
  expect(created.status).toBe(200);
  const joined = await request({ action: "join", code: created.code });
  expect(joined.status).toBe(200);
  expect(
    (await request({ action: "join", code: created.code })).status,
  ).not.toBe(200);
  expect(
    (await request({ action: "read", id: created.id, token: "bad" })).status,
  ).toBe(401);
  const op = crypto.randomUUID(),
    state = { ...sample(), slide: 1 };
  expect(
    (
      await request({
        action: "write",
        id: joined.id,
        token: joined.token,
        state,
        version: 0,
        op,
      })
    ).version,
  ).toBe(1);
  expect(
    (
      await request({
        action: "write",
        id: joined.id,
        token: joined.token,
        state,
        version: 0,
        op,
      })
    ).version,
  ).toBe(1);
  expect(
    (
      await request({
        action: "write",
        id: joined.id,
        token: joined.token,
        state,
        version: 0,
        op: crypto.randomUUID(),
      })
    ).status,
  ).toBe(409);
  expect(
    (await request({ action: "close", id: joined.id, token: joined.token }))
      .status,
  ).toBe(403);
  expect(
    (await request({ action: "close", id: created.id, token: created.token }))
      .closed,
  ).toBe(true);
  expect(
    (await request({ action: "read", id: joined.id, token: joined.token }))
      .status,
  ).toBe(410);
});
test("missing production store is reported instead of generating a fake code", () => {
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)
    test.skip();
  expect(() => redisStore()).toThrow(/Redis/);
});
