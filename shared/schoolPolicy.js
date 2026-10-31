export function dayInIsrael(time = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(time));
}
export function schoolYear(time = Date.now()) {
  const date = dayInIsrael(time),
    year = Number(date.slice(0, 4)) + (Number(date.slice(5, 7)) > 6 ? 1 : 0);
  return {
    id: `${year - 1}-${year}`,
    endDate: `${year}-06-30`,
    expiresAt: Date.parse(`${year}-06-30T23:59:59+03:00`),
  };
}
export function dailyStudents(records) {
  const rows = new Map();
  for (const r of records)
    for (const p of r.students) {
      const key = `${r.classId}:${p.id}`,
        old = rows.get(key) || {
          id: p.id,
          classId: r.classId,
          className: r.className,
          name: p.name,
          emoji: p.emoji,
          lessons: 0,
          present: 0,
          late: 0,
          hearts: 0,
          warnings: 0,
        };
      old.lessons++;
      old.present += Number(p.present);
      old.late += Number(p.late);
      old.hearts += p.hearts;
      old.warnings += p.warnings;
      rows.set(key, old);
    }
  return [...rows.values()];
}
