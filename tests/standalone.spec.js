import { test, expect } from "./fixtures";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

test.beforeAll(() => {
  execFileSync("npm", ["run", "export:html"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});
test("self-contained HTML needs no asset requests and supports login, projection and admin totals", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const html = await readFile(path.resolve("downloads/beyachad.html"), "utf8");
  const unexpected = [];
  // The managed browser blocks file: navigation. Fulfill the single HTML
  // document in memory and reject every dependency/network request instead.
  const base = "http://127.0.0.1:5173/downloaded-beyachad.html";
  await context.route("**/*", async (route) => {
    if (route.request().url().split("?")[0] === base)
      await route.fulfill({
        body: html,
        contentType: "text/html; charset=utf-8",
      });
    else {
      unexpected.push(route.request().url());
      await route.abort();
    }
  });
  await context.setOffline(true);
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לביחד" }),
  ).toBeVisible();
  await page.getByLabel("הכיתה שלי", { exact: true }).selectOption("g2");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "השיעור שלנו", exact: true }),
  ).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "פתיחת ההקרנה", exact: true }).click();
  const projection = await popupPromise;
  await expect(
    projection.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "השקף הבא", exact: true }).click();
  await expect(
    projection.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await page.getByRole("button", { name: "כניסת אדמין", exact: true }).click();
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "למרחב האדמין", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "כל הכיתות, סיפור משותף." }),
  ).toBeVisible();
  const row = page.getByRole("row").filter({
    has: page.getByRole("rowheader", { name: "כיתת דמה", exact: true }),
  });
  await expect(row.locator("td").nth(2)).toHaveText("1");
  await page.reload();
  await expect(row.locator("td").nth(2)).toHaveText("1");
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
