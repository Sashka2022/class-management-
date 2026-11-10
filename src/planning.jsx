import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  CopyPlus,
  Save,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
export function stagesFor(template) {
  return structuredClone(template.stages).map((stage) => ({
    ...stage,
    id: crypto.randomUUID(),
  }));
}
function blankStage() {
  return {
    id: crypto.randomUUID(),
    name: "",
    minutes: "",
    instruction: "",
    equipment: "",
  };
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
  const [name, setName] = useState(""),
    [stages, setStages] = useState(() => [blankStage()]),
    [editing, setEditing] = useState(null),
    [error, setError] = useState("");
  function reset() {
    setName("");
    setStages([blankStage()]);
    setEditing(null);
    setError("");
  }
  function field(index, key, value) {
    setStages((list) =>
      list.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  }
  function move(from, to) {
    setStages((list) => {
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }
  function save(e) {
    e.preventDefault();
    if (
      !name.trim() ||
      stages.some((s) => !s.name.trim() || !(Number(s.minutes) > 0))
    ) {
      setError("יש למלא שם לתבנית ושם ומשך לכל שלב.");
      return;
    }
    const template = {
      id: editing || crypto.randomUUID(),
      name: name.trim(),
      emoji: "⭐",
      description: "תבנית קבועה של המורה",
      stages: stages.map((s) => ({
        ...s,
        name: s.name.trim(),
        minutes: Number(s.minutes),
      })),
    };
    update((s) => {
      s.customTemplates = editing
        ? (s.customTemplates || []).map((t) =>
            t.id === editing ? template : t,
          )
        : [...(s.customTemplates || []), template];
    }, "התבנית נשמרה לשימוש חוזר");
    reset();
  }
  return (
    <>
      <section className="template-save panel">
        <h2>{editing ? "עריכת תבנית קבועה" : "יצירת תבנית ריקה"}</h2>
        <p className="muted">
          בלי תוכן מוכן מראש. מגדירים את השלבים שלכם ושומרים לשימוש חוזר.
        </p>
        <form className="blank-template-form" onSubmit={save}>
          <label className="field">
            שם לתבנית אישית
            <input
              required
              maxLength="60"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="template-stages">
            {stages.map((s, i) => (
              <fieldset key={s.id}>
                <legend>שלב {i + 1}</legend>
                <label className="field">
                  שם השלב
                  <input
                    aria-label={`שם שלב בתבנית ${i + 1}`}
                    required
                    value={s.name}
                    onChange={(e) => field(i, "name", e.target.value)}
                  />
                </label>
                <label className="field">
                  משך בדקות
                  <input
                    aria-label={`משך שלב בתבנית ${i + 1}`}
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={s.minutes}
                    onChange={(e) => field(i, "minutes", e.target.value)}
                  />
                </label>
                <label className="field">
                  הנחיה (לא חובה)
                  <textarea
                    aria-label={`הנחיה לשלב בתבנית ${i + 1}`}
                    value={s.instruction}
                    onChange={(e) => field(i, "instruction", e.target.value)}
                  />
                </label>
                <label className="field">
                  ציוד (לא חובה)
                  <input
                    aria-label={`ציוד לשלב בתבנית ${i + 1}`}
                    value={s.equipment}
                    onChange={(e) => field(i, "equipment", e.target.value)}
                  />
                </label>
                <div className="stage-tools" role="group">
                  <button
                    type="button"
                    className="secondary"
                    disabled={i === 0}
                    aria-label={`הקדמת שלב ${i + 1} בתבנית`}
                    onClick={() => move(i, i - 1)}
                  >
                    <ArrowUp size={15} /> הקדמה
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={i === stages.length - 1}
                    aria-label={`דחיית שלב ${i + 1} בתבנית`}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowDown size={15} /> דחייה
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`שכפול שלב ${i + 1} בתבנית`}
                    onClick={() =>
                      setStages((list) => [
                        ...list.slice(0, i + 1),
                        { ...s, id: crypto.randomUUID() },
                        ...list.slice(i + 1),
                      ])
                    }
                  >
                    <Copy size={15} /> שכפול
                  </button>
                </div>
                <button
                  type="button"
                  className="text-button danger"
                  disabled={stages.length === 1}
                  onClick={() =>
                    setStages((list) => list.filter((x) => x.id !== s.id))
                  }
                >
                  מחיקת שלב {i + 1}
                </button>
              </fieldset>
            ))}
          </div>
          <div className="template-editor-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setStages((list) => [...list, blankStage()])}
            >
              <Plus size={16} /> הוספת שלב לתבנית
            </button>
            <button className="primary" type="submit">
              <Save size={16} /> שמירת תבנית
            </button>
            <button type="button" className="text-button" onClick={reset}>
              {editing ? "ביטול עריכה" : "ניקוי הטופס"}
            </button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </form>
        <button
          className="text-button"
          onClick={() => {
            setStages(
              structuredClone(state.stages).map((s) => ({
                ...s,
                id: crypto.randomUUID(),
              })),
            );
            setEditing(null);
          }}
        >
          טעינת מהלך השיעור הנוכחי לעריכה
        </button>
      </section>
      {!(state.customTemplates || []).length && (
        <section className="panel empty">
          <h3>אין עדיין תבניות שמורות</h3>
          <p>התבניות שיוצרים כאן יישמרו לכיתה גם לשיעורים הבאים.</p>
        </section>
      )}
      <section className="templates">
        {(state.customTemplates || []).map((t, i) => (
          <article className="template-card" key={t.id}>
            <span className="template-art">{t.emoji || "⭐"}</span>
            <span className="eyebrow">
              {t.stages.reduce((n, s) => n + s.minutes, 0)} דקות ·{" "}
              {t.stages.length} שלבים
            </span>
            <h2>{t.name}</h2>
            <button className="primary" onClick={() => onUse(t)}>
              <Copy size={17} />
              {i === 0 ? "שימוש בתבנית" : `שימוש ב${t.name}`}
            </button>
            <button
              className="secondary"
              onClick={() => {
                setEditing(t.id);
                setName(t.name);
                setStages(structuredClone(t.stages));
                setError("");
              }}
            >
              עריכת תבנית {t.name}
            </button>
            <button
              className="secondary"
              onClick={() =>
                update((s) => {
                  const list = s.customTemplates || [],
                    at = list.findIndex((x) => x.id === t.id);
                  if (at === -1) return;
                  const taken = new Set(list.map((x) => x.name));
                  let copyName = `${t.name} (עותק)`;
                  for (let n = 2; taken.has(copyName); n++)
                    copyName = `${t.name} (עותק ${n})`;
                  list.splice(at + 1, 0, {
                    ...structuredClone(list[at]),
                    id: crypto.randomUUID(),
                    name: copyName,
                    stages: stagesFor(list[at]),
                  });
                  s.customTemplates = list;
                }, "התבנית שוכפלה. אפשר לערוך את העותק")
              }
            >
              <CopyPlus size={15} /> שכפול תבנית {t.name}
            </button>
            <button
              className="text-button danger"
              onClick={() => {
                update((s) => {
                  s.customTemplates = (s.customTemplates || []).filter(
                    (x) => x.id !== t.id,
                  );
                }, "התבנית נמחקה");
                if (editing === t.id) reset();
              }}
            >
              <Trash2 size={14} /> מחיקת תבנית {t.name}
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
