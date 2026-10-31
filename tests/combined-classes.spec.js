import { test, expect } from "./fixtures";
import { memoryStore, createPairHandler } from "../server/pairing.js";
import { createSchoolHandler } from "../server/school.js";

function client(handler) {
  return async (body, token, pairId) => {
    let result;
    const response = {
      setHeader() {},
      status(status) {
        this.code = status;
        return this;
      },
      json(value) {
        result = { status: this.code, ...value };
      },
    };
    await handler(
      {
        method: "POST",
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(pairId ? { "x-pair-id": pairId } : {}),
        },
        body,
      },
      response,
    );
    return result;
  };
}
const login = (call, classIds) =>
  call({ action: "login", role: "teacher", password: "1111", classIds });
const seed = async (call, token, classId, name = "דנה") =>
  call(
    {
      action: "saveRoster",
      classId,
      version: 0,
      students: [{ id: "same-id", name, emoji: "🌼" }],
    },
    token,
  );
const activeState = (students) => ({
  students: students.map((p) => ({
    ...p,
    present: true,
    hearts: 0,
    warning: 0,
  })),
  groups: [],
  stages: [{ id: "first", name: "פתיחה", minutes: 5 }],
  stage: 0,
  timer: { remaining: 300, end: null },
  projection: { type: "blank" },
  slide: 0,
});

test("six independent classes can run together and overlapping combined lessons acquire all classes or none", async () => {
  const store = memoryStore(),
    call = client(createSchoolHandler(() => store));
  const sessions = await Promise.all(
    ["a1", "b1", "g1", "d1", "h1", "v1"].map((id) => login(call, [id])),
  );
  expect(sessions.every((s) => s.status === 200)).toBe(true);
  expect((await login(call, ["a1"])).status).toBe(409);
  expect((await login(call, ["a1", "b1"])).status).toBe(409);
  await call({ action: "release" }, sessions[1].authToken);
  expect((await login(call, ["a1", "b1"])).status).toBe(409);
  expect((await login(call, ["b1"])).status).toBe(200);
  // A failed multi-class claim did not capture the available class.
});

test("combined rosters preserve equal original IDs, save reports into source classes and fence off old controllers", async () => {
  const store = memoryStore(),
    call = client(createSchoolHandler(() => store)),
    pair = client(createPairHandler(() => store));
  const admin = await call({
    action: "login",
    role: "admin",
    password: "1111",
  });
  await seed(call, admin.authToken, "a1");
  await seed(call, admin.authToken, "b1");
  const session = await login(call, ["a1", "b1"]);
  expect(session.status).toBe(200);
  expect((await login(call, ["a1"])).status).toBe(409);
  expect((await login(call, ["b1", "g1"])).status).toBe(409);
  expect((await login(call, ["g1"])).status).toBe(200);
  const combinedId = session.classId;
  const roster = await call(
    { action: "roster", classId: combinedId },
    session.authToken,
  );
  expect(roster.roster.students).toHaveLength(2);
  expect(new Set(roster.roster.students.map((p) => p.id)).size).toBe(2);
  expect(roster.roster.students.map((p) => p.name)).toEqual([
    "דנה · א1",
    "דנה · ב1",
  ]);
  expect(
    (
      await call(
        { action: "saveRoster", classId: combinedId, students: [], version: 0 },
        session.authToken,
      )
    ).status,
  ).toBe(400);
  const state = activeState(roster.roster.students);
  const host = await pair({
    action: "create",
    password: "1111",
    authToken: session.authToken,
    classroom: session.classroom,
    state,
  });
  expect(host.status).toBe(200);
  const restored = await pair({
    action: "create",
    password: "1111",
    authToken: session.authToken,
    classroom: session.classroom,
    state: { ...state, slide: 3 },
  });
  expect(restored.id).toBe(host.id);
  expect(restored.state.slide).toBe(0);
  const phone = await pair({ action: "join", code: host.code });
  expect(phone.status).toBe(200);
  const now = Date.now();
  const report = {
    id: "shared-lesson",
    startedAt: now - 60000,
    endedAt: now,
    completed: true,
    students: state.students.map((p, i) => ({
      ...p,
      hearts: i + 1,
      warnings: 0,
    })),
  };
  expect(
    (
      await call(
        { action: "saveReport", classId: combinedId, report },
        phone.token,
        phone.id,
      )
    ).status,
  ).toBe(200);
  for (const [classId, hearts] of [
    ["a1", 1],
    ["b1", 2],
  ]) {
    const saved = await call({ action: "reports", classId }, admin.authToken);
    expect(saved.records[0].students).toMatchObject([
      { id: "same-id", name: "דנה", hearts },
    ]);
    expect(
      (await call({ action: "roster", classId }, admin.authToken)).roster
        .students[0].name,
    ).toBe("דנה");
  }
  expect(
    (await call({ action: "roster", classId: "h1" }, session.authToken)).status,
  ).toBe(403);
  await call({ action: "release" }, session.authToken);
  const replacement = await login(call, ["a1", "b1"]);
  expect(replacement.status).toBe(200);
  expect(
    (await call({ action: "roster", classId: combinedId }, session.authToken))
      .status,
  ).toBe(409);
  expect(
    (
      await pair({
        action: "write",
        id: host.id,
        token: host.token,
        version: 0,
        state,
        op: crypto.randomUUID(),
      })
    ).status,
  ).toBe(409);
  expect(
    (await pair({ action: "read", id: phone.id, token: phone.token })).status,
  ).toBe(409);
  expect((await call({ action: "heartbeat" }, session.authToken)).status).toBe(
    409,
  );
});

test("an expired lease cannot overwrite a replacement lesson and classroom expiry is recoverable", async () => {
  const store = memoryStore(),
    call = client(createSchoolHandler(() => store));
  const first = await login(call, ["a1", "b1"]);
  const key = "{beyachad-school}:active-lessons";
  const raw = await store.get(key),
    locks = JSON.parse(raw);
  for (const lock of Object.values(locks)) lock.expiresAt = Date.now() - 1;
  await store.cas(key, raw, JSON.stringify(locks), 0);
  const second = await login(call, ["a1"]);
  expect(second.status).toBe(200);
  expect((await call({ action: "heartbeat" }, first.authToken)).status).toBe(
    409,
  );
  await call({ action: "release" }, first.authToken);
  expect((await login(call, ["a1"])).status).toBe(409);
  expect((await login(call, ["b1"])).status).toBe(200);
});

test("the entry screen starts a shared lesson, preserves source rosters and releases both classes on logout", async ({
  page,
  request,
  browser,
}) => {
  const post = async (body, token) => {
    const r = await request.post("/api/school", {
      data: body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const admin = await post({
    action: "login",
    role: "admin",
    password: "1111",
  });
  for (const classId of ["a1", "b1"])
    await post(
      {
        action: "saveRoster",
        classId,
        version: 0,
        students: [{ id: "same-id", name: "דנה", emoji: "🌼" }],
      },
      admin.authToken,
    );
  await page.goto("/");
  await page.getByLabel("שיעור משולב לכמה כיתות", { exact: true }).check();
  await page.getByLabel("כיתה א1", { exact: true }).check();
  await page.getByLabel("כיתה ב1", { exact: true }).check();
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".combined-lesson-banner")).toContainText(
    "א1 + ב1",
  );
  await expect(page.locator(".workspace")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await page.getByRole("button", { name: "לב לדנה · א1", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = JSON.parse(sessionStorage.getItem("beyachad-session-v1"));
        return JSON.parse(
          localStorage.getItem(`beyachad-demo-v1-class-${s.classId}`),
        ).students.find((p) => p.sourceClassId === "a1").hearts;
      }),
    )
    .toBe(1);
  await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
  const code = await page.locator(".pair-code").innerText();
  await page.getByRole("button", { name: "סגירה", exact: true }).click();
  const phoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const phone = await phoneContext.newPage();
    await phone.goto("http://127.0.0.1:5173/?view=join");
    await phone.getByLabel("קוד חיבור", { exact: true }).fill(code);
    await phone
      .getByRole("button", { name: "חיבור לשיעור", exact: true })
      .click();
    await phone.getByRole("button", { name: "תלמידים", exact: true }).click();
    await phone
      .getByRole("button", { name: "לב לדנה · ב1", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const session = JSON.parse(
            sessionStorage.getItem("beyachad-session-v1"),
          );
          return JSON.parse(
            localStorage.getItem(`beyachad-demo-v1-class-${session.classId}`),
          ).students.find((p) => p.sourceClassId === "b1").hearts;
        }),
      )
      .toBe(1);
    expect(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await phoneContext.close();
  }
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await post({ action: "reports", classId: "a1" }, admin.authToken))
          .records.length,
    )
    .toBe(1);
  const saved = await post(
    { action: "reports", classId: "a1" },
    admin.authToken,
  );
  expect(saved.records[0].students[0]).toMatchObject({
    id: "same-id",
    name: "דנה",
    hearts: 1,
  });
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לקלי קלוח" }),
  ).toBeVisible();
  const available = await post({ action: "classes" });
  expect(available.occupied).not.toContain("a1");
  expect(available.occupied).not.toContain("b1");
});

test("six combined classes support more than 200 students and demo pairing cannot invent class permissions", async () => {
  const store = memoryStore(),
    call = client(createSchoolHandler(() => store)),
    pair = client(createPairHandler(() => store));
  const admin = await call({
    action: "login",
    role: "admin",
    password: "1111",
  });
  const ids = ["a1", "b1", "g1", "d1", "h1", "v1"];
  for (const classId of ids) {
    expect(
      (
        await call(
          {
            action: "saveRoster",
            classId,
            version: 0,
            students: Array.from({ length: 35 }, (_, i) => ({
              id: `p${i}`,
              name: `תלמיד ${i}`,
              emoji: "🌼",
            })),
          },
          admin.authToken,
        )
      ).status,
    ).toBe(200);
  }
  const session = await login(call, ids);
  const roster = await call(
    { action: "roster", classId: session.classId },
    session.authToken,
  );
  expect(roster.roster.students).toHaveLength(210);
  expect(new Set(roster.roster.students.map((p) => p.id)).size).toBe(210);
  expect(
    (
      await pair({
        action: "create",
        password: "1111",
        authToken: session.authToken,
        classroom: session.classroom,
        state: activeState(roster.roster.students),
      })
    ).status,
  ).toBe(200);
  const demo = await pair({
    action: "create",
    password: "1111",
    classroom: {
      id: "g2",
      name: "דמה",
      combined: true,
      classIds: ["a1"],
      members: [{ id: "a1", name: "א1" }],
    },
    state: activeState([]),
  });
  expect(demo.status).toBe(200);
  expect(
    (await call({ action: "roster", classId: "a1" }, demo.token, demo.id))
      .status,
  ).toBe(403);
});

test("older real-class sign-ins return to entry instead of editing without class ownership", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({
        role: "teacher",
        classId: "a1",
        authToken: "older-session",
      }),
    ),
  );
  await page.goto("/?class=a1");
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לקלי קלוח" }),
  ).toBeVisible();
  await expect(page.locator(".workspace")).toHaveCount(0);
});
