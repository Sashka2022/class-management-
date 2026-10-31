import { schoolYear, dayInIsrael } from "../shared/schoolPolicy.js";
export const LEGACY_KEY = "beyachad-demo-v1";
const REGISTRY = "beyachad-classrooms-v1";
export const SESSION_KEY = "beyachad-session-v1";
export const DEMO_CLASS_ID = "g2";
export const DEFAULT_CLASSES = [
  { id: "a1", name: "א1" },
  { id: "b1", name: "ב1" },
  { id: "g1", name: "ג1" },
  { id: "d1", name: "ד1" },
  { id: "h1", name: "ה1" },
  { id: "v1", name: "ו1" },
  { id: DEMO_CLASS_ID, name: "כיתת דמה", demo: true },
];
function normalizedName(name) {
  return String(name)
    .replace(/^כיתה\s+/, "")
    .replace(/[\s׳״'"]/g, "");
}
export function classLabel(c) {
  return c.demo || c.name === "כיתת דמה" ? c.name : `כיתה ${c.name}`;
}
export function classrooms() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(REGISTRY)) || [];
  } catch {}
  if (!Array.isArray(saved)) saved = [];
  const result = DEFAULT_CLASSES.map((seed) => {
    const previous =
      saved.find((c) => c.id === seed.id) ||
      saved.find((c) => normalizedName(c.name) === normalizedName(seed.name));
    return { ...previous, ...seed, id: previous?.id || seed.id };
  });
  for (const c of saved) {
    if (
      result.some(
        (r) =>
          r.id === c.id || normalizedName(r.name) === normalizedName(c.name),
      )
    )
      continue;
    if (
      c.id === "g3" &&
      c.name === "ג׳3" &&
      !localStorage.getItem(classKey(c.id))
    )
      continue;
    result.push(c);
  }
  // Preserve a visited legacy class even if its old default registry was never saved.
  if (
    !result.some((c) => c.id === "g3") &&
    localStorage.getItem(classKey("g3"))
  )
    result.push({ id: "g3", name: "ג׳3" });
  return result;
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
  if (list.some((c) => normalizedName(c.name) === normalizedName(cleaned)))
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
    startedAt: s.started,
    day: dayInIsrael(endedAt),
    expiresAt: schoolYear(endedAt).expiresAt,
    students: s.students.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      present: p.present,
      late: !!p.late,
      hearts: p.hearts,
      warnings: p.warningCount ?? p.warning ?? 0,
    })),
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
