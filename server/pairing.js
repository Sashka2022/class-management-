import {
  randomBytes,
  randomInt,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { teacherSession, changeControl, digest } from "./lessonSessions.js";
const TTL = 4 * 60 * 60;
const hash = (s) => createHash("sha256").update(String(s)).digest("hex");
const secret = () => randomBytes(32).toString("hex");
const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export function memoryStore() {
  const map = new Map();
  function value(k) {
    const v = map.get(k);
    if (v?.until < Date.now()) {
      map.delete(k);
      return null;
    }
    return v?.value ?? null;
  }
  return {
    async get(k) {
      return value(k);
    },
    async create(k, v, ttl) {
      if (value(k) !== null) return false;
      map.set(k, { value: v, until: ttl ? Date.now() + ttl * 1000 : Infinity });
      return true;
    },
    async cas(k, old, next, ttl) {
      if (value(k) !== old) return false;
      map.set(k, {
        value: next,
        until: ttl ? Date.now() + ttl * 1000 : Infinity,
      });
      return true;
    },
    async del(k) {
      map.delete(k);
    },
    async many(keys) {
      return keys.map(value);
    },
    async list(k) {
      return [...(value(k) || new Set())];
    },
    clear() {
      map.clear();
    },
    async atomic({
      key,
      expected,
      next,
      ttl,
      writes = [],
      adds = [],
      removes = [],
      deletes = [],
    }) {
      if (value(key) !== expected) return false;
      const put = (k, v, t) =>
        map.set(k, { value: v, until: t ? Date.now() + t * 1000 : Infinity });
      put(key, next, ttl);
      for (const w of writes) put(w.key, w.value, w.ttl);
      for (const a of adds) {
        const set = new Set(value(a.key) || []);
        set.add(a.member);
        put(a.key, set, a.ttl);
      }
      for (const r of removes) {
        const set = new Set(value(r.key) || []);
        set.delete(r.member);
        if (set.size) put(r.key, set, r.ttl);
        else map.delete(r.key);
      }
      for (const k of deletes) map.delete(k);
      return true;
    },
    async limit(k, max) {
      const n = Number(value(k) || 0) + 1;
      const until = map.get(k)?.until || Date.now() + 60000;
      map.set(k, { value: String(n), until });
      return n <= max;
    },
  };
}
export function redisStore() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token =
      process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token)
    fail(
      503,
      "חיבור בין מכשירים דורש הגדרת Redis ב־Vercel. הוסיפו KV_REST_API_URL ו־KV_REST_API_TOKEN ובצעו פריסה מחדש.",
    );
  async function cmd(args) {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) fail(503, "שירות הסנכרון אינו זמין כרגע");
    const body = await r.json();
    if (body.error) fail(503, "שגיאה בשירות הסנכרון");
    return body.result;
  }
  return {
    get: (k) => cmd(["GET", k]),
    create: async (k, v, ttl) =>
      (await cmd(
        ttl ? ["SET", k, v, "EX", ttl, "NX"] : ["SET", k, v, "NX"],
      )) === "OK",
    cas: async (k, old, next, ttl) =>
      !!(await cmd([
        "EVAL",
        "if redis.call('GET',KEYS[1]) ~= ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2],'EX',ARGV[3]); return 1",
        1,
        k,
        old,
        next,
        ttl,
      ])),
    many: (keys) =>
      keys.length ? cmd(["MGET", ...keys]) : Promise.resolve([]),
    list: (k) => cmd(["SMEMBERS", k]),
    async atomic(job) {
      const keys = [
        ...new Set([
          job.key,
          ...(job.writes || []).map((w) => w.key),
          ...(job.adds || []).map((w) => w.key),
          ...(job.removes || []).map((w) => w.key),
          ...(job.deletes || []),
        ]),
      ];
      const at = (k) => keys.indexOf(k) + 1;
      const payload = {
        ...job,
        writes: (job.writes || []).map((w) => ({ ...w, key: at(w.key) })),
        adds: (job.adds || []).map((w) => ({ ...w, key: at(w.key) })),
        removes: (job.removes || []).map((w) => ({ ...w, key: at(w.key) })),
        deletes: (job.deletes || []).map(at),
      };
      const lua =
        "local p=cjson.decode(ARGV[1]); if redis.call('GET',KEYS[1])~=p.expected then return 0 end; local function put(k,v,t) if t and t>0 then redis.call('SET',KEYS[k],v,'EX',t) else redis.call('SET',KEYS[k],v) end end; put(1,p.next,p.ttl); for _,w in ipairs(p.writes) do put(w.key,w.value,w.ttl) end; for _,a in ipairs(p.adds) do redis.call('SADD',KEYS[a.key],a.member); redis.call('EXPIRE',KEYS[a.key],a.ttl) end; for _,a in ipairs(p.removes) do redis.call('SREM',KEYS[a.key],a.member) end; for _,k in ipairs(p.deletes) do redis.call('DEL',KEYS[k]) end; return 1";
      return !!(await cmd([
        "EVAL",
        lua,
        keys.length,
        ...keys,
        JSON.stringify(payload),
      ]));
    },
    del: (k) => cmd(["DEL", k]),
    limit: async (k, max) =>
      (await cmd([
        "EVAL",
        "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
        1,
        k,
      ])) <= max,
  };
}
function validState(s) {
  return (
    s &&
    Array.isArray(s.students) &&
    s.students.length <= 1000 &&
    s.students.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.emoji === "string" &&
        typeof p.present === "boolean" &&
        Number.isInteger(p.hearts) &&
        p.hearts >= 0 &&
        Number.isInteger(p.warning) &&
        p.warning >= 0 &&
        p.warning <= 2,
    ) &&
    Array.isArray(s.stages) &&
    s.stages.length > 0 &&
    s.stages.every(
      (p) =>
        typeof p.name === "string" &&
        Number.isFinite(p.minutes) &&
        p.minutes > 0,
    ) &&
    Array.isArray(s.groups) &&
    Number.isInteger(s.stage) &&
    s.stage >= 0 &&
    s.stage < s.stages.length &&
    s.projection &&
    s.timer &&
    Number.isFinite(s.timer.remaining) &&
    (s.timer.end === null || Number.isFinite(s.timer.end)) &&
    JSON.stringify(s).length < 1500000
  );
}
function authenticate(doc, token) {
  const candidate = hash(token || "");
  return [doc.host, doc.device]
    .filter(Boolean)
    .some((t) => timingSafeEqual(Buffer.from(t), Buffer.from(candidate)));
}
function snapshot(doc) {
  return {
    state: doc.state,
    version: doc.version,
    classroom: doc.classroom,
    expires: doc.expires,
    joined: !!doc.device,
  };
}
export function createPairHandler(storeProvider) {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (req.method !== "POST") fail(405, "יש להשתמש ב־POST");
      if (
        req.headers.origin &&
        req.headers.host &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        fail(403, "מקור בקשה אינו מורשה");
      const b = req.body || {},
        store = storeProvider();
      const action = b.action;
      const ip = hash(
        String(
          req.headers["x-forwarded-for"] ||
            req.socket?.remoteAddress ||
            "local",
        ).split(",")[0],
      );
      if (
        !(await store.limit(
          `beyachad:limit:${action}:${ip}:${/^[a-f0-9]{64}$/.test(b.id || "") ? b.id : "global"}`,
          ["create", "join"].includes(action) ? 10 : 300,
        ))
      )
        fail(429, "יותר מדי ניסיונות. נסו שוב בעוד דקה.");
      if (action === "create") {
        if (b.password !== "1111") fail(401, "סיסמה שגויה");
        if (!validState(b.state) || !b.classroom?.id || !b.classroom?.name)
          fail(400, "נתוני כיתה לא תקינים");
        let owner = null;
        if (b.authToken) {
          owner = await teacherSession(store, b.authToken);
          if (owner.classId !== b.classroom.id)
            fail(403, "אין הרשאה לשיעור הזה.");
          await changeControl(store, owner, "renew");
          b.classroom = owner.classroom;
        } else if (b.classroom.id !== "g2")
          fail(401, "יש להתחבר כמורה לפני חיבור מכשירים.");
        else b.classroom = { id: "g2", name: "כיתת דמה", demo: true };
        const id = owner?.leaseId
            ? digest(`lesson:${owner.leaseId}`)
            : secret(),
          token = owner?.leaseId ? digest(`host:${b.authToken}`) : secret(),
          code = String(randomInt(10000000, 100000000));
        const key = `beyachad:session:${id}`,
          codeKey = `beyachad:code:${code}`;
        const existing = await store.get(key);
        if (existing) {
          const current = JSON.parse(existing);
          return res.status(200).json({
            id,
            token,
            code: current.code,
            codeExpires: current.codeExpires,
            ...snapshot(current),
          });
        }
        if (!(await store.create(codeKey, id, 600)))
          fail(409, "נסו ליצור קוד חדש");
        const doc = {
          host: hash(token),
          device: null,
          state: b.state,
          classroom: b.classroom,
          leaseId: owner?.leaseId,
          version: 0,
          expires: Date.now() + TTL * 1000,
          code,
          codeExpires: Date.now() + 600000,
          ops: [],
        };
        if (!(await store.create(key, JSON.stringify(doc), TTL))) {
          await store.del(codeKey);
          const current = JSON.parse(await store.get(key));
          return res.status(200).json({
            id,
            token,
            code: current.code,
            codeExpires: current.codeExpires,
            ...snapshot(current),
          });
        }
        return res.status(200).json({
          id,
          token,
          code,
          codeExpires: Date.now() + 600000,
          ...snapshot(doc),
        });
      }
      if (action === "join") {
        if (!/^\d{8}$/.test(b.code || "")) fail(400, "יש להזין קוד בן 8 ספרות");
        const id = await store.get(`beyachad:code:${b.code}`);
        if (!id) fail(404, "הקוד פג תוקף או שאינו קיים");
        const key = `beyachad:session:${id}`,
          raw = await store.get(key);
        if (!raw) fail(410, "החיבור הסתיים");
        const doc = JSON.parse(raw);
        if (!doc.leaseId && doc.classroom.id !== "g2")
          fail(401, "יש להתחבר מחדש להפעלת הגנת הכיתות.");
        await changeControl(
          store,
          {
            leaseId: doc.leaseId,
            classIds: doc.classroom.classIds || [doc.classroom.id],
          },
          "renew",
        );
        if (doc.device || doc.expires < Date.now())
          fail(410, "הקוד כבר נוצל או פג תוקף");
        const token = secret();
        doc.device = hash(token);
        if (
          !(await store.cas(
            key,
            raw,
            JSON.stringify(doc),
            Math.max(1, Math.ceil((doc.expires - Date.now()) / 1000)),
          ))
        )
          fail(409, "הקוד כבר נוצל");
        await store.del(`beyachad:code:${b.code}`);
        return res.status(200).json({ id, token, ...snapshot(doc) });
      }
      if (!/^[a-f0-9]{64}$/.test(b.id || "")) fail(401, "חיבור לא תקין");
      const key = `beyachad:session:${b.id}`,
        raw = await store.get(key);
      if (!raw) fail(410, "החיבור הסתיים. צרו קוד חדש במחשב.");
      const doc = JSON.parse(raw);
      if (!authenticate(doc, b.token)) fail(401, "אין הרשאה לחיבור");
      if (!doc.leaseId && doc.classroom.id !== "g2")
        fail(401, "יש להתחבר מחדש להפעלת הגנת הכיתות.");
      if (doc.expires < Date.now()) fail(410, "תוקף החיבור פג");
      await changeControl(
        store,
        {
          leaseId: doc.leaseId,
          classIds: doc.classroom.classIds || [doc.classroom.id],
        },
        "renew",
      );
      if (action === "read") return res.status(200).json(snapshot(doc));
      if (action === "close") {
        if (hash(b.token) !== doc.host) fail(403, "רק המחשב המארח יכול לנתק");
        await store.del(key);
        await store.del(`beyachad:code:${doc.code}`);
        return res.status(200).json({ closed: true });
      }
      if (action !== "write") fail(400, "פעולה לא מוכרת");
      if (!validState(b.state) || !/^[-\w]{16,80}$/.test(b.op || ""))
        fail(400, "נתונים לא תקינים");
      if (doc.ops.includes(b.op)) return res.status(200).json(snapshot(doc));
      if (b.version !== doc.version)
        return res
          .status(409)
          .json({ error: "המצב עודכן במכשיר אחר", ...snapshot(doc) });
      doc.state = b.state;
      doc.version++;
      doc.ops = [...doc.ops.slice(-31), b.op];
      if (
        !(await store.cas(
          key,
          raw,
          JSON.stringify(doc),
          Math.max(1, Math.ceil((doc.expires - Date.now()) / 1000)),
        ))
      )
        return res.status(409).json({ error: "עדכון מקביל, נסו שוב" });
      return res.status(200).json(snapshot(doc));
    } catch (e) {
      res.status(e.status || 503).json({
        error: e.status ? e.message : "שירות החיבור אינו זמין כרגע. נסו שוב.",
      });
    }
  };
}
