import React, { useEffect, useRef } from "react";
import { BrandMark } from "./Brand";
import { ClassModeBadge } from "./teaching";

const duration = (value) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(value % 60)
    .toString()
    .padStart(2, "0")}`;

export function ProjectionHud({ data, now, remaining }) {
  const stages = data.stages?.length ? data.stages : [data.stage];
  const current = data.stageIndex ?? 0;
  const planRef = useRef(null);
  useEffect(() => {
    const list = planRef.current;
    if (!list) return;
    const follow = () =>
      list
        .querySelector('[aria-current="step"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(list);
    return () => observer.disconnect();
  }, [current, data.ended]);
  const wallClock = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(now));
  const elapsed = Number.isFinite(data.started)
    ? duration(
        Math.max(0, Math.floor(((data.endedAt || now) - data.started) / 1000)),
      )
    : "—";
  return (
    <>
      <header className="projector-hud">
        <div className="projection-brand">
          <BrandMark />
          <strong>קלי קלוח</strong>
        </div>
        <div className="projection-clocks" aria-label="שעוני השיעור">
          <div>
            <small>שעה בישראל</small>
            <time
              className="mono"
              dateTime={new Date(now).toISOString()}
              aria-label="שעה נוכחית"
            >
              {wallClock}
            </time>
          </div>
          <div>
            <small>זמן לשלב</small>
            <span
              className={`mono ${remaining === 0 && !data.ended ? "projection-timer-ended" : ""}`}
              aria-label="זמן שנותר לשלב"
            >
              {duration(remaining)}
            </span>
          </div>
          <div>
            <small>זמן שיעור</small>
            <span className="mono" aria-label="זמן מתחילת השיעור">
              {elapsed}
            </span>
          </div>
        </div>
        <div className="projection-mode">
          {!data.ended && data.classMode ? (
            <ClassModeBadge mode={data.classMode} />
          ) : (
            <div className="projection-mode-placeholder">
              <small>מצב כיתה</small>
              <strong>{data.ended ? "השיעור הסתיים" : "טרם נבחר"}</strong>
            </div>
          )}
        </div>
      </header>
      <nav className="projector-lesson-plan" aria-label="מהלך השיעור המוקרן">
        <span className="projection-plan-label">מהלך השיעור</span>
        <ol ref={planRef}>
          {stages.map((stage, index) => (
            <li
              key={stage.id || index}
              aria-current={
                !data.ended && index === current ? "step" : undefined
              }
              className={index < current ? "completed" : ""}
            >
              <span aria-hidden="true">
                {index < current ? "✓" : index + 1}
              </span>
              <span>{stage.name}</span>
              {index === current && !data.ended && <small>עכשיו</small>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
