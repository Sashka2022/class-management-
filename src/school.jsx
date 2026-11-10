import React, { useState, useEffect, useRef } from "react";
import { Download, Printer } from "lucide-react";
import { classrooms, classKey, classLabel, SESSION_KEY } from "./classrooms";
import { dayInIsrael, schoolYear, dailyStudents } from "../shared/schoolPolicy";
export function session() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || {};
  } catch {
    return {};
  }
}
export function cloudCredentials(classId) {
  const s = session();
  if (s.authToken) return { token: s.authToken };
  try {
    const pair = JSON.parse(sessionStorage.getItem(`beyachad-pair-${classId}`));
    return pair ? { token: pair.token, pairId: pair.id } : null;
  } catch {
    return null;
  }
}
export async function schoolRequest(
  body,
  credentials = cloudCredentials(body.classId),
) {
  const headers = { "Content-Type": "application/json" };
  if (credentials?.token) headers.Authorization = `Bearer ${credentials.token}`;
  if (credentials?.pairId) headers["X-Pair-Id"] = credentials.pairId;
  let response;
  try {
    response = await fetch("/api/school", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw Error(
      "אין חיבור לשמירה בענן כרגע. הנתונים המקומיים נשמרו לניסיון נוסף.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw Error("שרת השמירה בענן אינו זמין בפריסה הזאת.");
  }
  if (!response.ok) {
    const e = new Error(result.error || "לא ניתן להשלים את הפעולה בענן");
    e.status = response.status;
    throw e;
  }
  return result;
}
export function cacheCatalog(list) {
  const old = classrooms();
  for (const c of list) {
    const previous = old.find(
      (x) =>
        x.name.replace(/[\s׳״'"]/g, "") === c.name.replace(/[\s׳״'"]/g, ""),
    );
    if (previous && previous.id !== c.id) {
      const data = localStorage.getItem(classKey(previous.id));
      if (data && !localStorage.getItem(classKey(c.id)))
        localStorage.setItem(classKey(c.id), data);
    }
  }
  const extras = old.filter(
    (c) =>
      !list.some(
        (x) =>
          x.id === c.id ||
          x.name.replace(/[\s׳״'"]/g, "") === c.name.replace(/[\s׳״'"]/g, ""),
      ),
  );
  localStorage.setItem(
    "beyachad-classrooms-v1",
    JSON.stringify([...list, ...extras]),
  );
}
export async function loadCatalog() {
  const result = await schoolRequest({ action: "classes" }, null);
  cacheCatalog(result.classes);
  return result.classes;
}
export function useCloudArchive({
  classroom,
  state,
  update,
  onRoster,
  canSave = true,
}) {
  const credentials = cloudCredentials(classroom.id),
    enabled = !!credentials && !window.__BEYACHAD_STANDALONE__;
  const [rosterError, setRosterError] = useState(""),
    [reportError, setReportError] = useState(""),
    [rosterWorking, setRosterWorking] = useState(false),
    [ready, setReady] = useState(!enabled),
    [working, setWorking] = useState(false),
    [revision, setRevision] = useState(0),
    [rosterReload, setRosterReload] = useState(0);
  const latest = useRef({ state, update, onRoster }),
    busy = useRef(false),
    inFlight = useRef(false),
    rosterLoaded = useRef(false),
    rosterVersion = useRef(0),
    savedRoster = useRef("");
  latest.current = { state, update, onRoster };
  const pending = (state.lessons || []).filter(
    (l) =>
      Array.isArray(l.students) &&
      !l.cloudStored &&
      (!l.expiresAt || l.expiresAt > Date.now()),
  );
  const signature = JSON.stringify(pending),
    roster = JSON.stringify(
      state.students.map(({ id, name, emoji }) => ({ id, name, emoji })),
    );
  useEffect(() => {
    if (!enabled || credentials?.pairId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    rosterLoaded.current = false;
    schoolRequest({ action: "roster", classId: classroom.id }, credentials)
      .then((result) => {
        if (cancelled) return;
        rosterLoaded.current = true;
        rosterVersion.current = result.roster?.version || 0;
        if (result.roster) {
          savedRoster.current = JSON.stringify(result.roster.students);
          latest.current.onRoster(result.roster.students);
        } else savedRoster.current = "";
        setReady(true);
        setRosterError("");
      })
      .catch((e) => {
        if (!cancelled) {
          setRosterError(e.message);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, classroom.id, rosterReload]);
  useEffect(() => {
    if (
      !enabled ||
      classroom.combined ||
      credentials?.pairId ||
      !rosterLoaded.current ||
      !ready ||
      inFlight.current ||
      roster === savedRoster.current
    )
      return;
    inFlight.current = true;
    setRosterWorking(true);
    const run = async () => {
      try {
        while (true) {
          const students = latest.current.state.students.map(
              ({ id, name, emoji }) => ({ id, name, emoji }),
            ),
            text = JSON.stringify(students);
          if (text === savedRoster.current) break;
          const result = await schoolRequest(
            {
              action: "saveRoster",
              classId: classroom.id,
              students,
              version: rosterVersion.current,
            },
            credentials,
          );
          rosterVersion.current = result.version;
          savedRoster.current = text;
        }
        setRosterError("");
      } catch (e) {
        setRosterError(e.message);
      } finally {
        inFlight.current = false;
        setRosterWorking(false);
      }
    };
    run();
  }, [enabled, ready, roster, revision]);
  useEffect(() => {
    if (!enabled || !ready || !canSave || busy.current || !pending.length)
      return;
    busy.current = true;
    setWorking(true);
    let saved = false;
    const run = async () => {
      try {
        for (const lesson of pending) {
          const proof = JSON.stringify(lesson.students);
          await schoolRequest(
            { action: "saveReport", classId: classroom.id, report: lesson },
            credentials,
          );
          const acknowledged = await latest.current.update((s) => {
            const entry = s.lessons.find((l) => l.id === lesson.id);
            if (entry && JSON.stringify(entry.students) === proof) {
              delete entry.students;
              entry.cloudStored = true;
            }
          });
          if (!acknowledged)
            throw Error("הסיכום נשמר בענן; סימון השמירה במכשיר נכשל. נסו שוב.");
          window.dispatchEvent(new Event("school-data"));
          saved = true;
        }
        setReportError("");
      } catch (e) {
        setReportError(e.message);
      } finally {
        busy.current = false;
        setWorking(false);
        if (saved) setRevision((v) => v + 1);
      }
    };
    run();
  }, [enabled, ready, signature, revision, canSave]);
  return {
    enabled,
    ready,
    error: [rosterError, reportError].filter(Boolean).join(" "),
    working: working || rosterWorking,
    pending: pending.length,
    retry: () => {
      setRevision((v) => v + 1);
      if (!rosterLoaded.current) setRosterReload((v) => v + 1);
    },
  };
}
export function useCloudBackup({ classroom, state, restore }) {
  const signedIn = session(),
    enabled =
      !!signedIn.authToken &&
      signedIn.role === "teacher" &&
      !classroom.demo &&
      !window.__BEYACHAD_STANDALONE__;
  const [ready, setReady] = useState(!enabled),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [savedAt, setSavedAt] = useState(null),
    [attempt, setAttempt] = useState(0),
    [revision, setRevision] = useState(0);
  const latest = useRef({ state, restore }),
    loaded = useRef(false),
    busy = useRef(false),
    failed = useRef(false),
    stopped = useRef(false),
    alive = useRef(true),
    savedText = useRef(null);
  latest.current = { state, restore };
  const text = JSON.stringify(state);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!enabled || loaded.current) return;
    let cancelled = false,
      timer;
    schoolRequest(
      { action: "backup", classId: classroom.id },
      { token: signedIn.authToken },
    )
      .then((result) => {
        if (cancelled) return;
        loaded.current = true;
        if (result.backup) {
          const current = latest.current.restore(result.backup);
          setSavedAt(result.backup.savedAt || null);
          // Nothing to upload when this device already holds the saved copy.
          if (
            current.revisedAt &&
            current.revisedAt === result.backup.revisedAt
          )
            savedText.current = JSON.stringify(current);
        }
        setError("");
        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        // Saving stays off until the saved copy was read, so a device that
        // could not load it never replaces it with an empty lesson.
        setError(e.message);
        setReady(true);
        timer = setTimeout(() => setAttempt((v) => v + 1), 15000);
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, classroom.id, attempt]);
  useEffect(() => {
    if (
      !enabled ||
      !loaded.current ||
      stopped.current ||
      text === savedText.current
    )
      return;
    const timer = setTimeout(
      async () => {
        if (busy.current) return;
        busy.current = true;
        setWorking(true);
        const sent = latest.current.state,
          sentText = JSON.stringify(sent);
        try {
          const result = await schoolRequest(
            { action: "saveBackup", classId: classroom.id, state: sent },
            { token: signedIn.authToken },
          );
          savedText.current = sentText;
          failed.current = false;
          if (alive.current) {
            setSavedAt(result.savedAt);
            setError("");
          }
        } catch (e) {
          failed.current = true;
          // A lost sign-in or lesson control will not recover by retrying.
          if ([400, 401, 403, 409].includes(e.status)) stopped.current = true;
          if (alive.current) setError(e.message);
        } finally {
          busy.current = false;
          if (alive.current) {
            setWorking(false);
            setRevision((v) => v + 1);
          }
        }
      },
      failed.current ? 30000 : 4000,
    );
    return () => clearTimeout(timer);
  }, [enabled, ready, text, revision]);
  return {
    enabled,
    ready,
    error,
    working,
    savedAt,
    pending: enabled && loaded.current && text !== savedText.current,
    retry: () => {
      stopped.current = false;
      failed.current = false;
      setError("");
      if (loaded.current) setRevision((v) => v + 1);
      else setAttempt((v) => v + 1);
    },
  };
}
export function BackupStatus({ backup }) {
  if (!backup.enabled) return null;
  return (
    <div className="backup-status" role="status">
      {backup.error ? (
        <>
          <span>גיבוי השיעור בענן נכשל: {backup.error}</span>
          <button onClick={backup.retry}>ניסיון גיבוי נוסף</button>
        </>
      ) : !backup.ready ? (
        "בודקים גיבוי של השיעור בענן…"
      ) : backup.working || backup.pending ? (
        "מגבים את השיעור והתבניות בענן…"
      ) : backup.savedAt ? (
        `השיעור והתבניות מגובים בענן · ${new Intl.DateTimeFormat("he-IL", {
          timeZone: "Asia/Jerusalem",
          hour: "2-digit",
          minute: "2-digit",
        }).format(backup.savedAt)}`
      ) : (
        "גיבוי השיעור בענן פעיל"
      )}
    </div>
  );
}
const csvCell = (value) => {
  let text = String(value ?? "");
  // Spreadsheet programs run cells that start like a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function reportCsv(records, daily) {
  const date = (time) =>
      new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem" }).format(
        time,
      ),
    hour = (time) =>
      new Intl.DateTimeFormat("he-IL", {
        timeZone: "Asia/Jerusalem",
        hour: "2-digit",
        minute: "2-digit",
      }).format(time);
  const rows = daily
    ? [
        ["כיתה", "תלמיד/ה", "שיעורים", "נוכחות", "איחורים", "לבבות", "אזהרות"],
        ...dailyStudents(records).map((p) => [
          p.className,
          p.name,
          p.lessons,
          p.present,
          p.late,
          p.hearts,
          p.warnings,
        ]),
      ]
    : [
        ["תאריך", "שעת סיום", "כיתה", "תלמיד/ה", "נוכחות", "לבבות", "אזהרות"],
        ...records.flatMap((r) =>
          r.students.map((p) => [
            date(r.endedAt),
            hour(r.endedAt),
            r.className,
            p.name,
            p.present ? (p.late ? "באיחור" : "נוכח/ת") : "חסר/ה",
            p.hearts,
            p.warnings,
          ]),
        ),
      ];
  // The byte-order mark makes Excel read the Hebrew text as UTF-8.
  return "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
export function ArchiveStatus({ cloud, demo }) {
  if (demo && !cloud.enabled)
    return (
      <span className="archive-note">כיתת דמה · סיכומים מקומיים להתנסות</span>
    );
  if (!cloud.enabled)
    return (
      <span className="cloud-error">
        יש להתחבר מחדש כדי לשמור סיכומים בענן.
      </span>
    );
  return (
    <div className="cloud-status" role="status">
      {cloud.error ? (
        <>
          <span>{cloud.error}</span>
          <button onClick={cloud.retry}>ניסיון נוסף</button>
        </>
      ) : !cloud.ready ? (
        "טוענים את רשימת הכיתה מהענן…"
      ) : cloud.working ? (
        "שומרים סיכום בענן…"
      ) : cloud.pending ? (
        `${cloud.pending} סיכומים ממתינים לשמירה בענן`
      ) : (
        "שמירה בענן פעילה"
      )}
    </div>
  );
}
export function ReportPanel({ classroom, localState, admin = false }) {
  const [day, setDay] = useState(dayInIsrael),
    [to, setTo] = useState(day),
    [classId, setClassId] = useState(classroom?.id || ""),
    [mode, setMode] = useState("daily"),
    [records, setRecords] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0),
    [confirm, setConfirm] = useState(null);
  const credentials = cloudCredentials(classId || classroom?.id),
    local = !credentials && classroom?.demo,
    ranged = to > day;
  useEffect(() => {
    if (local) {
      setRecords(
        (localState?.lessons || [])
          .filter(
            (l) =>
              l.students &&
              dayInIsrael(l.endedAt) >= day &&
              dayInIsrael(l.endedAt) <= to,
          )
          .map((l) => ({
            ...l,
            classId: classroom.id,
            className: classroom.name,
            students: l.students.map((p) => ({
              ...p,
              warnings: p.warnings ?? p.warningCount ?? p.warning ?? 0,
            })),
          })),
      );
      return;
    }
    if (!credentials) {
      setError("יש להתחבר מחדש כדי לצפות בסיכומים בענן.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    schoolRequest(
      {
        action: "reports",
        classId: classId || undefined,
        day,
        ...(ranged ? { to } : {}),
      },
      credentials,
    )
      .then((result) => {
        if (!cancelled) {
          setRecords(result.records);
          setError("");
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [day, to, classId, revision, localState?.lessons]);
  const rows = dailyStudents(records),
    policy = schoolYear();
  const shortDate = (value) => value.split("-").reverse().join(".");
  const period = ranged
    ? `${shortDate(day)} – ${shortDate(to)}`
    : shortDate(day);
  const scopeLabel = classId
    ? classLabel(
        classrooms().find((c) => c.id === classId) || classroom || { name: "" },
      )
    : "כל הכיתות הרגילות";
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob([reportCsv(records, mode === "daily")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `sikumim-${mode === "daily" ? "talmidim" : "shiurim"}-${ranged ? `${day}_${to}` : day}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function remove(record) {
    try {
      await schoolRequest(
        { action: "deleteReport", classId: record.classId, id: record.id },
        credentials,
      );
      window.dispatchEvent(new Event("school-data"));
      setConfirm(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e.message);
    }
  }
  function table(students, daily = false) {
    return (
      <div className="report-table-scroll">
        <table className="report-table">
          <thead>
            <tr>
              {(admin || classroom?.combined) && <th>כיתה</th>}
              <th>תלמיד/ה</th>
              <th>נוכחות</th>
              <th>לבבות</th>
              <th>אזהרות שניתנו</th>
            </tr>
          </thead>
          <tbody>
            {students.map((p) => (
              <tr key={`${p.classId || classId}:${p.id}`}>
                {(admin || classroom?.combined) && (
                  <td>
                    {p.className ||
                      records.find((r) => r.classId === p.classId)?.className ||
                      classroom?.name}
                  </td>
                )}
                <th scope="row">
                  {p.emoji} {p.name}
                </th>
                <td>
                  {daily
                    ? `${p.present} מתוך ${p.lessons} שיעורים`
                    : p.present
                      ? p.late
                        ? "באיחור"
                        : "נוכח/ת"
                      : "חסר/ה"}
                </td>
                <td>{p.hearts}</td>
                <td>{p.warnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <section className="panel report-panel">
      <div className="panel-heading">
        <div>
          <h2>סיכומי תלמידים</h2>
          <p className="muted">
            נוכחות, לבבות ומספר אזהרות — ללא פירוט אירועים
          </p>
        </div>
        <button className="secondary" onClick={() => setRevision((v) => v + 1)}>
          רענון סיכומים
        </button>
      </div>
      <div className="report-filters">
        <label className="field">
          תאריך סיכומים
          <input
            type="date"
            value={day}
            onChange={(e) => {
              const next = e.target.value;
              if (!next) return;
              // A single-day view keeps following the chosen date.
              if (to === day || to < next) setTo(next);
              setDay(next);
            }}
          />
        </label>
        <label className="field">
          עד תאריך
          <input
            type="date"
            min={day}
            value={to}
            onChange={(e) => setTo(e.target.value < day ? day : e.target.value)}
          />
        </label>
        {admin && (
          <label className="field">
            כיתה לסיכומים
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">כל הכיתות הרגילות</option>
              {classrooms().map((c) => (
                <option key={c.id} value={c.id}>
                  {classLabel(c)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          className={mode === "daily" ? "primary" : "secondary"}
          onClick={() => setMode("daily")}
        >
          {ranged ? "סיכום התקופה" : "סיכום יומי"}
        </button>
        <button
          className={mode === "lessons" ? "primary" : "secondary"}
          onClick={() => setMode("lessons")}
        >
          לפי שיעור
        </button>
        <button
          className="secondary"
          disabled={loading || !records.length}
          onClick={exportCsv}
        >
          <Download size={16} /> ייצוא ל־Excel
        </button>
        <button
          className="secondary"
          disabled={loading || !records.length}
          onClick={() => window.print()}
        >
          <Printer size={16} /> הדפסה
        </button>
      </div>
      <p className="report-print-title">
        סיכומי תלמידים · {scopeLabel} · {period}
      </p>
      <p className="report-retention">
        השמירה עד{" "}
        {new Intl.DateTimeFormat("he-IL", {
          timeZone: "Asia/Jerusalem",
        }).format(policy.expiresAt)}
        . הסיכומים נמחקים אוטומטית בתום התקופה; אפשר למחוק גם קודם.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {loading ? (
        <p className="empty">טוענים סיכומים…</p>
      ) : !records.length ? (
        <p className="empty">
          {ranged
            ? "אין סיכומים שמורים בטווח התאריכים הזה."
            : "אין סיכומים שמורים לתאריך הזה. סיכום נוצר בסיום שיעור."}
        </p>
      ) : mode === "daily" ? (
        <>
          <p className="report-total">
            {records.length} סיכומי שיעור · ללא ספירה כפולה
          </p>
          {table(rows, true)}
        </>
      ) : (
        records.map((r) => (
          <article className="lesson-report" key={`${r.classId}:${r.id}`}>
            <header>
              <h3>
                {classLabel({
                  name: r.className,
                  demo: r.className === "כיתת דמה",
                })}{" "}
                ·{" "}
                {new Intl.DateTimeFormat("he-IL", {
                  timeZone: "Asia/Jerusalem",
                  ...(ranged ? { day: "2-digit", month: "2-digit" } : {}),
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(r.endedAt)}
              </h3>
              <span>
                {r.completed ? "שיעור הסתיים" : "שיעור שהוחלף ללא סיום"}
              </span>
              {!local && (
                <button
                  className="text-button danger"
                  onClick={() => setConfirm(r)}
                >
                  מחיקת סיכום
                </button>
              )}
            </header>
            {table(
              r.students.map((p) => ({
                ...p,
                classId: r.classId,
                className: r.className,
              })),
            )}
          </article>
        ))
      )}
      {confirm && (
        <div className="delete-report-confirm" role="alert">
          <p>למחוק את סיכום השיעור? המחיקה מסירה אותו גם מהסיכום היומי.</p>
          <button className="secondary" onClick={() => remove(confirm)}>
            אישור מחיקת הסיכום
          </button>
          <button className="text-button" onClick={() => setConfirm(null)}>
            ביטול מחיקה
          </button>
        </div>
      )}
    </section>
  );
}
