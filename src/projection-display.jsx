import React, { useEffect, useState } from "react";
const defaults = { size: "medium", focused: false };
export function useProjectionDisplay(classId) {
  const key = `beyachad-projection-display-${classId}`;
  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return {
        size: ["small", "medium", "large"].includes(value?.size)
          ? value.size
          : "medium",
        focused: value?.focused === true,
      };
    } catch {
      return defaults;
    }
  };
  const [display, setDisplay] = useState(read);
  useEffect(() => {
    const refresh = (event) => {
      if (event.key === key) setDisplay(read());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [key]);
  function change(patch) {
    const next = { ...read(), ...patch };
    localStorage.setItem(key, JSON.stringify(next));
    setDisplay(next);
  }
  return [display, change];
}
export function ProjectionDisplayControls({ display, onChange }) {
  return (
    <div
      className="projection-display-controls"
      aria-label="הגדרות קריאות בהקרנה"
    >
      <label>
        גודל לוח התלמידים בהקרנה
        <select
          aria-label="גודל לוח התלמידים בהקרנה"
          value={display.size}
          onChange={(e) => onChange({ size: e.target.value })}
        >
          <option value="small">קטן</option>
          <option value="medium">בינוני</option>
          <option value="large">גדול</option>
        </select>
      </label>
      <button
        className="secondary"
        aria-pressed={display.focused}
        onClick={() => onChange({ focused: !display.focused })}
      >
        {display.focused ? "חזרה למצגת ולתלמידים" : "התמקדות בתלמידים"}
      </button>
    </div>
  );
}
