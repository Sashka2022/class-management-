import { launch, scene, click, glide, sleep, BASE } from "./lib.mjs";
import fs from "node:fs";
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);
const b = await launch();
const btn = (p, name) => p.getByRole("button", { name, exact: true });
const S = {};

// 1 — real login + opening the projection beside the teacher screen
S.login = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await sleep(1200);
  mark("login-screen");
  await click(t, t.getByLabel("הכיתה שלי"), { pause: 300 });
  await t.getByLabel("הכיתה שלי").selectOption({ label: "כיתת דמה" }); await sleep(700);
  const pw = t.getByRole("textbox", { name: "סיסמה" });
  await click(t, pw, { pause: 200 });
  await t.keyboard.type("1111", { delay: 220 }); await sleep(500);
  mark("click-enter");
  await click(t, btn(t, "נכנסים לכיתה"), { pause: 1800 });
  await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  mark("lesson-open");
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1500);
  mark("proj-open");
  await sleep(1200);
  await click(t, btn(t, "השקף הבא"), { pause: 1600 }); mark("slide-next");
  await proj.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }).waitFor();
  await sleep(1500);
};
S.login.opts = { login: true };

// 2 — slides, lesson stages, timer
S.lesson = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1200);
  mark("start");
  await click(t, btn(t, "השקף הבא"), { pause: 1500 }); mark("slide2");
  await click(t, btn(t, "מהלך השיעור"), { pause: 600 });
  await click(t, t.getByText("צומחים בקבוצות").first(), { pause: 1400 }); mark("stage3");
  await click(t, btn(t, "התחלת טיימר"), { pause: 1500 }); mark("timer-start");
  await click(t, t.getByRole("button", { name: /דקה/ }).first(), { pause: 1800 }); mark("plus-minute");
  await sleep(1500);
};

// 3 — class mode
S.mode = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1200);
  mark("start");
  await click(t, btn(t, "מצב כיתה"), { pause: 900 }); mark("panel");
  await click(t, t.getByRole("button", { name: /עבודה שקטה/ }), { pause: 2200 }); mark("quiet");
  await click(t, btn(t, "מצב כיתה"), { pause: 900 });
  const pairs = t.getByRole("button", { name: /זוגות/ }).first();
  await click(t, pairs, { pause: 2200 }); mark("pairs");
  await sleep(800);
};

// 4 — hearts
S.hearts = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1200);
  mark("start");
  await click(t, btn(t, "התלמידים"), { pause: 900 }); mark("students");
  for (const n of ["איתי לוי", "אמה כהן", "אורי מזרחי", "איתי לוי"]) {
    await click(t, t.getByRole("button", { name: `לב ל${n}`, exact: true }), { pause: 1100, ms: 550 }); mark("heart-" + n);
  }
  await sleep(1200);
};

// 5 — random groups + roles
S.groups = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1200);
  await click(t, btn(t, "הקבוצות שלנו"), { pause: 1200 }); mark("groups-page");
  const auto = t.getByLabel("חלוקת תפקידים אוטומטית", { exact: false }).first();
  await click(t, auto, { pause: 700 }); mark("auto-roles");
  await click(t, btn(t, "חלוקה חדשה"), { pause: 1800 }); mark("split");
  await click(t, btn(t, "חלוקה חדשה"), { pause: 1500 }); mark("split2");
  await click(t, btn(t, "הצג קבוצות לכיתה"), { pause: 2500 }); mark("published");
  await sleep(1500);
};

// 6 — thinking hats
S.hats = async ({ teacher: t, proj, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1200);
  await click(t, btn(t, "הקבוצות שלנו"), { pause: 900 });
  await click(t, btn(t, "חלוקה חדשה"), { pause: 1500 }); mark("split");
  await click(t, t.getByLabel("הפעלת כובעי החשיבה של דה בונו", { exact: true }), { pause: 1400 }); mark("hats-on");
  await click(t, btn(t, "חלוקת כובעים אוטומטית"), { pause: 1600 }); mark("hats-auto");
  await click(t, btn(t, "הקרנת קבוצות"), { pause: 2800 }); mark("project");
  await sleep(1200);
};

// 7 — phone remote
S.phone = async ({ teacher: t, proj, ph, mark }) => {
  await t.goto(BASE); await t.getByRole("heading", { name: "השיעור שלנו", exact: true }).waitFor();
  await proj.goto(BASE + "/?view=projector&class=g2"); await sleep(1000);
  await click(t, btn(t, "השלט שלי"), { pause: 800 });
  await click(t, btn(t, "יצירת קוד חיבור"), { pause: 1500 }); mark("code");
  const code = (await t.locator(".pair-code").innerText()).replace(/\s/g, "");
  await ph.goto(BASE + "/?view=join"); await sleep(800);
  const inp = ph.getByLabel("קוד חיבור", { exact: true });
  await click(ph, inp, { pause: 200 });
  await ph.keyboard.type(code, { delay: 150 }); await sleep(500);
  await click(ph, btn(ph, "חיבור לשיעור"), { pause: 1800 }); mark("phone-joined");
  await click(ph, btn(ph, "הבא"), { pause: 2200 }); mark("phone-next");
  await click(ph, btn(ph, "הבא"), { pause: 2200 }); mark("phone-next2");
  await sleep(800);
};
S.phone.opts = { phone: true };

for (const [n, fn] of Object.entries(S)) if (want(n)) {
  const m = await scene(b, n, fn, fn.opts || {});
  fs.writeFileSync(`raw/${n}.meta.json`, JSON.stringify(m, null, 1));
}
await b.close();
