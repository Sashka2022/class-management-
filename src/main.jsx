import { schoolYear } from "../shared/schoolPolicy";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sprout,
  MessageSquareQuote,
  LayoutDashboard,
  BookOpen,
  Users,
  Shapes,
  Files,
  Heart,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  Maximize2,
  Monitor,
  Smartphone,
  X,
  Check,
  Clock3,
  MoreHorizontal,
  ArrowLeft,
  Undo2,
  Search,
  Shuffle,
  Copy,
  Trash2,
  GripVertical,
  Flag,
  Wifi,
  Info,
  Pencil,
  CheckCircle2,
  Sun,
  Leaf,
  Droplets,
  Wind,
  RotateCcw,
  LogOut,
  Presentation,
} from "lucide-react";
import "./style.css";
import { useCloudArchive, ArchiveStatus, ReportPanel } from "./school";
import {
  HatGuide,
  HatDisplay,
  GroupHatControls,
  StudentHatSelect,
  syncProjectedHats,
  setThinkingHatsEnabled,
  assignGroupHats,
} from "./thinkingHats";
import {
  RoleGuide,
  RoleControls,
  ProjectedMembers,
  snapshotGroups,
  assignGroupRoles,
} from "./groupRoles";
import { ClassModeBadge, ModePicker, QuoteBook, QuoteSlide } from "./teaching";
import { usePairing, PairPanel, JoinDevice } from "./pairing";
import { DayPlan, Templates, stagesFor } from "./planning";
import { MediaFrame, MediaPicker, StatusBoard } from "./content";
import { Login, Admin } from "./access";
import { PartnerLogos } from "./PartnerLogos";
import { Mascot } from "./Mascot";
import { Brand, BrandMark } from "./Brand";
import { prepareFeedbackSound } from "./feedbackSound";
import {
  LEGACY_KEY,
  SESSION_KEY,
  classrooms,
  classLabel,
  classKey,
  projectionKey,
  storedClass,
  currentHearts,
  archiveLesson,
} from "./classrooms";

const KEY = LEGACY_KEY,
  PUBLIC = `${KEY}-projection`;
const names = [
  "איתי לוי",
  "אמה כהן",
  "אורי מזרחי",
  "אלה ברק",
  "אלון רז",
  "דניאל גולן",
  "הילה רון",
  "יובל הדר",
  "יעל שחר",
  "ליאם פרץ",
  "מאי שפירא",
  "מיה דוד",
  "נועם לוי",
  "נויה אור",
  "עומר כהן",
  "עמית שרון",
  "רוני לב",
  "רועי אברהם",
  "שירה ארז",
  "תום סלע",
  "תמר גפן",
  "אדם שלו",
  "אביגיל חן",
  "גיא שמש",
];
const avatars = [
  "🐻",
  "🦊",
  "🐼",
  "🐰",
  "🦁",
  "🐨",
  "🐯",
  "🐸",
  "🦋",
  "🐧",
  "🐱",
  "🐶",
];
function initial() {
  return {
    demo: true,
    students: names.map((name, i) => ({
      id: `s${i}`,
      name,
      emoji: avatars[i % avatars.length],
      present: i < 22,
      late: false,
      hearts: 0,
      warning: 0,
      warningCount: 0,
    })),
    stages: [
      {
        id: "a",
        name: "נכנסים לאווירה",
        minutes: 5,
        instruction: "מה כבר יודעים על צמחים?",
        equipment: "מחברת ועיפרון",
      },
      {
        id: "b",
        name: "מגלים יחד",
        minutes: 12,
        instruction: "מתבוננים, שואלים ומגלים מה צמח צריך כדי לגדול.",
        equipment: "מחברת ועיפרון",
      },
      {
        id: "c",
        name: "צומחים בקבוצות",
        minutes: 15,
        instruction: "תכננו ניסוי: מה יקרה לצמח בלי אור?",
        equipment: "דף עבודה וצבעים",
      },
      {
        id: "d",
        name: "משתפים בתגליות",
        minutes: 8,
        instruction: "כל קבוצה משתפת בתגלית אחת.",
        equipment: "",
      },
      {
        id: "e",
        name: "מחשבה לדרך",
        minutes: 5,
        instruction: "מה גיליתי היום שלא ידעתי קודם?",
        equipment: "פתק קטן",
      },
    ],
    stage: 1,
    slide: 0,
    projection: { type: "slides" },
    groups: [],
    groupRoles: {},
    autoAssignRoles: false,
    studentHats: {},
    thinkingHatsEnabled: false,
    autoAssignHats: false,
    library: [
      { id: "demo-slides", kind: "demo-slides", name: "מצגת כיתת דמה" },
    ],
    video: null,
    classMode: null,
    quotes: [],
    timer: { remaining: 720, end: null },
    started: Date.now(),
    ended: false,
    endedAt: null,
    summary: "",
    lessonId: crypto.randomUUID(),
    lessons: [],
    lessonHearts: 0,
  };
}
function read(key = KEY, demo = true) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (!stored) return freshClass(demo);
    stored.demo = demo;
    stored.thinkingHatsEnabled ??= false;
    if (!stored.thinkingHatsEnabled) setThinkingHatsEnabled(stored, false);
    stored.students.forEach((p) => {
      p.warningCount ??= p.warning || 0;
    });
    stored.lessons = (stored.lessons || []).filter(
      (l) => (l.expiresAt || schoolYear(l.endedAt).expiresAt) > Date.now(),
    );
    if (schoolYear(stored.started).expiresAt <= Date.now()) {
      stored.lessonHearts = 0;
      stored.students.forEach((p) => {
        p.hearts = 0;
        p.warning = 0;
        p.warningCount = 0;
      });
    }
    if (demo) {
      stored.library ||= [];
      if (!stored.library.some((m) => m.kind === "demo-slides"))
        stored.library.unshift({
          id: "demo-slides",
          kind: "demo-slides",
          name: "מצגת כיתת דמה",
        });
    } else if (stored.projection?.type === "slides")
      stored.projection = { type: "blank" };
    return stored;
  } catch {
    return freshClass(demo);
  }
}
function freshClass(demo) {
  const s = initial();
  if (!demo) {
    s.demo = false;
    s.students = [];
    s.library = [];
    s.stages = [
      {
        id: crypto.randomUUID(),
        name: "תחילת שיעור",
        minutes: 45,
        instruction: "",
        equipment: "",
      },
    ];
    s.stage = 0;
    s.projection = { type: "blank" };
    s.timer = { remaining: 2700, end: null };
  }
  return s;
}
function seconds(timer) {
  return Math.max(
    0,
    timer.end ? Math.ceil((timer.end - Date.now()) / 1000) : timer.remaining,
  );
}
function clock(n) {
  return `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
}
function publish(s, key = PUBLIC) {
  const data = {
    projection: s.projection,
    demo: s.demo,
    slide: s.slide,
    timer: s.timer,
    stage: { name: s.stages[s.stage].name },
    ended: s.ended,
    video: s.video,
    classMode: s.classMode,
    students: s.students.map(
      ({ id, name, emoji, present, hearts, warning }) => ({
        id,
        name,
        emoji,
        present,
        hearts,
        warning,
      }),
    ),
  };
  localStorage.setItem(key, JSON.stringify(data));
}
function rememberMedia(s, media) {
  const list = s.library || [];
  s.library = list.some((item) => item.id === media.id)
    ? list.map((item) => (item.id === media.id ? media : item))
    : [...list, media];
}
function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button className="icon-btn" aria-label={label} title={label} {...props}>
      <Icon size={19} />
    </button>
  );
}
function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    const old = document.activeElement;
    const timer = setTimeout(
      () => document.querySelector(".modal button")?.focus(),
      0,
    );
    return () => {
      document.removeEventListener("keydown", h);
      clearTimeout(timer);
      old?.focus();
    };
  }, []);
  return (
    <div className="backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const els = [
              ...e.currentTarget.querySelectorAll(
                'button,input,textarea,select,[tabindex="0"]',
              ),
            ].filter((el) => !el.disabled);
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <IconButton icon={X} label="סגירה" onClick={onClose} />
        </header>
        {children}
      </section>
    </div>
  );
}
const slideTitles = [
  "מה צמחים צריכים כדי לגדול?",
  "כל צמח מתחיל בזרע קטן",
  "בואו נחשוב כמו חוקרים",
  "מה גילינו היום?",
];
function PlantArt() {
  return (
    <svg
      className="plant-art"
      viewBox="0 0 360 310"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="187" cy="287" rx="109" ry="12" fill="#dce4cf" />
      <circle cx="171" cy="137" r="113" fill="#e7eddb" />
      <circle cx="290" cy="57" r="25" fill="#efcf75" />
      <g stroke="#dcc58b" strokeWidth="2" strokeLinecap="round">
        <path d="M290 17v-8M290 105v-8M330 57h8M242 57h8M319 28l6-6M255 93l6-6M319 86l6 6M255 22l6 6" />
      </g>
      <path
        d="M177 227c-3-40 10-84 10-130"
        stroke="#527a4d"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M185 153c-46 1-76-28-75-65 42-5 79 20 75 65Z" fill="#73936b" />
      <path d="M188 119c42 1 69-27 68-61-40-4-72 20-68 61Z" fill="#a3b78a" />
      <path d="M179 194c37 1 66-21 67-54-36-6-67 17-67 54Z" fill="#66865c" />
      <path
        d="m122 100 61 49M246 70l-56 46M234 151l-51 39"
        stroke="#d4dfbd"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M125 222h109l-15 56c-2 8-13 12-39 12s-37-4-39-12l-16-56Z"
        fill="#c48a65"
      />
      <rect x="119" y="212" width="121" height="19" rx="6" fill="#d9a17b" />
      <path
        d="M146 238l7 33"
        stroke="#e8b58f"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M74 183c0-12 15-27 15-27s15 15 15 27a15 15 0 0 1-30 0Z"
        fill="#a4c5cf"
      />
      <path
        d="m283 204 5 8 9 2-6 7 1 9-9-4-8 4 1-9-6-7 9-2 4-8Z"
        fill="#e2b96c"
      />
      <path
        d="M66 87c8 2 11 8 10 15M66 87c-1 8-6 12-13 12"
        stroke="#a8b89c"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Slide({ index = 0 }) {
  return (
    <div className="slide">
      <div className="slide-copy">
        <span className="slide-tag">
          <Leaf size={12} /> חוקרים את הטבע
        </span>
        <h2>{slideTitles[index]}</h2>
        <p>
          {
            [
              "אור, מים, אדמה… ומה עוד?\nיוצאים למסע קטן של גילויים גדולים.",
              "בתוך כל זרע מסתתרת התחלה חדשה.\nמה לדעתכם יעזור לו לצמוח?",
              "מה יקרה אם נשנה רק דבר אחד?\nמעלים השערה ומתכננים ניסוי.",
              "משתפים בתגלית אחת חדשה,\nולוקחים איתנו שאלה להמשך.",
            ][index]
          }
        </p>
        <div className="slide-items">
          <span>
            <Sun size={18} /> אור
          </span>
          <span>
            <Droplets size={18} /> מים
          </span>
          <span>
            <Wind size={18} /> אוויר
          </span>
        </div>
      </div>
      <PlantArt />
      <div className="slide-footer">
        <span>מצגת כיתת דמה · מדעים</span>
        <span>{String(index + 1).padStart(2, "0")} / 04</span>
      </div>
    </div>
  );
}
function ProjectedContent({ data }) {
  if (data.ended)
    return (
      <div className="activity end-slide">
        <Mascot variant="celebration" />
        <h2>עוד יום של צמיחה, ביחד.</h2>
        <p>תודה על הסקרנות ועל כל הרעיונות. נתראה בשיעור הבא!</p>
      </div>
    );
  const type = data.projection.type;
  if (type === "quote") return <QuoteSlide quote={data.projection.quote} />;
  if (type === "day")
    return (
      <div className="activity projected-day">
        <h2>סדר היום שלנו</h2>
        <p>{data.projection.date}</p>
        <div>
          {data.projection.rows.map((r) => (
            <div key={r.id}>
              <strong>{r.time}</strong>
              <span>{r.title}</span>
              <small>{r.note}</small>
            </div>
          ))}
        </div>
      </div>
    );
  if (type === "media") return <MediaFrame media={data.projection.media} />;
  if (type === "blank" || (type === "slides" && data.demo === false))
    return (
      <div className="activity empty-class-content">
        <BookOpen size={42} />
        <h2>כאן יופיע התוכן של הכיתה</h2>
        <p>בחרו „תוכן, קבצים וקישורים” כדי להעלות חומר או להקליד טקסט.</p>
      </div>
    );
  if (type === "slides") return <Slide index={data.slide} />;
  if (type === "groups")
    return (
      <div className="activity">
        <span className="eyebrow">לומדים טוב יותר ביחד</span>
        <h2>הקבוצות שלנו</h2>
        <div className="projected-groups">
          {(data.projection.groups || []).map((g) => (
            <div key={g.id}>
              <h3>
                {g.emoji} {g.name}
              </h3>
              <HatDisplay config={g.thinkingHat} />
              <ProjectedMembers members={g.members} />
            </div>
          ))}
        </div>
      </div>
    );
  if (type === "heart")
    return (
      <div className="activity">
        <Heart size={68} fill="#d78e78" color="#d78e78" />
        <h2>כל הכבוד, {data.projection.name}!</h2>
        <p>עוד רגע של צמיחה 🌱</p>
      </div>
    );
  return (
    <div className="activity">
      <span className="eyebrow">
        {type === "entry"
          ? "מתחילים ברגל ימין"
          : type === "exit"
            ? "מחשבה קטנה לדרך"
            : "המשימה שלנו"}
      </span>
      <h2>
        {type === "entry"
          ? "בוקר טוב, חוקרים צעירים!"
          : type === "exit"
            ? "מה גיליתי היום שלא ידעתי קודם?"
            : data.projection.instruction}
      </h2>
      <p>
        {type === "entry"
          ? "הכינו מחברת ועיפרון. ציירו צמח שאתם אוהבים."
          : type === "exit"
            ? "אפשר לשתף בעל־פה, במחברת או על פתק."
            : `ציוד: ${data.projection.equipment || "רק הסקרנות שלכם"}`}
      </p>
      <div className="activity-flower">✳</div>
    </div>
  );
}
function Projector({ classId }) {
  const PUBLIC = projectionKey(classId);
  const get = () => {
    try {
      const data = JSON.parse(localStorage.getItem(PUBLIC));
      return data
        ? { ...data, demo: !!classrooms().find((c) => c.id === classId)?.demo }
        : null;
    } catch {
      return null;
    }
  };
  const [data, setData] = useState(get),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const h = (e) => {
      if (e.key === PUBLIC) setData(get());
    };
    window.addEventListener("storage", h);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("storage", h);
      clearInterval(t);
    };
  }, []);
  return (
    <main className="projector-page">
      {data ? (
        <>
          <div className="projection-top">
            <span>
              <BrandMark /> קלי קלוח
            </span>
            <span>{data.ended ? "להתראות בשיעור הבא" : data.stage.name}</span>
            <span className="mono">{clock(seconds(data.timer))}</span>
          </div>
          <div
            className={`projector-content ${data.video ? "with-video" : ""}`}
          >
            <ProjectedContent data={data} />
            {data.video && <MediaFrame media={data.video} />}
            {!data.ended && <ClassModeBadge mode={data.classMode} />}
          </div>
          <StatusBoard students={data.students} />
          {!data.ended && seconds(data.timer) === 0 && (
            <p className="time-finished">הזמן הסתיים · מחכים להנחיית המחנכת</p>
          )}
        </>
      ) : (
        <div className="activity">
          <Sprout size={60} />
          <h2>מחכים לשיעור שלנו</h2>
          <p>פתחו את מסך המחנכת באותו דפדפן כדי להתחיל.</p>
        </div>
      )}
      <IconButton
        icon={Maximize2}
        label="מסך מלא"
        onClick={() =>
          document.fullscreenElement
            ? document.exitFullscreen()
            : document.documentElement.requestFullscreen()
        }
      />
    </main>
  );
}

function App({ classroom, onLogout }) {
  const KEY = classKey(classroom.id),
    PUBLIC = projectionKey(classroom.id);
  const readCurrent = () => read(KEY, classroom.id === "g2");
  const [state, setState] = useState(readCurrent),
    [now, setNow] = useState(Date.now()),
    [page, setPage] = useState("lesson"),
    [drawer, setDrawer] = useState("stages"),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [query, setQuery] = useState(""),
    [groupCount, setGroupCount] = useState(4),
    [rosterText, setRosterText] = useState(""),
    [phaseForm, setPhaseForm] = useState(null),
    [summary, setSummary] = useState("");
  function applyPaired(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
    publish(next, PUBLIC);
    setState(next);
  }
  const pair = usePairing(classroom, state, applyPaired);
  const remote = new URLSearchParams(location.search).get("view") === "remote";
  const cloud = useCloudArchive({
    classroom,
    state,
    update,
    onRoster: (rows) => {
      const next = structuredClone(readCurrent());
      const old = new Map(next.students.map((p) => [p.id, p]));
      next.students = rows.map((p) => ({
        ...old.get(p.id),
        ...p,
        present: old.get(p.id)?.present ?? true,
        late: old.get(p.id)?.late ?? false,
        hearts: old.get(p.id)?.hearts ?? 0,
        warning: old.get(p.id)?.warning ?? 0,
        warningCount: old.get(p.id)?.warningCount ?? 0,
      }));
      applyPaired(next);
    },
  });
  useEffect(() => {
    publish(state, PUBLIC);
    localStorage.setItem(KEY, JSON.stringify(state));
    const h = (e) => {
      if (e.key === KEY) setState(readCurrent());
    };
    window.addEventListener("storage", h);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.removeEventListener("storage", h);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  function update(fn, message, undo = false) {
    if (pair.connection) {
      return pair
        .mutate(fn)
        .then(({ previous, next }) => {
          if (message)
            setToast({
              message,
              previous: undo ? previous : null,
              after: undo ? next : null,
            });
          return { previous, next };
        })
        .catch((e) => {
          setToast({ message: e.message });
          return null;
        });
    }

    const previous = readCurrent();
    const next = structuredClone(previous);
    fn(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    publish(next, PUBLIC);
    setState(next);
    if (message)
      setToast({
        message,
        previous: undo ? previous : null,
        after: undo ? next : null,
      });
    return Promise.resolve({ previous, next });
  }
  function project(type, extra = {}) {
    update((s) => {
      if (type === "media" && extra.media?.kind === "text")
        rememberMedia(s, extra.media);
      if (type === "media" && extra.media?.kind !== "text")
        s.lastPresentation = { type: "media", media: extra.media };
      s.projection =
        type === "slides"
          ? s.lastPresentation || { type: s.demo ? "slides" : "blank" }
          : { type, ...extra };
      if (type === "task") {
        s.projection.instruction = s.stages[s.stage].instruction;
        s.projection.equipment = s.stages[s.stage].equipment;
      }
      if (type === "groups") {
        s.projection.groups = snapshotGroups(
          s.groups,
          s.students,
          s.groupRoles,
          s.studentHats,
          !!s.thinkingHatsEnabled,
        );
      }
    }, "התוכן עודכן במסך ההקרנה");
  }
  function showGroups() {
    if (!state.groups.some((g) => g.ids.length)) {
      setToast({ message: "צרו חלוקה ושבצו תלמידים לפני ההקרנה." });
      if (page !== "groups" && modal?.type !== "groups")
        setModal({ type: "groups" });
      return;
    }
    project("groups");
    setModal(null);
  }
  function navigateSlide(delta) {
    if (!state.demo) return;
    update((s) => {
      s.lastPresentation = null;
      s.slide = Math.max(0, Math.min(3, s.slide + delta));
      s.projection = { type: "slides" };
    });
  }
  function toggleTimer() {
    update((s) => {
      const n = seconds(s.timer);
      s.timer = s.timer.end
        ? { remaining: n, end: null }
        : {
            remaining: n || s.stages[s.stage].minutes * 60,
            end: Date.now() + (n || s.stages[s.stage].minutes * 60) * 1000,
          };
    });
  }
  function selectStage(i) {
    update((s) => {
      s.stage = i;
      s.timer = { remaining: s.stages[i].minutes * 60, end: null };
    }, "השלב עודכן. הטיימר מוכן להתחלה");
  }
  function heart(id) {
    if (!state.students.some((p) => p.id === id)) return;
    const play = prepareFeedbackSound("heart");
    update(
      (s) => {
        s.lessonHearts = currentHearts(s) + 1;
        s.students.find((p) => p.id === id).hearts++;
      },
      "נוסף לב של עידוד",
      true,
    ).then((result) => {
      if (result && currentHearts(result.next) > currentHearts(result.previous))
        play();
    });
  }
  function warn(id) {
    const student = state.students.find((p) => p.id === id);
    if (!student) return;
    if (student.warning >= 2) {
      setModal({ type: "student", id, response: true });
      return;
    }
    const play = prepareFeedbackSound("warning");
    update(
      (s) => {
        const current = s.students.find((p) => p.id === id);
        const before = current.warning;
        current.warning = Math.min(2, current.warning + 1);
        current.warningCount =
          (current.warningCount ?? before) + (current.warning - before);
      },
      "האזהרה עודכנה גם בכיתה",
      true,
    ).then((result) => {
      if (!result) return;
      const before = result.previous.students.find((p) => p.id === id);
      const after = result.next.students.find((p) => p.id === id);
      if (after && before && after.warning > before.warning) play();
    });
  }
  function attendance(id) {
    update(
      (s) => {
        const p = s.students.find((p) => p.id === id);
        p.present = !p.present;
        p.late = p.present;
      },
      "הנוכחות עודכנה",
      true,
    );
  }
  function generateGroups() {
    update((s) => {
      s.studentHats = {};
      const ids = s.students.filter((p) => p.present).map((p) => p.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const count = Math.min(groupCount, ids.length);
      s.groups = Array.from({ length: count }, (_, i) => ({
        id: `g${i}`,
        name: [
          "הניצנים",
          "החוקרים",
          "השורשים",
          "העלים",
          "הפרחים",
          "הזרעים",
          "הענפים",
          "הפירות",
        ][i],
        emoji: ["🌱", "🔍", "🌳", "🍃", "🌸", "🌰", "🌿", "🍎"][i],
        ids: ids.filter((_, n) => n % count === i),
      }));
      if (s.autoAssignRoles)
        s.groupRoles = assignGroupRoles(s.groups, s.groupRoles);
      if (s.thinkingHatsEnabled && s.autoAssignHats) assignGroupHats(s);
    }, "החלוקה מוכנה לבדיקה — עדיין לא הוקרנה");
  }
  const active = state.stages[state.stage],
    left = seconds(state.timer),
    present = state.students.filter((p) => p.present).length,
    hearts = currentHearts(state),
    elapsed = Math.floor(((state.endedAt || now) - state.started) / 60000),
    total = state.stages.reduce((n, p) => n + p.minutes, 0);
  const projectionData = {
    ...state,
    stage: active,
    groups: state.groups.map((g) => ({
      ...g,
      members: g.ids
        .map((id) => state.students.find((p) => p.id === id))
        .filter(Boolean),
    })),
  };
  function studentList(full = false) {
    return (
      <div className={`student-list ${full ? "full" : ""}`}>
        {state.students
          .filter((p) => p.name.includes(query))
          .map((p, i) => (
            <div
              className={`student-row ${!p.present ? "absent" : ""}`}
              key={p.id}
            >
              <button
                className={`animal animal-${i % 4}`}
                onClick={() => setModal({ type: "student", id: p.id })}
                aria-label={`פרטי ${p.name}`}
              >
                {p.emoji}
              </button>
              <button
                className="student-name"
                onClick={() => setModal({ type: "student", id: p.id })}
              >
                <strong>{p.name}</strong>
                <small>
                  {!p.present
                    ? "חסר/ה"
                    : p.late
                      ? "הגיע/ה באיחור"
                      : p.warning
                        ? `אזהרה ${p.warning === 1 ? "ראשונה" : "שנייה"}`
                        : "כאן, איתנו"}
                </small>
              </button>
              <button
                className="heart-btn"
                aria-label={`לב ל${p.name}`}
                onClick={() => heart(p.id)}
              >
                <Heart size={17} fill={p.hearts ? "currentColor" : "none"} />
                <span>{p.hearts || ""}</span>
              </button>
              <button
                className={`quick-warning level-${p.warning || 0}`}
                aria-label={`אזהרה מהירה ל${p.name}, ${p.warning === 0 ? "ללא אזהרה" : p.warning === 1 ? "אזהרה ראשונה" : "אזהרה שנייה"}`}
                title={
                  p.warning >= 2
                    ? "אירוע נוסף — בחירת תגובה"
                    : `הוספת אזהרה ל${p.name}`
                }
                onClick={() => warn(p.id)}
              >
                <Flag size={17} />
                <span>{p.warning || 0}</span>
              </button>
              <button
                className={`attendance ${p.present ? "yes" : ""}`}
                aria-label={`${p.present ? "סימון היעדרות" : "סימון נוכחות"}: ${p.name}`}
                onClick={() => attendance(p.id)}
              >
                {p.present ? <Check size={14} /> : <span>—</span>}
              </button>
            </div>
          ))}
      </div>
    );
  }
  function groupsPanel() {
    const unpublished =
      state.projection.type === "groups" &&
      JSON.stringify(
        snapshotGroups(
          state.groups,
          state.students,
          state.groupRoles,
          state.studentHats,
          !!state.thinkingHatsEnabled,
        ),
      ) !== JSON.stringify(state.projection.groups);
    return (
      <>
        <div className="section-heading">
          <div>
            <span className="eyebrow">לכל אחד יש מקום</span>
            <h2>צומחים בקבוצות</h2>
          </div>
          {state.groups.length ? (
            <Mascot variant="curious" />
          ) : (
            <Shapes size={28} />
          )}
        </div>
        <p className="muted">
          חלוקה אקראית של {present} התלמידים הנוכחים. בודקים, משנים ורק אז
          מקרינים.
        </p>
        <button className="primary group-project-action" onClick={showGroups}>
          <Monitor size={17} /> הקרנת קבוצות
        </button>
        <p className="muted">
          החלוקה תוצג בחלון ההקרנה עם שמות התלמידים, התפקידים והאייקונים. אפשר
          לחזור למצגת מאותו שקף.
        </p>
        {unpublished && (
          <div className="group-changes" role="status">
            <p>יש שינויים בקבוצות או בתפקידים שעדיין לא הוקרנו.</p>
            <button className="primary" onClick={showGroups}>
              עדכון הקבוצות והתפקידים בהקרנה
            </button>
          </div>
        )}
        <RoleGuide />
        <label className="auto-role-option">
          <input
            type="checkbox"
            checked={!!state.thinkingHatsEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              update((s) => setThinkingHatsEnabled(s, enabled));
            }}
          />
          הפעלת כובעי החשיבה של דה בונו
        </label>
        {state.thinkingHatsEnabled && (
          <>
            <HatGuide />
            <p className="muted">
              בחרו כובע ידנית לכל קבוצה או לתלמיד, או חלקו כובעים אוטומטית.
              בחלוקה אוטומטית כל קבוצה מקבלת כובע משותף במקום הבחירות הקודמות.
              כשהקבוצות מוקרנות, שינויי כובעים מתעדכנים מיד בהקרנה.
            </p>
            <label className="auto-role-option">
              <input
                type="checkbox"
                checked={!!state.autoAssignHats}
                onChange={(e) => {
                  const automatic = e.target.checked;
                  update((s) => {
                    s.autoAssignHats = automatic;
                  });
                }}
              />
              כובעים אוטומטיים בחלוקה חדשה
            </label>
            <button
              className="secondary"
              disabled={!state.groups.some((g) => g.ids.length)}
              onClick={() =>
                update((s) => {
                  assignGroupHats(s);
                  syncProjectedHats(s);
                }, "כובעי החשיבה חולקו לקבוצות")
              }
            >
              <Shuffle size={16} /> חלוקת כובעים אוטומטית
            </button>
          </>
        )}
        <label className="auto-role-option">
          <input
            type="checkbox"
            checked={!!state.autoAssignRoles}
            onChange={(e) =>
              update((s) => {
                s.autoAssignRoles = e.target.checked;
              })
            }
          />
          חלוקת תפקידים אוטומטית
        </label>
        <p className="muted">
          בחלוקה חדשה יוקצה לכל תלמיד תפקיד באופן אקראי ומאוזן בתוך הקבוצה,
          במקום התפקיד הקודם. בקבוצה גדולה כמה תלמידים יקבלו אותו תפקיד. אפשר
          לשנות ידנית לפני ההקרנה.
        </p>
        <div className="group-controls">
          <label>
            מספר קבוצות{" "}
            <select
              aria-label="מספר קבוצות"
              value={groupCount}
              onChange={(e) => setGroupCount(+e.target.value)}
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={!present}
            onClick={generateGroups}
          >
            <Shuffle size={17} /> חלוקה חדשה
          </button>
        </div>
        <button
          className="secondary"
          onClick={() =>
            update((s) => {
              s.groups.push({
                id: crypto.randomUUID(),
                name: `קבוצה ${s.groups.length + 1}`,
                emoji: "⭐",
                ids: [],
              });
            }, "נוספה קבוצה ידנית")
          }
        >
          <Plus size={16} /> קבוצה ידנית חדשה
        </button>
        <div className="unassigned">
          <h3>תלמידים שטרם שובצו</h3>
          {state.students
            .filter((p) => !state.groups.some((g) => g.ids.includes(p.id)))
            .map((p) => (
              <label key={p.id}>
                {p.emoji} {p.name}
                {!p.present ? " · חסר/ה" : ""}
                <select
                  aria-label={`שיבוץ ${p.name}`}
                  value=""
                  onChange={(e) =>
                    update((s) => {
                      s.groups.forEach(
                        (g) => (g.ids = g.ids.filter((id) => id !== p.id)),
                      );
                      s.groups
                        .find((g) => g.id === e.target.value)
                        .ids.push(p.id);
                    }, "התלמיד שובץ בקבוצה")
                  }
                >
                  <option value="">בחירת קבוצה</option>
                  {state.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
        </div>
        {state.groups.length ? (
          <>
            <div className="groups-grid">
              {state.groups.map((g) => (
                <div className="group-card" key={g.id}>
                  <label className="field">
                    שם הקבוצה
                    <input
                      aria-label={`שם קבוצה ${g.id}`}
                      value={g.name}
                      onChange={(e) =>
                        update(
                          (s) =>
                            (s.groups.find((x) => x.id === g.id).name =
                              e.target.value),
                        )
                      }
                    />
                  </label>
                  <button
                    className="text-button danger"
                    onClick={() =>
                      update((s) => {
                        s.groups = s.groups.filter((x) => x.id !== g.id);
                      }, "הקבוצה נמחקה; התלמידים זמינים לשיבוץ")
                    }
                  >
                    מחיקת קבוצה
                  </button>
                  <h3>
                    {g.emoji} {g.name}
                    <small>{g.ids.length}</small>
                  </h3>
                  {state.thinkingHatsEnabled && (
                    <GroupHatControls
                      group={g}
                      onChange={(fn, shared = false) =>
                        update((s) => {
                          const group = s.groups.find((x) => x.id === g.id);
                          if (!group) return;
                          fn(group);
                          if (shared) {
                            s.studentHats ||= {};
                            group.ids.forEach((id) => delete s.studentHats[id]);
                          }
                          syncProjectedHats(s);
                        }, "כובע החשיבה עודכן")
                      }
                    />
                  )}
                  {g.ids.map((id) => {
                    const p = state.students.find((p) => p.id === id);
                    return (
                      p && (
                        <div className="group-member" key={id}>
                          <span>
                            {p.emoji} {p.name}
                            {!p.present && <small> · חסר/ה</small>}
                          </span>
                          <div className="group-member-controls">
                            <RoleControls
                              student={p}
                              assignment={state.groupRoles?.[p.id]}
                              onChange={(assignment) =>
                                update((s) => {
                                  s.groupRoles ||= {};
                                  if (assignment)
                                    s.groupRoles[p.id] = assignment;
                                  else delete s.groupRoles[p.id];
                                }, "התפקיד עודכן בטיוטה. להצגה בכיתה בחרו „הצג קבוצות לכיתה”.")
                              }
                            />
                            {state.thinkingHatsEnabled && (
                              <StudentHatSelect
                                student={p}
                                hatId={state.studentHats?.[p.id]}
                                onChange={(hatId) =>
                                  update((s) => {
                                    s.studentHats ||= {};
                                    if (hatId) s.studentHats[p.id] = hatId;
                                    else delete s.studentHats[p.id];
                                    syncProjectedHats(s);
                                  }, "כובע החשיבה האישי עודכן")
                                }
                              />
                            )}
                            <select
                              aria-label={`העברת ${p.name} לקבוצה`}
                              value={g.id}
                              onChange={(e) =>
                                update((s) => {
                                  s.groups.forEach(
                                    (x) =>
                                      (x.ids = x.ids.filter((v) => v !== id)),
                                  );
                                  if (e.target.value)
                                    s.groups
                                      .find((x) => x.id === e.target.value)
                                      .ids.push(id);
                                }, "התלמיד הועבר בטיוטה")
                              }
                            >
                              <option value="">ללא קבוצה</option>
                              {state.groups.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    );
                  })}
                </div>
              ))}
            </div>
            <button className="primary" onClick={showGroups}>
              <Monitor size={17} /> הצג קבוצות לכיתה
            </button>
          </>
        ) : (
          <div className="empty">
            <Mascot variant="empty" />
            <h3>רעיונות גדולים מתחילים ביחד</h3>
            <p>בחרו מספר קבוצות וצרו חלוקה ראשונה.</p>
          </div>
        )}
      </>
    );
  }
  function timerControl() {
    return (
      <div className={`timer-control ${left === 0 ? "expired" : ""}`}>
        <div>
          <span className="timer-label">זמן לשלב הנוכחי</span>
          <strong className="mono">{clock(left)}</strong>
        </div>
        <div className="timer-buttons">
          <button
            className="timer-play"
            aria-label={state.timer.end ? "השהיית טיימר" : "התחלת טיימר"}
            onClick={toggleTimer}
          >
            {state.timer.end ? (
              <Pause size={19} />
            ) : (
              <Play size={19} fill="currentColor" />
            )}
          </button>
          <button
            onClick={() =>
              update((s) => {
                if (s.timer.end) s.timer.end += 60000;
                else s.timer.remaining += 60;
              })
            }
          >
            דקה +
          </button>
          <IconButton
            icon={RotateCcw}
            label="איפוס טיימר"
            onClick={() =>
              update((s) => {
                s.timer = { remaining: active.minutes * 60, end: null };
              })
            }
          />
        </div>
        {left === 0 && <small>הזמן הסתיים. ממשיכים בקצב שלכם.</small>}
      </div>
    );
  }
  const nav = [
    ["home", LayoutDashboard, "המבט היומי"],
    ["lesson", BookOpen, "השיעור שלי"],
    ["class", Users, "הכיתה שלי"],
    ["groups", Shapes, "הקבוצות שלנו"],
    ["templates", Files, "תבניות שיעור"],
    ["reports", Files, "סיכומי תלמידים"],
    ["mode", Flag, "מצב כיתה"],
    ["quotes", MessageSquareQuote, "שווה ציטוט"],
  ];
  return (
    <div className={remote ? "app remote-app" : "app"}>
      {!remote && (
        <aside className="sidebar">
          <Brand />
          <button
            className="class-picker"
            onClick={onLogout}
            aria-label="החלפת כיתה"
          >
            <span className="class-mark">
              {classroom.demo ? "🌱" : classroom.name.slice(0, 2)}
            </span>
            <div>
              <strong>{classLabel(classroom)}</strong>
              <small>בית הספר שלנו</small>
            </div>
            <ChevronLeft size={16} />
          </button>
          <span className="nav-caption">המרחב שלך</span>
          <nav>
            {nav.map(([id, Icon, label]) => (
              <button
                key={id}
                className={
                  modal?.type === id ||
                  (!["mode", "quotes"].includes(modal?.type) && page === id)
                    ? "selected"
                    : ""
                }
                aria-label={
                  ["mode", "quotes"].includes(id)
                    ? `פתיחת ${label} מתפריט הצד`
                    : undefined
                }
                onClick={() => {
                  if (["mode", "quotes"].includes(id)) {
                    setModal({ type: id });
                    return;
                  }
                  setPage(id);
                  setQuery("");
                }}
              >
                <Icon size={20} />
                {label}
                {(modal?.type === id ||
                  (!["mode", "quotes"].includes(modal?.type) &&
                    page === id)) && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <Mascot variant="small" />
            <strong>גם צעד קטן הוא צמיחה.</strong>
            <p>
              יש לך מקום להשפיע,
              <br />
              בכל שיעור מחדש.
            </p>
          </div>
          <button
            className="sidebar-help"
            onClick={() => setModal({ type: "about" })}
          >
            <Info size={17} /> על קלי קלוח <ChevronLeft size={15} />
          </button>
          <div className="profile">
            <span className="profile-avatar">
              <Users size={17} />
            </span>
            <div>
              <strong>מורה · {classLabel(classroom)}</strong>
              <small>טוב שאת כאן</small>
            </div>
            <span className="online-dot" />
          </div>
        </aside>
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            המרחב שלי <ChevronLeft size={13} />{" "}
            <strong>
              {remote
                ? "קלי קלוח · השלט שלי"
                : nav.find((n) => n[0] === page)?.[2]}
            </strong>
          </div>
          <div className="top-actions">
            {pair.connection && (
              <span className="pair-state" role="status">
                {pair.error || pair.status}
              </span>
            )}
            <button className="logout-button" onClick={onLogout}>
              <LogOut size={15} /> יציאה
            </button>
            <span className="date">
              יום של הזדמנויות חדשות <Sun size={15} />
            </span>
            <button
              className="demo-badge"
              onClick={() => setModal({ type: "about" })}
            >
              {state.demo ? "כיתת דמה · נתוני הדגמה" : "קלי קלוח · מרחב הכיתה"}
            </button>
            <IconButton
              icon={Bell}
              label="עדכונים"
              onClick={() => setModal({ type: "notifications" })}
            />
          </div>
        </header>
        <main className="workspace" aria-busy={!cloud.ready}>
          {!cloud.ready && (
            <div className="cloud-loading" role="status">
              טוענים את רשימת הכיתה מהענן…
            </div>
          )}
          <ArchiveStatus cloud={cloud} demo={state.demo} />
          {!remote && (
            <>
              <div className="page-heading">
                <div className="heading-intro">
                  <div>
                    <div className="eyebrow">
                      {page === "home"
                        ? "בוקר טוב, צוות ההוראה ☀"
                        : "קצת סקרנות. הרבה אפשרויות."}
                    </div>
                    <h1>
                      {page === "class"
                        ? "כל תלמיד הוא עולם."
                        : page === "groups"
                          ? "טוב יותר, ביחד."
                          : page === "templates"
                            ? "התחלה טובה לשיעור הבא."
                            : page === "home"
                              ? "יום חדש לצמוח בו."
                              : "השיעור שלנו"}
                    </h1>
                    <p>
                      {page === "class"
                        ? "מכירים, מעודדים ונותנים מקום לכל אחד."
                        : page === "groups"
                          ? "מחברים בין תלמידים, מפנים מקום לרעיונות."
                          : page === "templates"
                            ? "פחות זמן בהכנה, יותר זמן עם התלמידים."
                            : "כל מה שצריך כדי להיות ברגע, עם הכיתה."}
                    </p>
                  </div>
                  <Mascot
                    variant={
                      page === "home"
                        ? "balloon"
                        : page === "class"
                          ? "birds"
                          : page === "groups"
                            ? "hats"
                            : page === "templates"
                              ? "planning"
                              : page === "reports"
                                ? "running"
                                : "focus"
                    }
                  />
                </div>
                <div className="heading-actions">
                  <button
                    className="secondary"
                    onClick={() => setModal({ type: "connect" })}
                  >
                    <Smartphone size={17} /> השלט שלי
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      window.open(
                        `${location.pathname}?view=projector&class=${classroom.id}`,
                        `beyachad-projector-${classroom.id}`,
                      )
                    }
                  >
                    <Monitor size={17} /> פתיחת ההקרנה <ArrowLeft size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
          {(page === "lesson" || page === "home") && !remote && (
            <div className="stats">
              <div className="stat lesson-stat">
                <span className="stat-icon sage">
                  <BookOpen size={21} />
                </span>
                <div>
                  <small>עכשיו לומדים</small>
                  <strong>
                    {state.demo ? "שיעור בכיתת דמה" : classLabel(classroom)}
                  </strong>
                </div>
                <span className={`live-pill ${state.ended ? "finished" : ""}`}>
                  <i />
                  {state.ended ? "הסתיים" : "שיעור פעיל"}
                </span>
              </div>
              <button
                className="stat"
                onClick={() =>
                  setDrawer(drawer === "students" ? "stages" : "students")
                }
              >
                <span className="stat-icon lavender">
                  <Users size={21} />
                </span>
                <div>
                  <small>נוכחות בכיתה</small>
                  <strong>
                    {present} <em>/ {state.students.length}</em>
                    <span className="stat-inline">כאן איתנו</span>
                  </strong>
                </div>
              </button>
              <div className="stat">
                <span className="stat-icon peach">
                  <Clock3 size={21} />
                </span>
                <div>
                  <small>זמן השיעור</small>
                  <strong>
                    {elapsed}
                    <em> / 45 דקות</em>
                  </strong>
                </div>
              </div>
            </div>
          )}
          {remote ? (
            <div className="remote-content">
              <span className="eyebrow">שלט הדגמה · סנכרון באותו דפדפן</span>
              <h1>השיעור בידיים שלך.</h1>
              <div className="remote-preview">
                <ProjectedContent data={projectionData} />
              </div>
              <p className="live-label">
                <span className="online-dot" /> זה מה שמוקרן עכשיו
              </p>
              <div className="remote-arrows">
                <button
                  className="secondary"
                  disabled={!state.demo || state.slide === 0}
                  onClick={() => navigateSlide(-1)}
                >
                  <ChevronRight /> הקודם
                </button>
                <button
                  className="primary"
                  disabled={!state.demo || state.slide === 3}
                  onClick={() => navigateSlide(1)}
                >
                  הבא <ChevronLeft />
                </button>
              </div>
              {timerControl()}
              <ClassModeBadge mode={!state.ended && state.classMode} />
              <div className="remote-tools">
                <button
                  className="secondary"
                  aria-pressed={state.projection.type === "groups"}
                  onClick={showGroups}
                >
                  <Monitor size={18} /> הקרנת קבוצות
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "mode" })}
                >
                  <span aria-hidden="true">🚦</span> מצב כיתה
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "quotes" })}
                >
                  <span aria-hidden="true">❞</span> שווה ציטוט
                </button>
                <button className="secondary" onClick={() => project("task")}>
                  <Presentation />
                  מה עושים עכשיו?
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "students" })}
                >
                  <Users />
                  תלמידים
                </button>
                <button
                  className="secondary"
                  onClick={() => setModal({ type: "groups" })}
                >
                  <Shapes />
                  קבוצות
                </button>
                <button className="secondary" onClick={() => project("slides")}>
                  <BookOpen />
                  חזרה למצגת
                </button>
              </div>
            </div>
          ) : page === "home" ? (
            <DayPlan
              state={state}
              update={update}
              onShow={(data) => project("day", data)}
            />
          ) : page === "reports" ? (
            <ReportPanel classroom={classroom} localState={state} />
          ) : page === "class" ? (
            <section className="panel roster-panel">
              <div className="panel-heading">
                <h2>
                  הפנים של הכיתה{" "}
                  <span className="count">{state.students.length}</span>
                </h2>
                <button
                  className="secondary"
                  onClick={() => {
                    setRosterText("");
                    setModal({ type: "add" });
                  }}
                >
                  <Plus size={16} /> הוספת תלמידים
                </button>
              </div>
              <button
                className="secondary bulk-entry"
                onClick={() => {
                  setRosterText("");
                  setModal({ type: "add" });
                }}
              >
                הדבקת רשימת תלמידים
              </button>
              <div className="roster-summary">
                <span>
                  <i className="online-dot" />
                  {present} נוכחים
                </span>
                <span>{state.students.length - present} חסרים</span>
                <span>
                  <Heart size={15} />
                  {hearts} רגעים של עידוד היום
                </span>
              </div>
              <label className="search">
                <Search size={17} />
                <input
                  placeholder="חיפוש תלמיד או תלמידה…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {studentList(true)}
            </section>
          ) : page === "groups" ? (
            <section className="panel groups-page">{groupsPanel()}</section>
          ) : page === "templates" ? (
            <Templates
              state={state}
              update={update}
              onUse={(template) => {
                setPhaseForm({ mode: "template", template });
                setModal({ type: "template" });
              }}
            />
          ) : (
            <>
              <div className="lesson-layout">
                <section className="panel presentation-panel">
                  <div className="panel-heading">
                    <div className="live-label">
                      <span className="online-dot" /> זה מה שמוקרן עכשיו{" "}
                      <span className="sub-label">
                        ·{" "}
                        {state.projection.type === "slides"
                          ? "המצגת שלנו"
                          : "פעילות כיתתית"}
                      </span>
                    </div>
                    <IconButton
                      icon={Maximize2}
                      label="תצוגה מקדימה גדולה"
                      onClick={() => setModal({ type: "preview" })}
                    />
                  </div>
                  <div
                    className={`slide-container ${state.video ? "with-video" : ""}`}
                  >
                    <ProjectedContent data={projectionData} />
                    {state.video && (
                      <div className="additional-content">
                        <button
                          className="close-video"
                          aria-label="סגירת חלון נוסף"
                          onClick={() =>
                            update((s) => {
                              s.video = null;
                            })
                          }
                        >
                          ×
                        </button>
                        <MediaFrame media={state.video} />
                      </div>
                    )}
                    {!state.ended && <ClassModeBadge mode={state.classMode} />}
                  </div>
                  <StatusBoard
                    students={state.students}
                    onHeart={heart}
                    onStudent={(id) => setModal({ type: "student", id })}
                    onWarning={warn}
                  />
                  <div className="lesson-tools-row">
                    <button
                      className="secondary"
                      aria-pressed={state.projection.type === "groups"}
                      onClick={showGroups}
                    >
                      <Monitor size={15} /> הקרנת קבוצות
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setModal({ type: "media" })}
                    >
                      <Plus size={15} /> תוכן, קבצים וקישורים
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setModal({ type: "mode" })}
                    >
                      <span aria-hidden="true">🚦</span> מצב כיתה
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setModal({ type: "quotes" })}
                    >
                      <span aria-hidden="true">❞</span> שווה ציטוט
                    </button>
                  </div>
                  {state.demo ? (
                    <div className="slide-navigation">
                      <div className="slide-nav-buttons">
                        <IconButton
                          icon={ChevronRight}
                          label="השקף הקודם"
                          disabled={!state.demo || state.slide === 0}
                          onClick={() => navigateSlide(-1)}
                        />
                        <span>
                          שקף <b>{state.slide + 1}</b> מתוך 4
                        </span>
                        <IconButton
                          icon={ChevronLeft}
                          label="השקף הבא"
                          disabled={!state.demo || state.slide === 3}
                          onClick={() => navigateSlide(1)}
                        />
                      </div>
                      <div className="slide-dots">
                        {(state.demo ? slideTitles : []).map((t, i) => (
                          <button
                            aria-label={`שקף ${i + 1}: ${t}`}
                            className={state.slide === i ? "active" : ""}
                            key={t}
                            onClick={() =>
                              update((s) => {
                                s.slide = i;
                                s.lastPresentation = null;
                                s.projection = {
                                  type: s.demo ? "slides" : "blank",
                                };
                              })
                            }
                          />
                        ))}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setModal({ type: "slides" })}
                      >
                        <Files size={15} /> כל השקפים
                      </button>
                    </div>
                  ) : (
                    <div className="normal-content-hint">
                      {classLabel(classroom)} · התוכן נשמר בספרייה של הכיתה
                    </div>
                  )}
                  <div className="activity-toolbar">
                    <button onClick={() => project("task")}>
                      <Presentation size={18} />
                      <span>מה עושים עכשיו?</span>
                    </button>
                    <button
                      onClick={() => {
                        setPage("groups");
                      }}
                    >
                      <Shapes size={18} />
                      <span>קבוצות</span>
                    </button>
                    <button onClick={() => setModal({ type: "cards" })}>
                      <Files size={18} />
                      <span>כרטיס פעילות</span>
                    </button>
                    <button onClick={() => project("slides")}>
                      <BookOpen size={18} />
                      <span>חזרה למצגת</span>
                    </button>
                  </div>
                </section>
                <aside className="panel lesson-drawer">
                  <div className="drawer-tabs">
                    <button
                      className={drawer === "stages" ? "active" : ""}
                      onClick={() => setDrawer("stages")}
                    >
                      <BookOpen size={15} />
                      מהלך השיעור
                    </button>
                    <button
                      className={drawer === "students" ? "active" : ""}
                      onClick={() => setDrawer("students")}
                    >
                      <Users size={15} />
                      התלמידים
                    </button>
                  </div>
                  {drawer === "stages" ? (
                    <>
                      <div className="timeline">
                        {state.stages.map((p, i) => (
                          <div
                            className={`stage-item ${i === state.stage ? "current" : ""} ${i < state.stage ? "done" : ""}`}
                            key={p.id}
                          >
                            <button
                              className="stage-main"
                              onClick={() => selectStage(i)}
                            >
                              <span className="stage-number">
                                {i < state.stage ? <Check size={13} /> : i + 1}
                              </span>
                              <span>
                                <strong>{p.name}</strong>
                                <small>
                                  {p.minutes} דקות{" "}
                                  {i === state.stage && (
                                    <span>· עכשיו אנחנו כאן</span>
                                  )}
                                </small>
                              </span>
                            </button>
                            <IconButton
                              icon={Pencil}
                              label={`עריכת ${p.name}`}
                              onClick={() => {
                                setPhaseForm({ ...p, index: i });
                                setModal({ type: "stage" });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="timeline-footer">
                        <span>
                          <Clock3 size={13} />
                          {total} דקות מתוכננות
                        </span>
                        <button
                          className="text-button"
                          onClick={() => {
                            setPhaseForm({
                              name: "",
                              minutes: 5,
                              instruction: "",
                              equipment: "",
                              index: -1,
                            });
                            setModal({ type: "stage" });
                          }}
                        >
                          <Plus size={14} />
                          שלב
                        </button>
                      </div>
                      {total > 45 && (
                        <p className="over-budget">
                          התכנון ארוך ב־{total - 45} דקות מהשיעור
                        </p>
                      )}
                      {timerControl()}
                      <button
                        className="next-stage"
                        disabled={state.stage === state.stages.length - 1}
                        onClick={() => selectStage(state.stage + 1)}
                      >
                        סיום שלב ומעבר לבא <ArrowLeft size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="drawer-roster-head">
                        <span>
                          {present} מתוך {state.students.length} נוכחים
                        </span>
                        <button
                          className="text-button"
                          onClick={() => setPage("class")}
                        >
                          כל הכיתה <ChevronLeft size={14} />
                        </button>
                      </div>
                      <label className="search compact">
                        <Search size={16} />
                        <input
                          placeholder="חיפוש תלמיד…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                      </label>
                      <div className="drawer-students">{studentList()}</div>
                    </>
                  )}
                </aside>
              </div>
              <div className="bottom-grid">
                <section className="encourage-card">
                  <div className="encourage-icon">
                    <Heart size={24} />
                  </div>
                  <div>
                    <h3>רגע קטן. חיזוק גדול.</h3>
                    <p>התמדה, עזרה או רעיון אמיץ — תמיד יש סיבה לפרגן.</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setQuery("");
                      setModal({ type: "students" });
                    }}
                  >
                    נותנים לב <Heart size={15} />
                  </button>
                  {hearts > 0 && (
                    <span className="heart-total">{hearts} ♥</span>
                  )}
                </section>
                <button
                  className="finish-card"
                  onClick={() => setModal({ type: "finish" })}
                >
                  <span className="stat-icon sage">
                    <Flag size={21} />
                  </span>
                  <span>
                    <strong>משהו לקחת להמשך</strong>
                    <small>סיכום קצר וסיום השיעור</small>
                  </span>
                  <ChevronLeft size={18} />
                </button>
              </div>
              <div className="workspace-footer">
                <span>
                  <Sprout size={14} /> מרחב קטן. אפשרויות גדולות.
                </span>
                <span>המידע נשמר בדפדפן הזה בלבד</span>
              </div>
            </>
          )}
        </main>
        <PartnerLogos />
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          <span>{toast.message}</span>
          {toast.previous && (
            <button
              onClick={() => {
                const { previous, after } = toast;
                update((s) => {
                  s.lessonHearts = Math.max(
                    0,
                    currentHearts(s) -
                      (currentHearts(after) - currentHearts(previous)),
                  );
                  previous.students.forEach((before) => {
                    const applied = after.students.find(
                      (p) => p.id === before.id,
                    );
                    const current = s.students.find((p) => p.id === before.id);
                    if (!applied) {
                      if (!current) s.students.push(before);
                      return;
                    }
                    if (!current) return;
                    Object.keys(before).forEach((k) => {
                      if (
                        JSON.stringify(before[k]) !== JSON.stringify(applied[k])
                      ) {
                        if (k === "hearts" || k === "warningCount")
                          current[k] = Math.max(
                            0,
                            current[k] - (applied[k] - before[k]),
                          );
                        else if (
                          JSON.stringify(current[k]) ===
                          JSON.stringify(applied[k])
                        )
                          current[k] = before[k];
                      }
                    });
                  });
                  previous.groups.forEach((oldGroup) => {
                    const current = s.groups.find((g) => g.id === oldGroup.id);
                    if (current)
                      oldGroup.ids.forEach((id) => {
                        if (
                          !after.students.some((p) => p.id === id) &&
                          s.students.some((p) => p.id === id) &&
                          !s.groups.some((g) => g.ids.includes(id))
                        )
                          current.ids.push(id);
                      });
                  });
                });
                setToast(null);
              }}
            >
              <Undo2 size={15} /> ביטול
            </button>
          )}
          <IconButton
            icon={X}
            label="סגירת הודעה"
            onClick={() => setToast(null)}
          />
        </div>
      )}
      {modal && (
        <Modal
          title={
            {
              about: "נעים להכיר, קלי קלוח",
              connect: "השלט שלך, קרוב אלייך",
              notifications: "מרחב שקט להוראה",
              students: "רגע של עידוד",
              student: "הכרטיס האישי",
              groups: "הקבוצות שלנו",
              cards: "מה נציג לכיתה?",
              slides: "המצגת שלנו",
              stage: "מתכננים את השלב",
              add: "מוסיפים פנים חדשות",
              finish: "משהו לקחת להמשך",
              preview: "זה מה שמוקרן עכשיו",
              template: "מתחילים מהתחלה טובה",
              media: "מה מציגים היום?",
              mode: "מצב כיתה",
              quotes: "שווה ציטוט",
            }[modal.type]
          }
          onClose={() => setModal(null)}
          wide={["preview", "groups"].includes(modal.type)}
        >
          {modal.type === "mode" && (
            <ModePicker
              selected={state.classMode}
              onSelect={(mode) => {
                update(
                  (s) => {
                    s.classMode = mode;
                  },
                  mode ? "מצב הכיתה עודכן לצד המצגת" : "מצב הכיתה הוסר",
                );
                setModal(null);
              }}
            />
          )}
          {modal.type === "quotes" && (
            <QuoteBook
              state={state}
              update={update}
              onShow={(quote) => {
                project("quote", { quote });
                setModal(null);
              }}
            />
          )}
          {modal.type === "media" && (
            <MediaPicker
              library={state.library || []}
              onAdd={(media) =>
                update((s) => {
                  rememberMedia(s, media);
                }, "התוכן נשמר בספרייה. ההקרנה לא השתנתה.")
              }
              onShow={(media) => {
                if (media.kind === "demo-slides") {
                  update((s) => {
                    s.lastPresentation = null;
                    s.projection = { type: "slides" };
                  }, "מצגת כיתת דמה מוצגת");
                } else project("media", { media });
                setModal(null);
              }}
              onVideo={(media) => {
                update((s) => {
                  s.video = media;
                }, "נפתח חלון תוכן נוסף בכיתה");
                setModal(null);
              }}
            />
          )}
          {modal.type === "about" && (
            <div className="modal-body">
              <div className="about-brand">
                <Mascot variant="calm" />
                <h3>יותר מקום להוראה. יותר מקום לצמוח.</h3>
              </div>
              <p>
                מרחב להוראה עם תוכן לבחירת המורה, שלבי שיעור, טיימר, נוכחות,
                לבבות ואזהרות שמוצגים גם בכיתה, קבוצות וכרטיסי פעילות.
              </p>
              <div className="notice">
                <Info size={20} />
                <p>
                  רשימת התלמידים וסיכומי השיעורים נשמרים בענן. התוכן המועלה
                  והעבודה השוטפת נשמרים גם בדפדפן. חיבור נייד עם QR או קוד משתף
                  את השיעור למשך ארבע שעות. הכניסה משתמשת בסיסמה משותפת, ללא
                  חשבונות אישיים. ניתן להעלות PDF, תמונות, אודיו ווידאו מתוך
                  חלון התוכן.
                </p>
              </div>
              <p>
                סיכום נוכחות, לבבות ומספר אזהרות נשמר עד סוף שנת הלימודים, ללא
                פירוט אירועים. את הסיכומים אפשר למחוק במסך סיכומי תלמידים.
              </p>
              {state.demo && (
                <button
                  className="secondary"
                  onClick={() => {
                    update(
                      (s) => Object.assign(s, freshClass(true)),
                      "נתוני ההדגמה של הכיתה אופסו",
                    );
                    setModal(null);
                  }}
                >
                  <RotateCcw size={16} /> איפוס נתוני ההדגמה
                </button>
              )}
            </div>
          )}
          {modal.type === "notifications" && (
            <div className="empty">
              <Bell size={36} />
              <h3>הכול שקט כאן</h3>
              <p>אין עדכונים שמפריעים לשיעור. אפשר לחזור לתלמידים.</p>
            </div>
          )}
          {modal.type === "connect" && (
            <div className="modal-body">
              <PairPanel pair={pair} />
              <div className="connect-art">
                <Smartphone size={58} />
                <span>↔</span>
                <Monitor size={58} />
              </div>
              <h3>מנסים שליטה משני מסכים</h3>
              <p>
                אפשר לסרוק QR בנייד או לפתוח שלט בלשונית נוספת באותו דפדפן. כל
                שינוי יסתנכרן עם מסך השיעור וההקרנה.
              </p>
              <div className="notice">
                <Info size={20} />
                <p>
                  קוד החיבור משתמש בשרת הסנכרון. ב־Vercel יש להגדיר אחסון Redis
                  לפני השימוש. השלט בלשונית נוספת ממשיך לעבוד באותו דפדפן.
                </p>
              </div>
              <button
                className="primary"
                onClick={() =>
                  window.open(
                    `${location.pathname}?view=remote&class=${classroom.id}`,
                    `beyachad-remote-${classroom.id}`,
                  )
                }
              >
                <Smartphone size={17} /> פתיחת שלט ההדגמה
              </button>
            </div>
          )}
          {modal.type === "students" && (
            <div className="modal-body">
              <p className="muted">
                לב לחיזוק ודגל לאזהרה — בלחיצה ליד שם התלמיד. הסימונים מופיעים
                גם בכיתה. אחרי שתי אזהרות נדרשת בחירת תגובה.
              </p>
              <label className="search">
                <Search size={17} />
                <input
                  placeholder="חיפוש תלמיד…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {studentList()}
            </div>
          )}
          {modal.type === "student" &&
            (() => {
              const p = state.students.find((p) => p.id === modal.id);
              return p ? (
                <div className="modal-body">
                  <div className="student-profile">
                    <span className="animal">{p.emoji}</span>
                    <h3>{p.name}</h3>
                    <span>{p.hearts} לבבות של עידוד</span>
                  </div>
                  <label className="field">
                    שם לתצוגה
                    <input
                      value={p.name}
                      onChange={(e) =>
                        update(
                          (s) =>
                            (s.students.find((x) => x.id === p.id).name =
                              e.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    אייקון קבוע
                    <select
                      value={p.emoji}
                      onChange={(e) =>
                        update(
                          (s) =>
                            (s.students.find((x) => x.id === p.id).emoji =
                              e.target.value),
                        )
                      }
                    >
                      {avatars.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  <div className="student-actions">
                    <button className="primary" onClick={() => heart(p.id)}>
                      <Heart size={17} /> הוספת לב
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        project("heart", { name: p.name });
                        setModal(null);
                      }}
                    >
                      <Monitor size={17} /> הקרנת חיזוק
                    </button>
                    <button
                      className="secondary"
                      onClick={() => attendance(p.id)}
                    >
                      {p.present ? "סימון כחסר/ה" : "הגיע/ה באיחור"}
                    </button>
                  </div>
                  <div className="warning-box">
                    <strong>
                      <Flag size={16} /> מוצג גם בכיתה
                    </strong>
                    <p>
                      {p.warning === 0
                        ? "ללא אזהרות בשיעור הזה"
                        : p.warning === 1
                          ? "אזהרה ראשונה · צהוב"
                          : "אזהרה שנייה · אדום"}
                    </p>
                    <div className="student-actions">
                      <button className="secondary" onClick={() => warn(p.id)}>
                        {" "}
                        {p.warning < 2 ? "הוספת אזהרה" : "אירוע נוסף"}
                      </button>
                      {p.warning > 0 && (
                        <button
                          className="text-button"
                          onClick={() =>
                            update(
                              (s) =>
                                (s.students.find((x) => x.id === p.id).warning =
                                  0),
                              "האזהרה בוטלה",
                              true,
                            )
                          }
                        >
                          איפוס אזהרה
                        </button>
                      )}
                    </div>
                    {modal.response && (
                      <div className="response">
                        <p>
                          הצעה להדגמה: שיחה אישית קצרה בהמשך השיעור. לא מתבצעת
                          פעולה אוטומטית.
                        </p>
                        <button
                          className="primary"
                          onClick={() => {
                            setModal({ type: "student", id: p.id });
                            setToast({
                              message: "בחרת בשיחה אישית. ההחלטה נשארת בידייך.",
                            });
                          }}
                        >
                          אישור ההצעה
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({ type: "student", id: p.id })
                          }
                        >
                          ביטול
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="danger text-button"
                    onClick={() =>
                      setModal({ type: "student", id: p.id, remove: true })
                    }
                  >
                    <Trash2 size={15} /> הסרת תלמיד/ה
                  </button>
                  {modal.remove && (
                    <div className="notice">
                      <p>להסיר את {p.name} מרשימת ההדגמה?</p>
                      <button
                        className="secondary"
                        onClick={() => {
                          update(
                            (s) => {
                              s.students = s.students.filter(
                                (x) => x.id !== p.id,
                              );
                              s.groups.forEach(
                                (g) =>
                                  (g.ids = g.ids.filter((id) => id !== p.id)),
                              );
                            },
                            "התלמיד הוסר",
                            true,
                          );
                          setModal(null);
                        }}
                      >
                        אישור הסרה
                      </button>
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          {modal.type === "groups" && (
            <div className="modal-body">{groupsPanel()}</div>
          )}
          {modal.type === "cards" && (
            <div className="modal-body">
              <p className="muted">
                בוחרים פעילות, והיא תחליף את המצגת בהקרנה. אפשר לחזור לאותו שקף
                בכל רגע.
              </p>
              <div className="activity-choices">
                {[
                  ["entry", "☀️", "נכנסים בנחת", "ברכה, ציוד ומשימת כניסה"],
                  [
                    "task",
                    "🌱",
                    "מה עושים עכשיו?",
                    "המשימה, הציוד והזמן שנותר",
                  ],
                  ["exit", "💭", "מחשבה לדרך", "שאלת יציאה לסיום השיעור"],
                ].map(([id, emoji, title, desc]) => (
                  <button
                    key={id}
                    onClick={() => {
                      project(id);
                      setModal(null);
                    }}
                  >
                    <span>{emoji}</span>
                    <div>
                      <strong>{title}</strong>
                      <small>{desc}</small>
                    </div>
                    <ChevronLeft size={20} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {modal.type === "slides" && (
            <div className="modal-body">
              <p className="muted">
                מצגת הדגמה מובנית · בחירת שקף מעדכנת מיד את ההקרנה.
              </p>
              <div className="slide-choices">
                {(state.demo ? slideTitles : []).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => {
                      update((s) => {
                        s.slide = i;
                        s.projection = { type: "slides" };
                      });
                      setModal(null);
                    }}
                  >
                    <span>{i + 1}</span>
                    {t}
                    {state.slide === i && <Check size={17} />}
                  </button>
                ))}
              </div>
              <div className="notice">
                <Info size={18} />
                <p>
                  להעלאת PDF וקבצים נוספים בחרו „תוכן, קבצים וקישורים” במסך
                  השיעור.
                </p>
              </div>
            </div>
          )}
          {modal.type === "stage" && phaseForm && (
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                update((s) => {
                  const { index, ...p } = phaseForm;
                  if (index === -1)
                    s.stages.push({ ...p, id: crypto.randomUUID() });
                  else {
                    s.stages[index] = p;
                    if (index === s.stage && !s.timer.end)
                      s.timer.remaining = p.minutes * 60;
                  }
                }, "השלב נשמר. התוכן המוקרן לא השתנה");
                setModal(null);
              }}
            >
              <label className="field">
                שם השלב
                <input
                  autoFocus
                  required
                  value={phaseForm.name}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, name: e.target.value })
                  }
                />
              </label>
              <label className="field">
                משך בדקות
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={phaseForm.minutes}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, minutes: +e.target.value })
                  }
                />
              </label>
              <label className="field">
                הנחיה קצרה
                <textarea
                  required
                  value={phaseForm.instruction}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, instruction: e.target.value })
                  }
                />
              </label>
              <label className="field">
                ציוד נדרש
                <input
                  value={phaseForm.equipment}
                  onChange={(e) =>
                    setPhaseForm({ ...phaseForm, equipment: e.target.value })
                  }
                />
              </label>
              <p className="muted">
                עריכה אינה משנה תוכן שכבר הוקרן. לפרסום ההנחיה המעודכנת בחרי שוב
                „מה עושים עכשיו?”.
              </p>
              <button className="primary" type="submit">
                <Check size={17} />
                שמירת השלב
              </button>
            </form>
          )}
          {modal.type === "add" && (
            <form
              className="modal-body"
              onSubmit={(e) => {
                e.preventDefault();
                const list = rosterText
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean);
                if (!list.length) return;
                update((s) => {
                  list.forEach((name, i) =>
                    s.students.push({
                      id: crypto.randomUUID(),
                      name,
                      emoji: avatars[(s.students.length + i) % avatars.length],
                      present: true,
                      late: false,
                      hearts: 0,
                      warning: 0,
                      warningCount: 0,
                    }),
                  );
                }, `נוספו ${list.length} תלמידים`);
                setModal(null);
              }}
            >
              <p>
                מדביקים רשימה, שם בכל שורה. לשמות זהים הוסיפו אות משם המשפחה כדי
                שיהיה קל להבחין ביניהם.
              </p>
              <label className="field">
                טעינת רשימה מקובץ טקסט
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setRosterText(await file.text());
                  }}
                />
              </label>
              <p className="muted">
                {rosterText.split("\n").filter((x) => x.trim()).length} תלמידים
                ברשימה · שם בכל שורה
              </p>
              <label className="field">
                שמות תלמידים
                <textarea
                  required
                  rows="7"
                  value={rosterText}
                  onChange={(e) => setRosterText(e.target.value)}
                  placeholder={"נועה כהן\nאיתי לוי\nמאיה ברק"}
                />
              </label>
              <button className="primary" type="submit">
                <Plus size={17} /> הוספה לכיתה
              </button>
            </form>
          )}
          {modal.type === "finish" && (
            <div className="modal-body">
              <div className="finish-moment">
                <Mascot variant="rest" />
                <p>לא צריך למלא דוח. רק אם יש משהו שתרצי לזכור לפעם הבאה.</p>
              </div>
              <label className="field">
                מה הספקנו? מאיפה ממשיכים?
                <textarea
                  rows="4"
                  placeholder="למשל: בפעם הבאה נבדוק מה קרה לזרעים…"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </label>
              <button
                className="primary"
                onClick={() => {
                  update((s) => {
                    s.endedAt ||= Date.now();
                    archiveLesson(s, true);
                    s.ended = true;
                    s.summary = summary;
                    s.timer = { remaining: seconds(s.timer), end: null };
                  }, "השיעור הסתיים. תודה על עוד רגע של צמיחה");
                  setModal(null);
                }}
              >
                <Flag size={17} /> סיום שיעור
              </button>
              {state.summary && (
                <p className="muted">ההערה השמורה: {state.summary}</p>
              )}
            </div>
          )}
          {modal.type === "preview" && (
            <div className="large-preview">
              <ProjectedContent data={projectionData} />
            </div>
          )}
          {modal.type === "template" && (
            <div className="modal-body">
              <p>
                פתיחת שיעור חדש לפי התבנית תאפס את הטיימר, מצב האזהרות והלבבות
                של השיעור. רשימת התלמידים תישמר.
              </p>
              <button
                className="primary"
                onClick={() => {
                  update((s) => {
                    archiveLesson(s, !!s.ended);
                    const fresh = initial();
                    s.lessonId = fresh.lessonId;
                    s.lessonHearts = 0;
                    s.endedAt = null;
                    s.stages = phaseForm?.template
                      ? stagesFor(phaseForm.template)
                      : fresh.stages;
                    s.stage = 0;
                    s.timer = {
                      remaining: s.stages[0].minutes * 60,
                      end: null,
                    };
                    s.started = Date.now();
                    s.ended = false;
                    s.slide = 0;
                    s.projection = { type: s.demo ? "slides" : "blank" };
                    s.lastPresentation = null;
                    s.summary = "";
                    s.groups = [];
                    s.groupRoles = {};
                    s.studentHats = {};
                    s.thinkingHatsEnabled = false;
                    s.autoAssignHats = false;
                    s.video = null;
                    s.classMode = null;
                    s.students.forEach((p) => {
                      p.hearts = 0;
                      p.warning = 0;
                      p.warningCount = 0;
                    });
                  }, "שיעור חדש מוכן לצמיחה");
                  setPage("lesson");
                  setModal(null);
                }}
              >
                <Sprout size={17} /> פתיחת שיעור חדש
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
function Entry() {
  const params = new URLSearchParams(location.search),
    view = params.get("view"),
    requestedClass = params.get("class");
  const [joining, setJoining] = useState(view === "join");
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  });
  function login(next) {
    const url = new URL(location.href);
    if (next.role === "admin") {
      url.searchParams.set("view", "admin");
      url.searchParams.delete("class");
    } else {
      if (url.searchParams.get("view") !== "remote" && !joining)
        url.searchParams.delete("view");
      url.searchParams.set("class", next.classId);
    }
    if (joining) {
      url.searchParams.set("view", "remote");
      setJoining(false);
    }
    history.replaceState(null, "", url);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }
  if (joining)
    return (
      <JoinDevice
        onJoin={login}
        onBack={() => {
          history.replaceState(null, "", location.pathname);
          setJoining(false);
        }}
      />
    );
  if (view === "projector") {
    const id = requestedClass || "g2";
    return classrooms().some((c) => c.id === id) ? (
      <Projector classId={id} />
    ) : (
      <main className="activity">
        <h1>הכיתה לא נמצאה</h1>
        <a href={location.pathname}>חזרה לכניסה</a>
      </main>
    );
  }
  const classroom = classrooms().find((c) => c.id === session?.classId);
  const validTeacher =
    session?.role === "teacher" &&
    classroom &&
    (!requestedClass || requestedClass === classroom.id);
  if (session?.role === "admin" && view !== "remote")
    return <Admin onLogout={logout} />;
  if (validTeacher && view !== "admin")
    return <App key={classroom.id} classroom={classroom} onLogout={logout} />;
  return (
    <Login
      requestedClass={
        classrooms().some((c) => c.id === requestedClass)
          ? requestedClass
          : undefined
      }
      admin={view === "admin"}
      onLogin={login}
      onPair={() => setJoining(true)}
    />
  );
}
createRoot(document.getElementById("root")).render(<Entry />);
