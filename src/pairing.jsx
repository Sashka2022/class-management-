import React, { useState, useRef, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { classrooms, classKey, SESSION_KEY } from "./classrooms";
const key = (id) => `beyachad-pair-${id}`;
export async function pairRequest(body) {
  const r = await fetch("/api/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let result;
  try {
    result = await r.json();
  } catch {
    throw Error(
      "חיבור מכשיר נוסף דורש שרת פעיל. גרסת הקובץ העצמאי אינה תומכת בחיבור זה.",
    );
  }
  if (!r.ok) {
    const e = new Error(result.error || "החיבור נכשל");
    e.status = r.status;
    throw e;
  }
  return result;
}
export function usePairing(classroom, state, apply) {
  const [connection, setConnection] = useState(() => {
      try {
        return JSON.parse(sessionStorage.getItem(key(classroom.id)));
      } catch {
        return null;
      }
    }),
    [joined, setJoined] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  const callback = useRef(apply),
    queue = useRef(Promise.resolve()),
    version = useRef(-1);
  callback.current = apply;
  function accept(result) {
    if (result.version >= version.current) {
      version.current = result.version;
      callback.current(result.state);
    }
    setJoined(result.joined);
    setStatus(result.joined ? "מכשיר נוסף מחובר" : "ממתינים למכשיר נוסף");
    setError("");
  }
  function save(c) {
    sessionStorage.setItem(key(classroom.id), JSON.stringify(c));
    setConnection(c);
  }
  useEffect(() => {
    if (!connection) return;
    let stopped = false,
      busy = false;
    const read = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const result = await pairRequest({ action: "read", ...connection });
        if (!stopped) accept(result);
      } catch (e) {
        if (!stopped) {
          setError(e.message);
          setStatus("החיבור נותק");
        }
      } finally {
        busy = false;
      }
    };
    read();
    const timer = setInterval(read, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [connection?.id]);
  async function create() {
    setError("");
    try {
      const result = await pairRequest({
        action: "create",
        password: "1111",
        state,
        classroom,
      });
      version.current = -1;
      const c = {
        id: result.id,
        token: result.token,
        code: result.code,
        codeExpires: result.codeExpires,
        host: true,
      };
      save(c);
      accept(result);
    } catch (e) {
      setError(e.message);
    }
  }
  function mutate(fn) {
    const work = queue.current
      .catch(() => {})
      .then(async () => {
        const op = crypto.randomUUID();
        for (let i = 0; i < 4; i++) {
          const current = await pairRequest({ action: "read", ...connection });
          const next = structuredClone(current.state);
          fn(next);
          try {
            const result = await pairRequest({
              action: "write",
              ...connection,
              state: next,
              version: current.version,
              op,
            });
            accept(result);
            return { previous: current.state, next: result.state };
          } catch (e) {
            if (e.status !== 409) throw e;
          }
        }
        throw Error("שינוי מקביל. נסו שוב.");
      });
    queue.current = work;
    return work;
  }
  async function disconnect() {
    try {
      if (connection.host) {
        try {
          await pairRequest({ action: "close", ...connection });
        } catch (e) {
          if (![401, 410].includes(e.status)) throw e;
        }
      }
      sessionStorage.removeItem(key(classroom.id));
      setConnection(null);
      setJoined(false);
      setStatus("");
      setError("");
      version.current = -1;
    } catch (e) {
      setError(e.message);
    }
  }
  return { connection, joined, status, error, create, disconnect, mutate };
}
export function PairPanel({ pair }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!pair.connection?.code) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pair.connection?.code]);
  const expired = pair.connection?.codeExpires <= now;
  const canJoin =
    pair.connection?.code && !expired && !pair.joined && !pair.error;
  const url = new URL(location.href);
  url.search = "?view=join";
  url.hash = canJoin ? `code=${pair.connection.code}` : "";
  const localOnly =
    location.protocol === "file:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  return (
    <div className="pair-panel">
      <h3>חיבור מכשיר נוסף</h3>
      <p>
        יוצרים קוד וסורקים בנייד את ה־QR. מסך החיבור ייפתח עם הקוד מוכן — לוחצים
        „חיבור לשיעור”. אפשר גם להזין את הקוד ידנית. הקוד חד־פעמי ותקף לעשר
        דקות; החיבור תקף עד ארבע שעות.
      </p>
      {pair.connection ? (
        <>
          <p role="status">{pair.status}</p>
          {canJoin && (
            <>
              <div className="pair-qr">
                <QRCodeCanvas
                  value={url.href}
                  size={224}
                  marginSize={4}
                  level="M"
                  role="img"
                  aria-label="QR לחיבור מכשיר המורה"
                />
                <strong>סרקי במצלמת הנייד</strong>
              </div>
              <small>או הזיני את הקוד ידנית:</small>
              <output className="pair-code">{pair.connection.code}</output>
              <small>
                ה־QR והקוד מיועדים למורה בלבד, ואין להקרין אותם לכיתה.
              </small>
              {localOnly && (
                <p className="form-error">
                  הכתובת הנוכחית מקומית. לסריקה מטלפון פתחי במחשב את כתובת האתר
                  הציבורית.
                </p>
              )}
            </>
          )}
          {pair.connection.code && expired && !pair.joined && (
            <p role="alert">תוקף הקוד פג. נתקי את החיבור וצרי קוד חדש.</p>
          )}
          {pair.joined && <p>הקוד וה־QR נוצלו ואינם זמינים לחיבור נוסף.</p>}
          <button className="secondary" onClick={pair.disconnect}>
            ניתוק החיבור
          </button>
        </>
      ) : (
        <button className="primary" onClick={pair.create}>
          יצירת קוד חיבור
        </button>
      )}
      {pair.error && (
        <p className="form-error" role="alert">
          {pair.error}
        </p>
      )}
      <p className="muted">
        קבצים שהועלו נשארים במחשב המקורי. בחירת שקפים, נוכחות, לבבות ואזהרות
        מסתנכרנים; ניגון סרטון בתוך חלון אינו מסונכרן.
      </p>
    </div>
  );
}
export function JoinDevice({ onJoin, onBack }) {
  const [code, setCode] = useState(() => {
      const value =
        new URLSearchParams(location.hash.slice(1)).get("code") || "";
      return /^\d{8}$/.test(value) ? value : "";
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(location.hash.slice(1)).has("code"))
      history.replaceState(null, "", location.pathname + location.search);
  }, []);
  return (
    <main className="join-device panel">
      <h1>השיעור עובר לידיים שלך</h1>
      <p>
        {/^\d{8}$/.test(code)
          ? "הקוד מוכן. לחצו על „חיבור לשיעור” כדי להתחבר."
          : "מזינים את הקוד שמופיע במחשב המורה."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await pairRequest({ action: "join", code });
            const c = result.classroom;
            const list = classrooms();
            if (!list.some((x) => x.id === c.id))
              localStorage.setItem(
                "beyachad-classrooms-v1",
                JSON.stringify([...list, c]),
              );
            localStorage.setItem(classKey(c.id), JSON.stringify(result.state));
            sessionStorage.setItem(
              key(c.id),
              JSON.stringify({
                id: result.id,
                token: result.token,
                host: false,
              }),
            );
            onJoin({ role: "teacher", classId: c.id });
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          קוד חיבור
          <input
            aria-label="קוד חיבור"
            required
            pattern="[0-9]{8}"
            inputMode="numeric"
            maxLength="8"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "מתחברים…" : "חיבור לשיעור"}
        </button>
      </form>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="text-button" onClick={onBack}>
        חזרה לכניסה
      </button>
    </main>
  );
}
