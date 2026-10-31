import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { DEFAULT_CLASSES } from "../src/classrooms.js";
import { dayInIsrael, schoolYear } from "../shared/schoolPolicy.js";
const prefix = "{beyachad-school}:",
  registry = prefix + "classes",
  hash = (s) => createHash("sha256").update(String(s)).digest("hex");
const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
const cleanName = (name) =>
  String(name || "")
    .trim()
    .replace(/^כיתה\s+/, "");
const normalized = (name) => cleanName(name).replace(/[\s׳״'"]/g, "");
const idValid = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
const ttlFor = (time) => Math.max(1, Math.ceil((time - Date.now()) / 1000));
async function catalog(store) {
  await store.create(registry, JSON.stringify(DEFAULT_CLASSES), 0);
  return JSON.parse(await store.get(registry));
}
const metaKey = (id, year) => `${prefix}totals:${id}:${year}`;
const recordKey = (id, lesson) => `${prefix}report:${id}:${lesson}`;
const dayKey = (id, day) => `${prefix}day:${id}:${day}`;
const emptyTotals = () => ({
  records: 0,
  completed: 0,
  hearts: 0,
  warnings: 0,
  latestEndedAt: 0,
  latestPresent: 0,
  latestEnrolled: 0,
});
async function auth(req, store) {
  const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) fail(401, "יש להתחבר מחדש כדי לגשת לנתונים בענן.");
  const pairId = req.headers["x-pair-id"];
  if (pairId) {
    if (!/^[a-f0-9]{64}$/.test(pairId)) fail(401, "חיבור לא תקין");
    const raw = await store.get(`beyachad:session:${pairId}`);
    if (!raw) fail(401, "חיבור הנייד הסתיים");
    const p = JSON.parse(raw),
      candidate = Buffer.from(hash(token));
    if (
      p.expires < Date.now() ||
      ![p.host, p.device]
        .filter(Boolean)
        .some((h) => timingSafeEqual(Buffer.from(h), candidate))
    )
      fail(401, "אין הרשאה לחיבור");
    return { role: "teacher", classId: p.classroom.id };
  }
  const raw = await store.get(prefix + "auth:" + hash(token));
  if (!raw) fail(401, "תוקף הכניסה הסתיים. יש להתחבר מחדש.");
  return JSON.parse(raw);
}
function scope(user, classId) {
  if (user.role !== "admin" && user.classId !== classId)
    fail(403, "אין הרשאה לכיתה הזאת");
}
function studentRecord(p) {
  if (
    !idValid(p.id) ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 200 ||
    typeof p.present !== "boolean" ||
    !Number.isInteger(p.hearts) ||
    p.hearts < 0 ||
    p.hearts > 100000
  )
    fail(400, "נתוני תלמיד לא תקינים");
  const warnings = p.warnings ?? p.warningCount ?? p.warning ?? 0;
  if (!Number.isInteger(warnings) || warnings < 0 || warnings > 10000)
    fail(400, "מספר אזהרות לא תקין");
  return {
    id: p.id,
    name: p.name,
    emoji: String(p.emoji || "").slice(0, 20),
    present: p.present,
    late: !!p.late,
    hearts: p.hearts,
    warnings,
  };
}
function reportFrom(input, classroom) {
  if (
    !idValid(input.id) ||
    !Number.isFinite(input.endedAt) ||
    !Number.isFinite(input.startedAt) ||
    input.endedAt < input.startedAt ||
    input.endedAt > Date.now() + 300000 ||
    !Array.isArray(input.students) ||
    input.students.length > 200 ||
    new Set(input.students.map((p) => p.id)).size !== input.students.length
  )
    fail(400, "סיכום שיעור לא תקין");
  const policy = schoolYear(input.endedAt);
  if (policy.expiresAt <= Date.now())
    fail(410, "תקופת השמירה של הסיכום הסתיימה.");
  return {
    id: input.id,
    classId: classroom.id,
    className: classroom.name,
    completed: !!input.completed,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    day: dayInIsrael(input.endedAt),
    minutes: Math.max(0, Math.round((input.endedAt - input.startedAt) / 60000)),
    schoolYear: policy.id,
    expiresAt: policy.expiresAt,
    students: input.students.map(studentRecord),
  };
}
function counts(r) {
  return {
    records: r ? 1 : 0,
    completed: Number(r?.completed || false),
    hearts: r?.students.reduce((n, p) => n + p.hearts, 0) || 0,
    warnings: r?.students.reduce((n, p) => n + p.warnings, 0) || 0,
  };
}
async function changeReport(store, record, remove = false) {
  const mk = metaKey(record.classId, record.schoolYear),
    rk = recordKey(record.classId, record.id),
    ttl = ttlFor(record.expiresAt);
  for (let attempt = 0; attempt < 6; attempt++) {
    await store.create(mk, JSON.stringify(emptyTotals()), ttl);
    const raw = await store.get(mk),
      oldRaw = await store.get(rk),
      old = oldRaw ? JSON.parse(oldRaw) : null;
    if (remove && !old) return;
    const totals = JSON.parse(raw),
      before = counts(old),
      after = counts(remove ? null : record);
    for (const key of ["records", "completed", "hearts", "warnings"])
      totals[key] = Math.max(0, (totals[key] || 0) + after[key] - before[key]);
    totals.attendance ||= {};
    if (remove) delete totals.attendance[record.id];
    else
      totals.attendance[record.id] = {
        endedAt: record.endedAt,
        present: record.students.filter((p) => p.present).length,
        enrolled: record.students.length,
      };
    const latest = Object.values(totals.attendance).sort(
      (a, b) => b.endedAt - a.endedAt,
    )[0];
    totals.latestEndedAt = latest?.endedAt || 0;
    totals.latestPresent = latest?.present || 0;
    totals.latestEnrolled = latest?.enrolled || 0;
    const job = {
      key: mk,
      expected: raw,
      next: JSON.stringify(totals),
      ttl,
      writes: remove ? [] : [{ key: rk, value: JSON.stringify(record), ttl }],
      adds: remove
        ? []
        : [{ key: dayKey(record.classId, record.day), member: record.id, ttl }],
      removes:
        old && (remove || old.day !== record.day)
          ? [{ key: dayKey(record.classId, old.day), member: record.id, ttl }]
          : [],
      deletes: remove ? [rk] : [],
    };
    if (await store.atomic(job)) return;
  }
  fail(409, "עדכון מקביל. נסו שוב.");
}
export function createSchoolHandler(provider) {
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
        fail(403, "מקור הבקשה אינו מורשה");
      const b = req.body || {},
        store = provider(),
        ip = hash(
          String(
            req.headers["x-forwarded-for"] ||
              req.socket?.remoteAddress ||
              "local",
          ).split(",")[0],
        );
      if (
        !(await store.limit(
          prefix + "limit:" + b.action + ":" + ip,
          b.action === "login" ? 12 : 300,
        ))
      )
        fail(429, "יותר מדי ניסיונות. נסו שוב בעוד דקה.");
      const classes = await catalog(store);
      if (b.action === "classes") return res.status(200).json({ classes });
      if (b.action === "login") {
        if (!["teacher", "admin"].includes(b.role) || b.password !== "1111")
          fail(401, "הסיסמה אינה נכונה. נסו שוב.");
        if (b.role === "teacher" && !classes.some((c) => c.id === b.classId))
          fail(404, "הכיתה לא נמצאה");
        const token = randomBytes(32).toString("hex");
        const session = {
          role: b.role,
          classId: b.role === "teacher" ? b.classId : null,
        };
        await store.create(
          prefix + "auth:" + hash(token),
          JSON.stringify(session),
          8 * 3600,
        );
        return res.status(200).json({
          ...session,
          authToken: token,
          classes,
          policy: schoolYear(),
        });
      }
      const user = await auth(req, store);
      if (b.action === "addClass") {
        if (user.role !== "admin") fail(403, "הוספת כיתות זמינה לאדמין");
        const name = cleanName(b.name);
        if (!name || name.length > 40)
          fail(400, "יש להזין שם כיתה עד 40 תווים");
        for (let i = 0; i < 5; i++) {
          const raw = await store.get(registry),
            list = JSON.parse(raw);
          if (list.some((c) => normalized(c.name) === normalized(name)))
            fail(409, "כיתה בשם הזה כבר קיימת.");
          const classroom = { id: randomBytes(12).toString("hex"), name };
          const next = [...list, classroom];
          if (
            await store.atomic({
              key: registry,
              expected: raw,
              next: JSON.stringify(next),
              ttl: 0,
            })
          )
            return res.status(200).json({ classroom, classes: next });
        }
        fail(409, "נסו שוב");
      }
      if (b.action === "overview") {
        if (user.role !== "admin") fail(403, "הפעולה זמינה לאדמין");
        const policy = schoolYear(),
          raw = await store.many(classes.map((c) => metaKey(c.id, policy.id))),
          rosters = await store.many(
            classes.map((c) => prefix + "roster:" + c.id),
          );
        return res.status(200).json({
          classes,
          policy,
          rosters: Object.fromEntries(
            classes.map((c, i) => [
              c.id,
              rosters[i] ? JSON.parse(rosters[i]) : null,
            ]),
          ),
          totals: Object.fromEntries(
            classes.map((c, i) => [
              c.id,
              raw[i] ? JSON.parse(raw[i]) : emptyTotals(),
            ]),
          ),
        });
      }
      if (
        !idValid(b.classId) &&
        !(b.action === "reports" && user.role === "admin" && !b.classId)
      )
        fail(400, "כיתה לא תקינה");
      if (b.classId) scope(user, b.classId);
      const classroom = classes.find((c) => c.id === b.classId);
      if (b.classId && !classroom) fail(404, "הכיתה לא נמצאה");
      if (b.action === "saveReport") {
        const report = reportFrom(b.report, classroom);
        await changeReport(store, report);
        return res
          .status(200)
          .json({ saved: true, id: report.id, expiresAt: report.expiresAt });
      }
      if (b.action === "reports") {
        const day = b.day || dayInIsrael();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail(400, "תאריך לא תקין");
        const selected = b.classId
          ? [classroom]
          : classes.filter((c) => !c.demo);
        if (user.role !== "admin" && !b.classId) fail(403, "יש לבחור כיתה");
        const ids = await Promise.all(
          selected.map((c) => store.list(dayKey(c.id, day))),
        );
        const keys = selected.flatMap((c, i) =>
          ids[i].map((id) => recordKey(c.id, id)),
        );
        const raw = await store.many(keys);
        const records = raw
          .filter(Boolean)
          .map(JSON.parse)
          .filter((r) => r.expiresAt > Date.now())
          .sort((a, b) => a.endedAt - b.endedAt);
        return res.status(200).json({ records, policy: schoolYear(), day });
      }
      if (b.action === "deleteReport") {
        if (!idValid(b.id)) fail(400, "סיכום לא תקין");
        const raw = await store.get(recordKey(b.classId, b.id));
        if (raw) await changeReport(store, JSON.parse(raw), true);
        return res.status(200).json({ deleted: true });
      }
      if (b.action === "roster") {
        const raw = await store.get(prefix + "roster:" + b.classId);
        return res.status(200).json({ roster: raw ? JSON.parse(raw) : null });
      }
      if (b.action === "saveRoster") {
        if (
          !Array.isArray(b.students) ||
          b.students.length > 200 ||
          new Set(b.students.map((p) => p.id)).size !== b.students.length
        )
          fail(400, "רשימת תלמידים לא תקינה");
        const students = b.students.map((p) => {
          if (
            !idValid(p.id) ||
            typeof p.name !== "string" ||
            !p.name.trim() ||
            p.name.length > 200
          )
            fail(400, "שם תלמיד לא תקין");
          return {
            id: p.id,
            name: p.name,
            emoji: String(p.emoji || "").slice(0, 20),
          };
        });
        const rk = prefix + "roster:" + b.classId;
        const raw = await store.get(rk),
          version = raw ? JSON.parse(raw).version : 0;
        if (b.version !== version)
          fail(409, "רשימת הכיתה עודכנה במכשיר אחר. רעננו לפני שינוי נוסף.");
        if (!raw) {
          if (
            !(await store.create(
              rk,
              JSON.stringify({ students, version: 1 }),
              0,
            ))
          )
            fail(409, "הרשימה עודכנה. רעננו.");
        } else if (
          !(await store.atomic({
            key: rk,
            expected: raw,
            next: JSON.stringify({ students, version: version + 1 }),
            ttl: 0,
          }))
        )
          fail(409, "הרשימה עודכנה. רעננו.");
        return res.status(200).json({ version: version + 1 });
      }
      fail(400, "פעולה לא מוכרת");
    } catch (e) {
      res.status(e.status || 503).json({
        error: e.status
          ? e.message
          : "לא ניתן לשמור בענן כרגע. הנתונים המקומיים לא נמחקו.",
      });
    }
  };
}
