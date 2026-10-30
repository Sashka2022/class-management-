import React, { useEffect, useState } from "react";
import { Play, Pause, ArrowLeft } from "lucide-react";
export const thinkingHats = [
  {
    id: "white",
    icon: "⚪",
    name: "לבן",
    label: "לבן — מידע ועובדות",
    focus: "מבררים מה ידוע, מה חסר ואיזה מידע צריך למצוא.",
    prompt: "מה אנחנו יודעים, ומה עוד צריך לבדוק?",
  },
  {
    id: "red",
    icon: "🔴",
    name: "אדום",
    label: "אדום — רגשות ותחושות",
    focus: "מבטאים רגש או תחושת בטן, בלי חובה לנמק.",
    prompt: "איך אני מרגיש לגבי הרעיון הזה?",
  },
  {
    id: "black",
    icon: "⚫",
    name: "שחור",
    label: "שחור — קשיים וסיכונים",
    focus: "מזהים מה עלול להשתבש ומסבירים מדוע.",
    prompt: "איפה עלולה להיות בעיה, ולמה?",
  },
  {
    id: "yellow",
    icon: "🟡",
    name: "צהוב",
    label: "צהוב — יתרונות והזדמנויות",
    focus: "מחפשים מה יכול להועיל ולהצליח ומסבירים כיצד.",
    prompt: "מה טוב ברעיון הזה, ולמי הוא יכול לעזור?",
  },
  {
    id: "green",
    icon: "🟢",
    name: "ירוק",
    label: "ירוק — יצירתיות וחלופות",
    focus: "מציעים רעיונות חדשים, שינויים ודרכים אחרות.",
    prompt: "איך אפשר לעשות את זה אחרת?",
  },
  {
    id: "blue",
    icon: "🔵",
    name: "כחול",
    label: "כחול — ניהול החשיבה",
    focus: "מגדירים את השאלה, בוחרים איך להתקדם ומסכמים.",
    prompt: "במה נתמקד עכשיו, ומה כבר גילינו?",
  },
];
export const hatFor = (id) => thinkingHats.find((h) => h.id === id) || null;
export function hatSeconds(timer, now = Date.now()) {
  return Math.max(
    0,
    timer?.end ? Math.ceil((timer.end - now) / 1000) : timer?.remaining || 0,
  );
}
export function chooseHat(group, id) {
  const duration = group.thinkingHat?.duration || 0;
  group.thinkingHat = id
    ? { hatId: id, duration, timer: { remaining: duration * 60, end: null } }
    : null;
}
export function syncProjectedHats(state) {
  if (state.projection.type !== "groups") return;
  state.projection.groups = (state.projection.groups || []).map((published) => {
    const group = state.groups.find((g) => g.id === published.id);
    if (!group) return published;
    return {
      ...published,
      thinkingHat: structuredClone(group.thinkingHat || null),
      members: published.members.map((p) => ({
        ...p,
        thinkingHat: hatFor(
          state.studentHats?.[p.id] || group.thinkingHat?.hatId,
        ),
        personalHat: !!hatFor(state.studentHats?.[p.id]),
      })),
    };
  });
}
export function HatGuide() {
  return (
    <details className="hat-guide" open>
      <summary>כובעי החשיבה של דה בונו</summary>
      <p>
        <strong>התפקיד מגדיר אחריות; הכובע מגדיר את דרך החשיבה כרגע.</strong>{" "}
        בדרך הקבוצתית כולם חובשים יחד אותו כובע ועוברים יחד לכובע הבא. הכובעים
        אינם תוויות קבועות לתלמידים.
      </p>
      <div className="hat-guide-grid">
        {thinkingHats.map((h) => (
          <article key={h.id} className={`hat-${h.id}`}>
            <h4>
              {h.icon} {h.label}
            </h4>
            <p>{h.focus}</p>
            <blockquote>״{h.prompt}״</blockquote>
          </article>
        ))}
      </div>
    </details>
  );
}
export function HatDisplay({ config }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!config?.timer?.end) return;
    const id = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [config?.timer?.end]);
  const hat = hatFor(config?.hatId);
  if (!hat) return null;
  const left = hatSeconds(config.timer);
  return (
    <section
      className={`hat-display hat-${hat.id}`}
      aria-label="כובע החשיבה הנוכחי"
    >
      <h4>
        <span aria-hidden="true">{hat.icon}</span> {hat.label}
      </h4>
      <p className="hat-prompt">{hat.prompt}</p>
      {config.duration > 0 && (
        <div className="hat-time">
          <span className="mono">
            {Math.floor(left / 60)
              .toString()
              .padStart(2, "0")}
            :{(left % 60).toString().padStart(2, "0")}
          </span>
          {left === 0 && <small>הזמן לכובע הסתיים — עוברים רק כשבוחרים</small>}
        </div>
      )}
    </section>
  );
}
export function GroupHatControls({ group, onChange }) {
  const config = group.thinkingHat,
    hat = hatFor(config?.hatId);
  return (
    <section
      className="group-hat-controls"
      aria-label={`כובעי חשיבה — ${group.name}`}
    >
      <label className="field">
        כובע משותף לקבוצה
        <select
          aria-label={`כובע משותף — ${group.name}`}
          value={hat?.id || ""}
          onChange={(e) => {
            const id = e.target.value;
            onChange((g) => chooseHat(g, id), true);
          }}
        >
          <option value="">ללא כובע משותף</option>
          {thinkingHats.map((h) => (
            <option key={h.id} value={h.id}>
              {h.icon} {h.label}
            </option>
          ))}
        </select>
      </label>
      <HatDisplay config={config} />
      <p className="hat-rule">
        בבחירת כובע משותף או „הכובע הבא”, כולם חוזרים לחשוב יחד באותו כובע.
        בחירה אישית אפשרית לשלב הנוכחי.
      </p>
      {hat && (
        <div className="hat-time-controls">
          <label>
            זמן לבחירה (דקות)
            <input
              aria-label={`זמן לכובע — ${group.name}`}
              type="number"
              min="0"
              max="60"
              step="1"
              value={config.duration}
              onChange={(e) => {
                const duration = Math.max(
                  0,
                  Math.min(60, Number(e.target.value) || 0),
                );
                onChange((g) => {
                  g.thinkingHat.duration = duration;
                  g.thinkingHat.timer = { remaining: duration * 60, end: null };
                });
              }}
            />
          </label>
          <span className="muted">0 = ללא טיימר</span>
          <button
            className="secondary"
            disabled={!config.duration}
            aria-label={`${config.timer?.end && hatSeconds(config.timer) > 0 ? "השהיית" : "הפעלת"} זמן הכובע — ${group.name}`}
            onClick={() =>
              onChange((g) => {
                const t = g.thinkingHat.timer,
                  left = hatSeconds(t);
                g.thinkingHat.timer =
                  t.end && left > 0
                    ? { remaining: left, end: null }
                    : {
                        remaining: left || g.thinkingHat.duration * 60,
                        end:
                          Date.now() +
                          (left || g.thinkingHat.duration * 60) * 1000,
                      };
              })
            }
          >
            {config.timer?.end && hatSeconds(config.timer) > 0 ? (
              <Pause size={15} />
            ) : (
              <Play size={15} />
            )}{" "}
            זמן הכובע
          </button>
        </div>
      )}
      <button
        className="secondary"
        onClick={() =>
          onChange((g) => {
            const i = thinkingHats.findIndex(
              (h) => h.id === g.thinkingHat?.hatId,
            );
            chooseHat(g, thinkingHats[(i + 1) % thinkingHats.length].id);
          }, true)
        }
      >
        הכובע הבא <ArrowLeft size={15} />
      </button>
    </section>
  );
}
export function StudentHatSelect({ student, hatId, onChange }) {
  const hat = hatFor(hatId);
  return (
    <div className="student-hat-control">
      <select
        aria-label={`כובע אישי של ${student.name}`}
        value={hat?.id || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">עם כובע הקבוצה</option>
        {thinkingHats.map((h) => (
          <option key={h.id} value={h.id}>
            {h.icon} {h.label}
          </option>
        ))}
      </select>
      {hat && <small>{hat.prompt}</small>}
    </div>
  );
}
export function PersonalHatBadge({ hat }) {
  return hat ? (
    <span className={`personal-hat-badge hat-${hat.id}`}>
      <strong>
        {hat.icon} כובע אישי: {hat.name}
      </strong>
      <small>{hat.prompt}</small>
    </span>
  ) : null;
}
