import { chromium } from "../../node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
export const BASE = "http://localhost:5173";
export const CHROME = "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CURSOR = `(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const s = document.createElement('style');
    s.textContent = '#__cur{position:fixed;z-index:2147483647;pointer-events:none;left:0;top:0;width:0;height:0}' +
     '#__cur svg{position:absolute;left:-4px;top:-3px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.45));width:44px;height:44px}' +
     '.__rip{position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;width:24px;height:24px;margin:-12px 0 0 -12px;border:5px solid #f5a623;background:rgba(245,166,35,.28);animation:__r .6s ease-out forwards}' +
     '@keyframes __r{to{transform:scale(3.6);opacity:0}}';
    document.documentElement.appendChild(s);
    const c = document.createElement('div'); c.id='__cur';
    c.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#1d2b4f" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    c.style.transform='translate(960px,1200px)';
    window.__curMove = (x,y)=>{ c.style.transform='translate('+x+'px,'+y+'px)'; };
    addEventListener('mousemove', e=>window.__curMove(e.clientX,e.clientY), true);
    addEventListener('mousedown', e=>{ const r=document.createElement('div'); r.className='__rip'; r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.documentElement.appendChild(r); setTimeout(()=>r.remove(),700); }, true);
  };
  if (document.readyState==='loading') addEventListener('DOMContentLoaded', mk); else mk();
  new MutationObserver(mk).observe(document, {childList:true});
})();`;
export async function launch() {
  return chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });
}
const pos = new WeakMap();
export async function glide(page, x, y, ms = 650) {
  const [px, py] = pos.get(page) || [960, 1100];
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(px + (x - px) * e, py + (y - py) * e);
    await sleep(ms / steps);
  }
  pos.set(page, [x, y]);
}
export async function click(page, loc, { pause = 700, ms = 650 } = {}) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  if (!b) throw new Error("no box");
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await glide(page, x + 6, y + 4, ms);
  await glide(page, x, y, 120);
  await sleep(120);
  await page.mouse.down(); await sleep(90); await page.mouse.up();
  await sleep(pause);
  return { x, y, w: b.width, h: b.height };
}
// Run a scene in fresh context(s); records marks (ms since each video start)
export async function scene(browser, name, fn, { phone = false, projector = true, login = false, tries = 3 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const dir = path.resolve("raw", name);
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir, size: { width: 1920, height: 1080 } }, serviceWorkers: "block" });
    if (!login) await ctx.addInitScript(() => { if (!sessionStorage.getItem("beyachad-session-v1")) sessionStorage.setItem("beyachad-session-v1", JSON.stringify({ role: "teacher", classId: "g2" })); });
    await ctx.addInitScript(CURSOR);
    const meta = { name, marks: [], starts: {}, files: {} };
    const mk = async (key) => { const p = await ctx.newPage(); meta.starts[key] = Date.now(); return p; };
    const teacher = await mk("teacher");
    const proj = projector ? await mk("proj") : null;
    let phoneCtx, ph;
    if (phone) {
      phoneCtx = await browser.newContext({ viewport: { width: 540, height: 1080 }, deviceScaleFactor: 1, hasTouch: false, recordVideo: { dir: dir + "/phone", size: { width: 540, height: 1080 } } });
      await phoneCtx.addInitScript(CURSOR);
      ph = await phoneCtx.newPage(); meta.starts.phone = Date.now();
    }
    const vt = teacher.video().path(), vp = proj ? proj.video().path() : null, vh = ph ? ph.video().path() : null;
    const mark = (label) => meta.marks.push({ label, t: Date.now() });
    try {
      await fn({ teacher, proj, ph, ctx, mark });
      await sleep(600);
      await teacher.close(); if (proj) await proj.close(); if (ph) await ph.close();
      await ctx.close(); if (phoneCtx) await phoneCtx.close();
      meta.dir = dir;
      meta.files.teacher = await vt; if (proj) meta.files.proj = await vp; if (ph) meta.files.phone = await vh;
      fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 1));
      console.log("OK scene", name, "attempt", attempt);
      return meta;
    } catch (e) {
      lastErr = e; console.log("FAIL scene", name, "attempt", attempt, String(e).slice(0, 300));
      try { await ctx.close(); if (phoneCtx) await phoneCtx.close(); } catch {}
    }
  }
  throw lastErr;
}
