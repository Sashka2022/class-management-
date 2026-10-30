import React, { useState, useEffect } from "react";
import { Heart, Flag, Upload, Link, Plus, ExternalLink } from "lucide-react";
function db() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("beyachad-media", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveFile(file) {
  const store = await db();
  try {
    await new Promise((resolve, reject) => {
      const tx = store.transaction("files", "readwrite");
      tx.objectStore("files").put(file, file.id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    store.close();
  }
}
async function loadFile(id) {
  const store = await db();
  try {
    return await new Promise((resolve, reject) => {
      const r = store.transaction("files").objectStore("files").get(id);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    store.close();
  }
}
export function siteUrl(value) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol))
    throw Error("יש להזין קישור שמתחיל ב־https:// או http://");
  return url.href;
}
function embed(url) {
  const u = new URL(url);
  if (
    ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
      u.hostname,
    )
  ) {
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ||
          u.pathname.split("/").filter(Boolean).pop();
    if (/^[\w-]{11}$/.test(id))
      return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  return url;
}
export function MediaFrame({ media }) {
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      object;
    setSrc("");
    setError("");
    if (media.url) {
      setSrc(embed(media.url));
      return;
    }
    loadFile(media.id)
      .then((file) => {
        if (!active) return;
        if (!file)
          throw Error("הקובץ אינו זמין בדפדפן הזה. יש לטעון אותו שוב.");
        object = URL.createObjectURL(file.blob);
        setSrc(object);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
      if (object) URL.revokeObjectURL(object);
    };
  }, [media.id, media.url]);
  return (
    <div className="media-frame">
      {error ? (
        <p role="alert">{error}</p>
      ) : !src ? (
        <p>טוענים את התוכן…</p>
      ) : media.kind === "image" ? (
        <img src={src} alt={media.name} />
      ) : media.kind === "video" ? (
        <video src={src} controls playsInline />
      ) : media.kind === "audio" ? (
        <div className="audio-content">
          <h3>{media.name}</h3>
          <audio src={src} controls />
        </div>
      ) : media.kind === "pdf" ? (
        <iframe title={media.name} src={src} />
      ) : media.url ? (
        <iframe
          title={media.name}
          src={src}
          allow="fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="unsupported">
          <p>לפורמט הזה אין תצוגה מובנית בדפדפן.</p>
          <a href={src} download={media.name}>
            הורדת הקובץ
          </a>
        </div>
      )}
    </div>
  );
}
export function StatusBoard({ students = [], onHeart, onWarning, onStudent }) {
  const [compact, setCompact] = useState(false);
  return (
    <section
      className={`class-status-board ${compact ? "compact" : ""}`}
      aria-label="סטטוס כל התלמידים"
    >
      <div className="status-board-heading">
        <strong>
          הכיתה שלנו <small>{students.length}</small>
        </strong>
        <button
          className="text-button"
          aria-expanded={!compact}
          onClick={() => setCompact(!compact)}
        >
          {compact ? "הרחבת תצוגת תלמידים" : "צמצום תצוגת תלמידים"}
        </button>
        <span>♥ חיזוק · ⚑ אזהרה · ✓ נוכחות</span>
      </div>
      <div className="status-tiles" style={{ "--count": students.length }}>
        {students.map((p) => (
          <div
            key={p.id}
            className={`status-tile warning-${p.warning || 0} ${p.present ? "" : "is-absent"}`}
          >
            <button
              disabled={!onStudent}
              className="status-person"
              onClick={() => onStudent?.(p.id)}
              title={p.name}
            >
              <span>{p.emoji}</span>
              <strong>{p.name}</strong>
              <small
                aria-label={`${p.name}: ${p.present ? "נוכח/ת" : "חסר/ה"}`}
              >
                {p.present ? "✓" : "−"}
              </small>
            </button>
            <div className="status-symbols">
              <button
                disabled={!onHeart}
                onClick={() => onHeart?.(p.id)}
                aria-label={`חיזוק מהיר ל${p.name}`}
              >
                <Heart size={13} />
                {p.hearts}
              </button>
              <button
                disabled={!onWarning}
                onClick={() => onWarning?.(p.id)}
                aria-label={`אזהרה ${p.warning || 0} ל${p.name}`}
              >
                <Flag size={13} />
                {p.warning || 0}
              </button>
            </div>
          </div>
        ))}
      </div>
      {!students.length && <p>מוסיפים תלמידים מתוך הכיתה שלי</p>}
    </section>
  );
}
export function MediaPicker({ library, onAdd, onShow, onVideo }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 150 * 1024 * 1024)
        throw Error("בחרו קובץ עד 150MB. לקובץ גדול יותר אפשר להשתמש בקישור.");
      const id = crypto.randomUUID();
      await saveFile({ id, blob: file });
      const kind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : file.type === "application/pdf" ||
                file.name.toLowerCase().endsWith(".pdf")
              ? "pdf"
              : "other";
      onAdd({ id, name: file.name, kind });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  return (
    <div className="modal-body">
      <p className="muted">
        טוענים תוכן לספרייה, ואז בוחרים מה להציג. קבצים נשמרים בדפדפן הזה בלבד.
      </p>
      <label className="upload-zone">
        <Upload size={25} />
        <strong>{busy ? "מעלים…" : "העלאת קובץ"}</strong>
        <span>תמונות · PDF · וידאו · אודיו · עד 150MB</span>
        <input
          aria-label="העלאת מדיה"
          type="file"
          disabled={busy}
          onChange={upload}
        />
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const clean = siteUrl(url);
            onAdd({
              id: crypto.randomUUID(),
              name: new URL(clean).hostname,
              url: clean,
              kind: "site",
            });
            setUrl("");
            setError("");
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <label className="field">
          קישור לאתר או YouTube
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            dir="ltr"
          />
        </label>
        <button className="secondary">
          <Plus size={16} /> הוספת קישור
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="embed-note">
        אתרים וסרטונים מסוימים חוסמים הצגה בתוך חלון. אפשר לפתוח אותם בלשונית.
        הפעלה, עצירה וגלילה בתוך תוכן מוטמע נעשות בכל חלון בנפרד.
      </p>
      <div className="media-library">
        {library.map((m) => (
          <div key={m.id}>
            <strong>{m.name}</strong>
            <div>
              <button className="primary" onClick={() => onShow(m)}>
                הצג לכיתה
              </button>
              {m.url && (
                <>
                  <button className="secondary" onClick={() => onVideo(m)}>
                    חלון נוסף
                  </button>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`פתיחת ${m.name} בלשונית`}
                  >
                    <ExternalLink size={17} />
                  </a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
