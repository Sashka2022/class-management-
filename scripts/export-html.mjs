import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
let html = await readFile(path.join(dist, "index.html"), "utf8");
const scriptTag = /<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g;
const styleTag = /<link\b[^>]*href="([^"]+\.css)"[^>]*>/g;
for (const match of [...html.matchAll(scriptTag)]) {
  const source = await readFile(
    path.join(dist, match[1].replace(/^\//, "")),
    "utf8",
  );
  html = html.replace(
    match[0],
    () =>
      `<script type="module">window.__BEYACHAD_STANDALONE__=true;${source.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
for (const match of [...html.matchAll(styleTag)]) {
  const css = await readFile(
    path.join(dist, match[1].replace(/^\//, "")),
    "utf8",
  );
  html = html.replace(
    match[0],
    () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
  );
}
await mkdir("downloads", { recursive: true });
await writeFile("downloads/beyachad.html", html);
console.log("Standalone app saved: downloads/beyachad.html");
