import { render, done } from "./overlay.mjs";
import fs from "node:fs";
const items = JSON.parse(fs.readFileSync("work/items.json", "utf8"));
await render(items); await done(); console.log("rendered", items.length);
