import React, { useState, useEffect } from "react";
import {
  Sprout,
  Users,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  Heart,
  BookOpen,
  Plus,
  Search,
  School,
  Clock3,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { classrooms, addClass, classMetrics } from "./classrooms";

export function Login({ onLogin, requestedClass, admin = false, onPair }) {
  const [role, setRole] = useState(admin ? "admin" : "teacher"),
    [classId, setClassId] = useState(requestedClass || classrooms()[0].id),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [show, setShow] = useState(false);
  function submit(e) {
    e.preventDefault();
    if (password !== "1111") {
      setError("הסיסמה אינה נכונה. נסו שוב.");
      return;
    }
    onLogin({ role, classId: role === "teacher" ? classId : null });
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <a className="brand" href={location.pathname}>
          <span className="brand-icon">
            <Sprout size={32} />
          </span>
          <span>
            ביחד<small>מקום לצמוח בו</small>
          </span>
        </a>
        <div className="login-illustration">
          <span>✳</span>
          <Sprout size={160} strokeWidth={1} />
          <i>כל כיתה היא התחלה חדשה.</i>
        </div>
        <h1>
          נכנסים לכיתה.
          <br />
          מפנים מקום לצמיחה.
        </h1>
        <p>
          מרחב אחד למורים, לשיעורים ולרגעים הקטנים
          <br />
          שהופכים כל יום להזדמנות.
        </p>
        <small>אבטיפוס · נתוני הדגמה בלבד</small>
      </section>
      <section className="login-form-area">
        <form onSubmit={submit} className="login-card">
          <span className="eyebrow">טוב שאתם כאן</span>
          <h2>ברוכים הבאים לביחד</h2>
          <p className="muted">בחרו איך להיכנס למרחב שלכם.</p>
          <div className="role-switch" aria-label="סוג כניסה">
            {[
              ["teacher", Users, "כניסת מורה"],
              ["admin", ShieldCheck, "כניסת אדמין"],
            ].map(([id, Icon, label]) => (
              <button
                type="button"
                aria-pressed={role === id}
                className={role === id ? "active" : ""}
                key={id}
                onClick={() => {
                  setRole(id);
                  setError("");
                  setPassword("");
                }}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
          {role === "teacher" ? (
            <>
              <label className="field">
                הכיתה שלי
                <select
                  aria-label="הכיתה שלי"
                  value={classId}
                  onChange={(e) => {
                    setClassId(e.target.value);
                    setError("");
                  }}
                >
                  {classrooms().map((c) => (
                    <option value={c.id} key={c.id}>
                      כיתה {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="login-hint">
                כל מורה יכול להיכנס לכיתה באמצעות הסיסמה המשותפת.
              </p>
            </>
          ) : (
            <div className="admin-login-note">
              <ShieldCheck size={22} />
              <div>
                <strong>מבט על כל הכיתות</strong>
                <p>נתונים מצטברים, נוכחות ורגעים של עידוד.</p>
              </div>
            </div>
          )}
          <label className="field">
            סיסמה
            <span className="password-field">
              <input
                required
                type={show ? "text" : "password"}
                inputMode="numeric"
                autoComplete="current-password"
                aria-label="סיסמה"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
              />
              <button
                type="button"
                aria-label={show ? "הסתרת סיסמה" : "הצגת סיסמה"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && (
            <p id="login-error" className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary login-submit">
            {role === "teacher" ? "נכנסים לכיתה" : "למרחב האדמין"}
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="secondary pair-entry"
            onClick={onPair}
          >
            חיבור עם קוד ממחשב המורה
          </button>
          <p className="login-disclaimer">
            הכניסה בסיסמה משותפת מיועדת להדגמה. השתמשו בנתוני דוגמה בלבד.
          </p>
        </form>
      </section>
    </main>
  );
}
export function Admin({ onLogout }) {
  const [revision, setRevision] = useState(0),
    [query, setQuery] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [added, setAdded] = useState("");
  useEffect(() => {
    const refresh = () => setRevision((v) => v + 1);
    window.addEventListener("storage", refresh);
    const t = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(t);
    };
  }, []);
  const rows = classrooms().map(classMetrics),
    totals = rows.reduce(
      (a, c) => ({
        students: a.students + c.students,
        present: a.present + c.present,
        hearts: a.hearts + c.hearts,
        completed: a.completed + c.completed,
        active: a.active + Number(c.active),
      }),
      { students: 0, present: 0, hearts: 0, completed: 0, active: 0 },
    );
  const maxHearts = Math.max(1, ...rows.map((c) => c.hearts));
  return (
    <div className="admin-page">
      <header className="admin-top">
        <a className="brand" href={location.pathname}>
          <span className="brand-icon">
            <Sprout size={26} />
          </span>
          <span>
            ביחד<small>מקום לצמוח בו</small>
          </span>
        </a>
        <span className="admin-tag">
          <ShieldCheck size={16} /> מרחב אדמין
        </span>
        <button className="secondary" onClick={onLogout}>
          <LogOut size={16} /> יציאה
        </button>
      </header>
      <main className="admin-workspace">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">רואים את התמונה הרחבה</span>
            <h1>כל הכיתות, סיפור משותף.</h1>
            <p className="muted">
              הנתונים המצטברים של המרחב · מתעדכנים מהפעילות בדפדפן הזה
            </p>
          </div>
          <span className="admin-live">
            <i className="online-dot" /> {totals.active} שיעורים פעילים
          </span>
        </div>
        <div className="admin-stats">
          {[
            [School, "כיתות במרחב", rows.length, "sage"],
            [Users, "תלמידים רשומים", totals.students, "lavender"],
            [BookOpen, "שיעורים שהסתיימו", totals.completed, "peach"],
            [Heart, "לבבות מצטברים", totals.hearts, "rose"],
          ].map(([Icon, label, value, color]) => (
            <section className="admin-stat" key={label}>
              <span className={`stat-icon ${color}`}>
                <Icon size={23} />
              </span>
              <span>{label}</span>
              <strong>{value}</strong>
            </section>
          ))}
        </div>
        <div className="admin-grid">
          <section className="panel admin-class-panel">
            <div className="panel-heading">
              <div>
                <h2>הכיתות שלנו</h2>
                <p className="muted">נוכחות עדכנית לצד נתונים מכל השיעורים</p>
              </div>
              <span className="count">{rows.length} כיתות</span>
            </div>
            <label className="search">
              <Search size={17} />
              <input
                placeholder="חיפוש כיתה…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>כיתה</th>
                    <th>נוכחות כעת</th>
                    <th>שיעורים שהסתיימו</th>
                    <th>לבבות מצטברים</th>
                    <th>מצב</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((c) => c.name.includes(query))
                    .map((c) => (
                      <tr key={c.id}>
                        <th scope="row">כיתה {c.name}</th>
                        <td>
                          {c.visited ? (
                            <>
                              <strong>{c.present}</strong> / {c.students}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{c.completed}</td>
                        <td>
                          <span className="admin-hearts">
                            <Heart size={13} />
                            {c.hearts}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`class-status ${c.active ? "is-active" : ""}`}
                          >
                            {c.active
                              ? "בשיעור"
                              : c.visited
                                ? "השיעור הסתיים"
                                : "טרם התחילו"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!rows.some((c) => c.name.includes(query)) && (
                <p className="empty">לא נמצאו כיתות התואמות לחיפוש.</p>
              )}
            </div>
            <div className="admin-attendance">
              <Users size={17} />
              <span>
                {totals.present} מתוך {totals.students} תלמידים מסומנים כנוכחים
              </span>
            </div>
          </section>
          <aside className="admin-side">
            <section className="panel admin-chart">
              <span className="eyebrow">מילה טובה עושה הבדל</span>
              <h2>רגעים של עידוד</h2>
              <p className="muted">לבבות מצטברים לפי כיתה</p>
              {rows.map((c) => (
                <div className="heart-chart-row" key={c.id}>
                  <span>כיתה {c.name}</span>
                  <div className="heart-track">
                    <i style={{ width: `${(c.hearts / maxHearts) * 100}%` }} />
                  </div>
                  <strong>{c.hearts}</strong>
                </div>
              ))}
              {!totals.hearts && (
                <p className="muted">הלב הראשון שיינתן בכיתה יופיע גם כאן.</p>
              )}
            </section>
            <section className="panel add-class-panel">
              <h2>
                <Plus size={19} /> עוד מקום לצמוח
              </h2>
              <p className="muted">כיתה חדשה תופיע מיד במסך הכניסה למורים.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  try {
                    const c = addClass(name);
                    setAdded(`כיתה ${c.name} נוספה בהצלחה`);
                    setName("");
                    setError("");
                    setRevision((v) => v + 1);
                  } catch (err) {
                    setError(err.message);
                    setAdded("");
                  }
                }}
              >
                <label className="field">
                  שם הכיתה
                  <input
                    maxLength="40"
                    required
                    placeholder="למשל: ד׳1"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                      setAdded("");
                    }}
                  />
                </label>
                <button className="primary" type="submit">
                  <Plus size={16} /> הוספת כיתה
                </button>
                {error && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                {added && (
                  <p role="status" className="form-success">
                    <Check size={16} />
                    {added}
                  </p>
                )}
              </form>
            </section>
          </aside>
        </div>
        <div className="admin-footnote">
          <ShieldCheck size={17} />
          <p>
            הסיכום כולל שיעורים שהסתיימו ולבבות גם מהשיעור הנוכחי. נוכחות מציגה
            את הסימון האחרון בכל כיתה. אין כאן דירוג תלמידים או היסטוריית משמעת
            אישית. הנתונים מקומיים לדפדפן בלבד.
          </p>
        </div>
      </main>
    </div>
  );
}
