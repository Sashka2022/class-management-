import { test, expect } from "./fixtures";
import assert from "node:assert/strict";
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    if (!sessionStorage.getItem("beyachad-session-v1"))
      sessionStorage.setItem(
        "beyachad-session-v1",
        JSON.stringify({ role: "teacher", classId: "g2" }),
      );
  });
});
test("a complete lesson keeps private edits separate from the live projection", async ({
  context: ctx,
}) => {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://127.0.0.1:5173");
  await page
    .getByRole("heading", { name: "השיעור שלנו", exact: true })
    .waitFor();

  const proj = await ctx.newPage();
  await proj.goto("http://127.0.0.1:5173/?view=projector");
  await proj
    .getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" })
    .waitFor();
  await page.getByRole("button", { name: "השקף הבא", exact: true }).click();
  await proj.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }).waitFor();
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1")),
  );
  assert.equal(data.students[0].hearts, 1);
  await page.getByRole("button", { name: "ביטול", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("beyachad-demo-v1")).students[0].hearts,
    ),
    0,
  );
  await page
    .getByRole("button", { name: "סימון היעדרות: איתי לוי", exact: true })
    .click();
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1")),
  );
  const ids = data.groups.flatMap((g) => g.ids);
  assert.equal(ids.length, 21);
  assert.equal(new Set(ids).size, 21);
  assert(!ids.includes("s0"));
  assert.equal(await proj.locator("h2").innerText(), "כל צמח מתחיל בזרע קטן");
  await page
    .getByRole("button", { name: "הצג קבוצות לכיתה", exact: true })
    .click();
  await proj.getByRole("heading", { name: "הקבוצות שלנו" }).waitFor();
  const published = await proj.locator(".projected-groups").innerText();
  await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  assert.equal(await proj.locator(".projected-groups").innerText(), published);
  await page.getByRole("button", { name: "השיעור שלי", exact: true }).click();
  await page.getByRole("button", { name: "חזרה למצגת", exact: true }).click();
  await proj.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }).waitFor();
  await page.getByRole("button", { name: "מהלך השיעור", exact: true }).click();
  await page.getByRole("button", { name: "התחלת טיימר", exact: true }).click();
  await page.waitForTimeout(1100);
  let end = await page.evaluate(
    () => JSON.parse(localStorage.getItem("beyachad-demo-v1")).timer.end,
  );
  assert(end > Date.now());
  await page.reload();
  await page.getByRole("button", { name: "השהיית טיימר" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("beyachad-demo-v1")).timer.end,
    ),
    end,
  );
  await page.getByRole("button", { name: "השהיית טיימר" }).click();
  await page
    .getByRole("button", { name: "מה עושים עכשיו?", exact: true })
    .click();
  const instruction = await proj.locator("h2").innerText();
  await page
    .getByRole("button", { name: "עריכת מגלים יחד", exact: true })
    .click();
  await page.getByLabel("הנחיה קצרה").fill("הנחיה חדשה בטיוטה");
  await page.getByRole("button", { name: "שמירת השלב" }).click();
  await page.waitForTimeout(100);
  assert.equal(await proj.locator("h2").innerText(), instruction);
  const pub = await proj.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1-projection")),
  );
  assert(pub.students.every((p) => typeof p.warning === "number"));
  assert(!JSON.stringify(pub).includes("summary"));
  await page
    .getByRole("button", { name: "מה עושים עכשיו?", exact: true })
    .click();
  await proj.getByRole("heading", { name: "הנחיה חדשה בטיוטה" }).waitFor();
  const remote = await ctx.newPage();
  await remote.goto("http://127.0.0.1:5173/?view=remote");
  await remote.getByRole("button", { name: "הבא", exact: true }).click();
  await proj.getByRole("heading", { name: "בואו נחשוב כמו חוקרים" }).waitFor();
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
  await proj
    .getByRole("heading", { name: "עוד יום של צמיחה, ביחד." })
    .waitFor();
  await page.getByRole("button", { name: "על קלי קלוח" }).click();
  await page.getByRole("button", { name: "איפוס נתוני ההדגמה" }).click();
  await page.setViewportSize({ width: 390, height: 844 });

  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await remote.setViewportSize({ width: 390, height: 844 });

  assert.equal(
    await remote.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
});

test("warning actions and student import update the classroom status board", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "הכיתה שלי", exact: true }).click();
  await page.getByRole("button", { name: "הוספת תלמידים" }).click();
  await page.getByLabel("שמות תלמידים").fill("תלמידת הדגמה א\nתלמיד הדגמה ב");
  await page.getByRole("button", { name: "הוספה לכיתה", exact: true }).click();
  await expect(page.locator(".count")).toHaveText("26");
  await page
    .getByRole("button", { name: "פרטי איתי לוי", exact: true })
    .click();
  await page.getByRole("button", { name: "הוספת אזהרה", exact: true }).click();
  await expect(
    page.getByText("אזהרה ראשונה · צהוב", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "הוספת אזהרה", exact: true }).click();
  await expect(
    page.getByText("אזהרה שנייה · אדום", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "אירוע נוסף", exact: true }).click();
  await expect(page.getByRole("button", { name: "אישור ההצעה" })).toBeVisible();
  await page.getByRole("button", { name: "אישור ההצעה" }).click();
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await expect(
    projection.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
  await expect(
    projection.getByRole("button", { name: "אזהרה 2 לאיתי לוי", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("desktop and mobile views fit their viewport", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["", "?view=remote", "?view=projector"]) {
      await page.goto("/" + view);
      await page.locator("h1,h2").first().waitFor();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});
