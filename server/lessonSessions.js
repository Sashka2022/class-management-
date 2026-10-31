import { createHash } from "node:crypto";
export const schoolPrefix = "{beyachad-school}:";
export const digest = (value) =>
  createHash("sha256").update(String(value)).digest("hex");
export const combinedStudentId = (classId, studentId) =>
  digest(`${classId}:${studentId}`);
const lockKey = schoolPrefix + "active-lessons";
const GRACE = 120000;
export function reject(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export async function activeLessons(store) {
  const raw = await store.get(lockKey);
  return Object.fromEntries(
    Object.entries(raw ? JSON.parse(raw) : {}).filter(
      ([, value]) => value.expiresAt > Date.now(),
    ),
  );
}
export async function changeControl(store, session, action) {
  if (!session.leaseId) return;
  if (action === "acquire") await store.create(lockKey, "{}", 0);
  for (let attempt = 0; attempt < 8; attempt++) {
    const raw = await store.get(lockKey);
    if (raw === null && action === "release") return;
    const all = raw ? JSON.parse(raw) : {};
    const ids = session.classIds;
    const now = Date.now();
    if (action === "acquire") {
      const occupied = ids.find(
        (id) => all[id]?.expiresAt > now && all[id].leaseId !== session.leaseId,
      );
      if (occupied)
        reject(
          409,
          "אחת הכיתות שבחרתם כבר משתתפת בשיעור פעיל. בחרו כיתות פנויות.",
        );
    } else if (action !== "release") {
      if (
        ids.some(
          (id) =>
            all[id]?.leaseId !== session.leaseId || all[id].expiresAt <= now,
        )
      )
        reject(
          409,
          "השליטה בכיתה הסתיימה או הועברה. יש לחזור לכניסה; השינויים לא נשלחו לשיעור אחר.",
        );
      if (ids.every((id) => all[id].expiresAt > now + 60000)) return;
    }
    for (const [id, lock] of Object.entries(all))
      if (lock.expiresAt <= now) delete all[id];
    for (const id of ids) {
      if (action === "release") {
        if (all[id]?.leaseId === session.leaseId) delete all[id];
      } else
        all[id] = {
          leaseId: session.leaseId,
          classIds: ids,
          expiresAt: now + GRACE,
        };
    }
    if (
      await store.atomic({
        key: lockKey,
        expected: raw,
        next: JSON.stringify(all),
        ttl: 0,
      })
    )
      return;
  }
  reject(409, "בקשה מקבילה לכיתות. נסו שוב.");
}
export async function teacherSession(store, token) {
  const raw =
    token && (await store.get(schoolPrefix + "auth:" + digest(token)));
  const session = raw ? JSON.parse(raw) : null;
  if (!session || session.role !== "teacher")
    reject(401, "יש להתחבר מחדש כמורה.");
  if (session.classId !== "g2" && !session.leaseId)
    reject(401, "יש להתחבר מחדש להפעלת הגנת הכיתות.");
  return session;
}
