import React, { useState, useRef, useLayoutEffect } from "react";
import {
  Check,
  Trash2,
  Pencil,
  Monitor,
  MessageSquareQuote,
} from "lucide-react";
export const classModes = [
  { id: "listen", icon: "👂", label: "מקשיבים יחד" },
  { id: "quiet", icon: "🤫", label: "עבודה שקטה" },
  { id: "pairs", icon: "👥", label: "עבודה בזוגות" },
  { id: "groups", icon: "🧩", label: "עבודה בקבוצות" },
  { id: "discussion", icon: "💬", label: "זמן לשיחה" },
  { id: "movement", icon: "🙆", label: "הפסקת תנועה" },
];
export function ClassModeBadge({ mode }) {
  const badgeRef = useRef(null),
    titleRef = useRef(null);
  useLayoutEffect(() => {
    const badge = badgeRef.current,
      title = titleRef.current;
    if (!badge || !title) return;
    let active = true;
    const fit = () => {
      if (!active) return;
      title.style.fontSize = "";
      const style = getComputedStyle(badge),
        row = style.flexDirection === "row";
      const padding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      const siblings = [...badge.children].filter(
        (el) => el !== title && getComputedStyle(el).display !== "none",
      );
      const available = Math.max(
        12,
        badge.clientHeight -
          padding -
          (row
            ? 0
            : siblings.reduce(
                (n, el) => n + el.getBoundingClientRect().height,
                0,
              ) +
              siblings.length * parseFloat(style.gap || 0)),
      );
      let size = parseFloat(getComputedStyle(title).fontSize);
      while (
        size > 4 &&
        (title.scrollWidth > title.clientWidth + 1 ||
          title.scrollHeight > available + 1)
      ) {
        size = Math.max(4, size - 0.5);
        title.style.fontSize = `${size}px`;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(badge);
    document.fonts?.ready.then(fit);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [mode?.label, mode?.icon]);
  return mode ? (
    <aside
      ref={badgeRef}
      className="class-mode-badge"
      aria-label="מצב הכיתה המוצג"
    >
      <small>עכשיו בכיתה</small>
      <span aria-hidden="true">{mode.icon}</span>
      <h2 ref={titleRef}>{mode.label}</h2>
    </aside>
  ) : null;
}
export function ModePicker({ selected, onSelect }) {
  const [label, setLabel] = useState(""),
    [icon, setIcon] = useState("⭐");
  return (
    <div className="modal-body">
      <p className="muted">
        בחירה מעדכנת מיד את האייקון והכותרת לצד התוכן, במסך המורה ובהקרנה.
      </p>
      <div className="mode-options">
        {classModes.map((m) => (
          <button
            aria-pressed={selected?.id === m.id}
            className={selected?.id === m.id ? "chosen" : ""}
            key={m.id}
            onClick={() => onSelect(m)}
          >
            <span>{m.icon}</span>
            <strong>{m.label}</strong>
            {selected?.id === m.id && <Check size={16} />}
          </button>
        ))}
      </div>
      <form
        className="custom-mode"
        onSubmit={(e) => {
          e.preventDefault();
          onSelect({ id: "custom", icon, label: label.trim() });
        }}
      >
        <h3>מצב משלך</h3>
        <label className="field">
          אייקון למצב
          <select value={icon} onChange={(e) => setIcon(e.target.value)}>
            {["⭐", "✍️", "🔍", "🎨", "📖", "🧘", "🎧", "🌱", "🚦", "⏸️"].map(
              (i) => (
                <option key={i}>{i}</option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          כותרת מצב כיתה
          <input
            maxLength="40"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="למשל: זמן לחשוב"
          />
        </label>
        <button className="primary" disabled={!label.trim()}>
          הצגת המצב שלי
        </button>
      </form>
      {selected && (
        <button className="text-button" onClick={() => onSelect(null)}>
          הסרת מצב הכיתה מההקרנה
        </button>
      )}
    </div>
  );
}
export function QuoteBook({ state, update, onShow }) {
  const [text, setText] = useState(""),
    [student, setStudent] = useState(""),
    [editing, setEditing] = useState(null),
    [onlyLesson, setOnlyLesson] = useState(false);
  const quotes = state.quotes || [];
  function clear() {
    setText("");
    setStudent("");
    setEditing(null);
  }
  function save(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    const author = state.students.find((p) => p.id === student);
    const entry = {
      id: editing || crypto.randomUUID(),
      text: content,
      studentId: author?.id || null,
      studentName: author?.name || "",
      createdAt: Date.now(),
      lessonId: state.lessonId || null,
    };
    update(
      (s) => {
        s.quotes ||= [];
        if (editing) {
          const old = s.quotes.find((q) => q.id === editing);
          if (old)
            s.quotes = s.quotes.map((q) =>
              q.id === editing
                ? {
                    ...old,
                    text: content,
                    studentId: entry.studentId,
                    studentName: entry.studentName,
                  }
                : q,
            );
        } else s.quotes.unshift(entry);
      },
      editing ? "הציטוט עודכן במחברת. ההקרנה לא השתנתה." : "הציטוט נשמר במחברת",
    );
    clear();
  }
  return (
    <div className="modal-body quote-book">
      <div className="quote-intro">
        <MessageSquareQuote size={28} />
        <p>
          רגעים שכדאי לזכור. הציטוטים נשמרים לכיתה אצל המורה, ומוצגים לכיתה רק
          בבחירה מפורשת.
        </p>
      </div>
      <form onSubmit={save}>
        <label className="field">
          {editing ? "עריכת הציטוט" : "מה נאמר בכיתה?"}
          <textarea
            aria-label={editing ? "עריכת הציטוט" : "מה נאמר בכיתה?"}
            rows="4"
            maxLength="2000"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="מילים קטנות, מחשבות גדולות…"
          />
        </label>
        <label className="field">
          מי אמר או אמרה? (לא חובה)
          <select
            aria-label="תלמיד או תלמידה לציטוט"
            value={student}
            onChange={(e) => setStudent(e.target.value)}
          >
            <option value="">ללא שם</option>
            {state.students.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="quote-form-actions">
          <button className="primary" disabled={!text.trim()}>
            {editing ? "שמירת השינויים" : "שמירת ציטוט"}
          </button>
          {editing && (
            <button type="button" className="secondary" onClick={clear}>
              ביטול עריכה
            </button>
          )}
        </div>
      </form>
      <div className="quote-list-heading">
        <h3>
          הציטוטים שלנו <small>{quotes.length}</small>
        </h3>
        <label>
          <input
            type="checkbox"
            checked={onlyLesson}
            onChange={(e) => setOnlyLesson(e.target.checked)}
          />{" "}
          השיעור הנוכחי
        </label>
      </div>
      <div className="quote-list">
        {quotes
          .filter((q) => !onlyLesson || q.lessonId === (state.lessonId || null))
          .map((q) => (
            <article className="quote-card" key={q.id}>
              <blockquote>{q.text}</blockquote>
              <footer>
                <strong>{q.studentName || "ללא שם"}</strong>
                <time dateTime={new Date(q.createdAt).toISOString()}>
                  {new Intl.DateTimeFormat("he-IL", {
                    timeZone: "Asia/Jerusalem",
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(q.createdAt)}
                </time>
              </footer>
              <div className="quote-actions">
                <button
                  className="secondary"
                  onClick={() =>
                    onShow({
                      id: q.id,
                      text: q.text,
                      studentName: q.studentName,
                    })
                  }
                >
                  <Monitor size={15} /> הצגת הציטוט לכיתה
                </button>
                <button
                  className="icon-btn"
                  aria-label={`עריכת ציטוט: ${q.text}`}
                  onClick={() => {
                    setEditing(q.id);
                    setText(q.text);
                    setStudent(
                      state.students.some((p) => p.id === q.studentId)
                        ? q.studentId
                        : "",
                    );
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-btn danger"
                  aria-label={`מחיקת ציטוט: ${q.text}`}
                  onClick={() => {
                    update((s) => {
                      s.quotes = (s.quotes || []).filter((x) => x.id !== q.id);
                      if (
                        s.projection.type === "quote" &&
                        s.projection.quote.id === q.id
                      )
                        s.projection = { type: "slides" };
                    }, "הציטוט נמחק");
                    if (editing === q.id) clear();
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        {!quotes.filter(
          (q) => !onlyLesson || q.lessonId === (state.lessonId || null),
        ).length && (
          <p className="quote-empty">כאן יישמרו הרגעים המשמעותיים של הכיתה.</p>
        )}
      </div>
    </div>
  );
}
export function QuoteSlide({ quote }) {
  return (
    <div className="activity quote-slide">
      <span className="eyebrow">שווה ציטוט</span>
      <span className="quote-mark" aria-hidden="true">
        ״
      </span>
      <blockquote>{quote.text}</blockquote>
      {quote.studentName && <p>— {quote.studentName}</p>}
    </div>
  );
}
