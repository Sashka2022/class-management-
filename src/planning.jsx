import React, { useState } from "react";
import { Plus, Trash2, Copy, Save } from "lucide-react";
export const lessonTemplates = [
  {
    id: "curiosity",
    name: "שיעור של סקרנות",
    emoji: "🌱",
    description: "כניסה, גילוי משותף, קבוצות, שיתוף ומחשבה לדרך.",
    steps: [
      ["נכנסים לאווירה", 5],
      ["מגלים יחד", 12],
      ["צומחים בקבוצות", 15],
      ["משתפים בתגליות", 8],
      ["מחשבה לדרך", 5],
    ],
  },
  {
    id: "reading",
    name: "קוראים ומגלים",
    emoji: "📖",
    description: "הטרמה, קריאה, שיחה וכתיבה עצמאית.",
    steps: [
      ["לפני הקריאה", 5],
      ["קוראים יחד", 15],
      ["משוחחים על הטקסט", 10],
      ["כותבים בעצמנו", 10],
      ["משתפים וסוגרים", 5],
    ],
  },
  {
    id: "practice",
    name: "תרגול בקצב שלנו",
    emoji: "✏️",
    description: "הסבר קצר, תרגול מודרך ועבודה עצמאית.",
    steps: [
      ["חימום קצר", 5],
      ["מדגימים יחד", 10],
      ["מתרגלים בזוגות", 10],
      ["עבודה עצמאית", 15],
      ["בודקים ומסכמים", 5],
    ],
  },
  {
    id: "stations",
    name: "לומדים בתחנות",
    emoji: "🧩",
    description: "פתיחה, שלוש תחנות וסיכום משותף.",
    steps: [
      ["היכרות עם התחנות", 5],
      ["תחנה ראשונה", 10],
      ["תחנה שנייה", 10],
      ["תחנה שלישית", 10],
      ["שיתוף וסיכום", 10],
    ],
  },
];
export function stagesFor(template) {
  return template.stages
    ? structuredClone(template.stages).map((s) => ({
        ...s,
        id: crypto.randomUUID(),
      }))
    : template.steps.map(([name, minutes]) => ({
        id: crypto.randomUUID(),
        name,
        minutes,
        instruction: name,
        equipment: "",
      }));
}
export function DayPlan({ state, update, onShow }) {
  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()),
  );
  const rows = state.dayPlans?.[date] || [];
  function change(fn) {
    update((s) => {
      s.dayPlans ||= {};
      s.dayPlans[date] ||= [];
      fn(s.dayPlans[date]);
    }, "סדר היום נשמר");
  }
  return (
    <section className="panel day-plan">
      <div className="panel-heading">
        <div>
          <h2>סדר היום של הכיתה</h2>
          <p className="muted">מכינים את היום, שיעור אחרי שיעור.</p>
        </div>
        <label className="field">
          תאריך
          <input
            aria-label="תאריך סדר יום"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <button
        className="secondary bulk-entry"
        disabled={!rows.length}
        onClick={() => onShow({ date, rows: structuredClone(rows) })}
      >
        הצגת סדר היום לכיתה
      </button>
      <div className="day-plan-rows">
        {rows.length ? (
          rows.map((r, i) => (
            <div className="day-plan-row" key={r.id}>
              <input
                aria-label={`שעה ${i + 1}`}
                type="time"
                value={r.time}
                onChange={(e) =>
                  change((list) => (list[i].time = e.target.value))
                }
              />
              <input
                aria-label={`פעילות ${i + 1}`}
                placeholder="שם השיעור או הפעילות"
                value={r.title}
                onChange={(e) =>
                  change((list) => (list[i].title = e.target.value))
                }
              />
              <input
                aria-label={`הערה ${i + 1}`}
                placeholder="ציוד או הערה קצרה"
                value={r.note}
                onChange={(e) =>
                  change((list) => (list[i].note = e.target.value))
                }
              />
              <button
                className="icon-btn"
                aria-label={`מחיקת פעילות ${i + 1}`}
                onClick={() => change((list) => list.splice(i, 1))}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty">
            <h3>מה מתוכנן לנו היום?</h3>
            <p>
              הוסיפו שיעורים, הפסקות ופעילויות. לכל תאריך נשמר סדר יום נפרד.
            </p>
          </div>
        )}
      </div>
      <button
        className="primary"
        onClick={() =>
          change((list) =>
            list.push({
              id: crypto.randomUUID(),
              time: "08:00",
              title: "",
              note: "",
            }),
          )
        }
      >
        <Plus size={16} /> הוספת פעילות לסדר היום
      </button>
    </section>
  );
}
export function Templates({ state, onUse, update }) {
  const [name, setName] = useState("");
  return (
    <>
      <div className="template-save panel">
        <h2>התבנית שלך</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update((s) => {
              s.customTemplates = [
                ...(s.customTemplates || []),
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  emoji: "⭐",
                  description: "תבנית אישית שנשמרה ממהלך השיעור",
                  stages: structuredClone(s.stages),
                },
              ];
            }, "התבנית נשמרה");
            setName("");
          }}
        >
          <label className="field">
            שם לתבנית אישית
            <input
              required
              maxLength="60"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={!name.trim()}>
            <Save size={16} /> שמירת השיעור כתבנית
          </button>
        </form>
      </div>
      <section className="templates">
        {[...lessonTemplates, ...(state.customTemplates || [])].map((t, i) => (
          <div className="template-card" key={t.id}>
            <span className="template-art">{t.emoji}</span>
            <span className="eyebrow">
              {t.stages
                ? t.stages.reduce((n, s) => n + s.minutes, 0)
                : t.steps.reduce((n, s) => n + s[1], 0)}{" "}
              דקות
            </span>
            <h2>{t.name}</h2>
            <p>{t.description}</p>
            <button className="primary" onClick={() => onUse(t)}>
              <Copy size={17} />
              {i === 0 ? "שימוש בתבנית" : `שימוש ב${t.name}`}
            </button>
            {t.stages && (
              <button
                className="text-button danger"
                onClick={() =>
                  update((s) => {
                    s.customTemplates = s.customTemplates.filter(
                      (x) => x.id !== t.id,
                    );
                  }, "התבנית נמחקה")
                }
              >
                <Trash2 size={14} /> מחיקה
              </button>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
