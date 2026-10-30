export const LEGACY_KEY = "beyachad-demo-v1";
const REGISTRY = "beyachad-classrooms-v1";
export const SESSION_KEY = "beyachad-session-v1";
export const DEFAULT_CLASSES = [
  { id: "g2", name: "ג׳2" },
  { id: "g1", name: "ג׳1" },
  { id: "g3", name: "ג׳3" },
];
export function classrooms() {
  try {
    const list = JSON.parse(localStorage.getItem(REGISTRY));
    if (Array.isArray(list) && list.length) return list;
  } catch {}
  return DEFAULT_CLASSES;
}
export function classKey(id) {
  return id === "g2" ? LEGACY_KEY : `${LEGACY_KEY}-class-${id}`;
}
export function projectionKey(id) {
  return `${classKey(id)}-projection`;
}
export function storedClass(id) {
  try {
    return JSON.parse(localStorage.getItem(classKey(id)));
  } catch {
    return null;
  }
}
export function addClass(name) {
  const cleaned = name.trim().replace(/^כיתה\s+/, "");
  if (!cleaned) throw new Error("יש להזין שם כיתה.");
  const list = classrooms();
  if (
    list.some((c) => c.name.replace(/\s/g, "") === cleaned.replace(/\s/g, ""))
  )
    throw new Error("כיתה בשם הזה כבר קיימת.");
  const entry = { id: crypto.randomUUID(), name: cleaned };
  localStorage.setItem(REGISTRY, JSON.stringify([...list, entry]));
  return entry;
}
export function currentHearts(s) {
  return s?.lessonHearts ?? s?.students.reduce((n, p) => n + p.hearts, 0) ?? 0;
}
export function archiveLesson(s, completed) {
  s.lessonId ||= crypto.randomUUID();
  const endedAt = s.endedAt || Date.now();
  const snapshot = {
    id: s.lessonId,
    completed,
    endedAt,
    minutes: Math.max(0, Math.round((endedAt - s.started) / 60000)),
    hearts: currentHearts(s),
    present: s.students.filter((p) => p.present).length,
    enrolled: s.students.length,
  };
  s.lessons = [
    ...(s.lessons || []).filter((l) => l.id !== s.lessonId),
    snapshot,
  ];
}
export function classMetrics(c) {
  const s = storedClass(c.id);
  const previous = (s?.lessons || []).filter((l) => l.id !== s.lessonId);
  const lessons = s?.lessons || [];
  return {
    ...c,
    students: s?.students.length || 0,
    present: s?.students.filter((p) => p.present).length || 0,
    hearts: previous.reduce((n, l) => n + l.hearts, 0) + currentHearts(s),
    completed: lessons.filter((l) => l.completed).length,
    minutes:
      previous.reduce((n, l) => n + l.minutes, 0) +
      (s
        ? Math.max(
            0,
            Math.round(((s.endedAt || Date.now()) - s.started) / 60000),
          )
        : 0),
    active: !!s && !s.ended,
    visited: !!s,
    lastEnded: lessons
      .filter((l) => l.completed)
      .sort((a, b) => b.endedAt - a.endedAt)[0]?.endedAt,
  };
}
