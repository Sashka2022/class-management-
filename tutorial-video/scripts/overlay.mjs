import { launch } from "./lib.mjs";
import fs from "node:fs";
import path from "node:path";
const W = path.resolve("work");
export const CSS = `
@font-face{font-family:H;font-weight:400;src:url(file://${W}/heebo-hebrew-400-normal.woff2)}
@font-face{font-family:H;font-weight:700;src:url(file://${W}/heebo-hebrew-700-normal.woff2)}
@font-face{font-family:H;font-weight:800;src:url(file://${W}/heebo-hebrew-800-normal.woff2)}
*{box-sizing:border-box;margin:0}html{direction:rtl}
body{font-family:H,sans-serif;width:var(--w);height:var(--h);overflow:hidden;position:relative;color:#fff}
`;
let b;
export async function render(items) { // items: [{file,w,h,html,bg}]
  b ||= await launch();
  const ctx = await b.newContext();
  for (const it of items) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: it.w, height: it.h });
    await p.setContent(`<html lang="he" dir="rtl"><head><meta charset="utf-8"><style>:root{--w:${it.w}px;--h:${it.h}px}${CSS}${it.css || ""}</style></head><body style="background:${it.bg || "transparent"}">${it.html}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: it.file, omitBackground: !it.bg });
    await p.close();
  }
  await ctx.close();
}
export async function done() { if (b) await b.close(); b = null; }
