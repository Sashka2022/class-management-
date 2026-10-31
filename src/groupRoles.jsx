import React from "react";
import { hatFor, PersonalHatBadge } from "./thinkingHats";
export const groupRoles = [
  {
    id: "leader",
    label: "מוביל/ת קבוצה",
    short: "מוביל/ה",
    icon: "🧭",
    icons: ["🧭", "🤝", "🚩"],
    description:
      "עוזרים לקבוצה להבין את המשימה, מחלקים את העבודה ודואגים שלכולם יהיה מקום להשתתף.",
  },
  {
    id: "recorder",
    label: "מתעד/ת",
    short: "מתעד/ת",
    icon: "✍️",
    icons: ["✍️", "📝", "📒"],
    description: "כותבים או מציירים את הרעיונות, התשובות והתגליות של הקבוצה.",
  },
  {
    id: "timekeeper",
    label: "אחראי/ת זמן",
    short: "זמן",
    icon: "⏱️",
    icons: ["⏱️", "⏰", "⌛"],
    description: "עוקבים אחרי הזמן ומזכירים לקבוצה מתי כדאי להתקדם או לסיים.",
  },
  {
    id: "presenter",
    label: "מציג/ה",
    short: "מציג/ה",
    icon: "🗣️",
    icons: ["🗣️", "🎤", "📣"],
    description: "מציגים לכיתה את התוצרים והרעיונות ומסבירים מה הקבוצה גילתה.",
  },
];
export function assignGroupRoles(groups, assignments = {}) {
  const next = { ...assignments };
  for (const group of groups) {
    const roles = [...groupRoles];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    group.ids.forEach((id, index) => {
      const role = roles[index % roles.length];
      next[id] = { roleId: role.id, icon: role.icon };
    });
  }
  return next;
}
export function roleFor(assignment) {
  const role = groupRoles.find((r) => r.id === assignment?.roleId);
  return role
    ? {
        id: role.id,
        label: role.label,
        short: role.short,
        icon: role.icons.includes(assignment.icon)
          ? assignment.icon
          : role.icon,
      }
    : null;
}
export function snapshotGroups(
  groups,
  students,
  assignments,
  studentHats = {},
) {
  return groups.map((group) => ({
    ...group,
    members: group.ids
      .map((id) => students.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        role: roleFor(assignments?.[p.id]),
        thinkingHat: hatFor(studentHats[p.id] || group.thinkingHat?.hatId),
        personalHat: !!hatFor(studentHats[p.id]),
      })),
  }));
}
export function RoleGuide() {
  return (
    <section className="role-guide" aria-label="הסבר ארבעת התפקידים">
      <h3>ארבעת התפקידים בקבוצה</h3>
      <p>
        אפשר לתת את אותו תפקיד לכמה תלמידים, גם באותה קבוצה. אין חובה למלא את כל
        התפקידים.
      </p>
      <div className="role-guide-grid">
        {groupRoles.map((r) => (
          <article key={r.id}>
            <span aria-hidden="true">{r.icon}</span>
            <h4>{r.label}</h4>
            <p>{r.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function RoleControls({ student, assignment, onChange }) {
  const selected = groupRoles.find((r) => r.id === assignment?.roleId);
  return (
    <div className="role-controls">
      <select
        aria-label={`תפקיד של ${student.name}`}
        title={selected?.label || "ללא תפקיד"}
        value={selected?.id || ""}
        onChange={(e) => {
          const role = groupRoles.find((r) => r.id === e.target.value);
          onChange(role ? { roleId: role.id, icon: role.icon } : null);
        }}
      >
        <option value="">ללא תפקיד</option>
        {groupRoles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.icon} {r.label}
          </option>
        ))}
      </select>
      {selected && (
        <select
          className="role-icon-select"
          aria-label={`אייקון תפקיד של ${student.name}`}
          title={`אייקון: ${selected.label}`}
          value={
            selected.icons.includes(assignment.icon)
              ? assignment.icon
              : selected.icon
          }
          onChange={(e) =>
            onChange({ roleId: selected.id, icon: e.target.value })
          }
        >
          {selected.icons.map((icon) => (
            <option key={icon} value={icon}>
              {icon}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
export function ProjectedMembers({ members }) {
  return (
    <ul className="projected-members">
      {members.map((p, i) => (
        <li key={p.id || i}>
          <span>
            {p.emoji} {p.name}
          </span>
          {p.role ? (
            <span className="projected-role" title={p.role.label}>
              <span aria-hidden="true">{p.role.icon}</span>
              <small>תפקיד: {p.role.label}</small>
            </span>
          ) : (
            <span className="projected-role-empty">
              <small>תפקיד: טרם נבחר</small>
            </span>
          )}
          {p.personalHat && <PersonalHatBadge hat={p.thinkingHat} />}
        </li>
      ))}
    </ul>
  );
}
