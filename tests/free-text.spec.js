import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({ role: "teacher", classId: "g2" }),
    ),
  );
  await page.goto("/");
});
test("free text saves privately, projects explicitly, preserves lines and can be edited without changing the live snapshot", async ({
  page,
  context,
}) => {
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "הקרנת הטקסט", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("כותרת לטקסט (לא חובה)").fill("המשימה שלנו");
  const text = "קוראים את הפסקה הראשונה.\nכותבים שתי שאלות במחברת.";
  await page.getByLabel("הטקסט שיוצג לכיתה").fill(text);
  await page
    .getByRole("button", { name: "שמירת טקסט לספרייה", exact: true })
    .click();
  await expect(page.locator(".media-library")).toContainText("המשימה שלנו");
  await expect(projection.locator(".free-text-body")).toHaveCount(0);
  await page.getByRole("button", { name: "הצג לכיתה", exact: true }).click();
  await expect(projection.locator(".free-text-body")).toHaveText(text);
  await expect(projection.locator(".free-text-body")).toHaveCSS(
    "white-space",
    "pre-wrap",
  );
  await expect(
    projection.getByRole("heading", { name: "המשימה שלנו", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".free-text-body")).toHaveText(text);
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  await page
    .getByRole("button", { name: "עריכת הטקסט המשימה שלנו", exact: true })
    .click();
  await page.getByLabel("הטקסט שיוצג לכיתה").fill("הנחיה מתוקנת");
  await page
    .getByRole("button", { name: "שמירת טקסט לספרייה", exact: true })
    .click();
  await expect(projection.locator(".free-text-body")).toHaveText(text);
  await expect(page.locator(".media-library>div")).toHaveCount(1);
  await page.getByRole("button", { name: "הצג לכיתה", exact: true }).click();
  await expect(projection.locator(".free-text-body")).toHaveText(
    "הנחיה מתוקנת",
  );
  await page.getByRole("button", { name: "חזרה למצגת", exact: true }).click();
  await expect(
    projection.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
});
test("direct text projection also saves to the library and treats markup as plain text", async ({
  page,
  context,
}) => {
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  const text =
    '<img src="x" onerror="window.textExecuted=true">\nזהו טקסט בלבד.';
  await page.getByLabel("הטקסט שיוצג לכיתה").fill(text);
  await page.getByRole("button", { name: "הקרנת הטקסט", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(projection.locator(".free-text-body")).toHaveText(text);
  await expect(projection.locator(".free-text-body img")).toHaveCount(0);
  expect(await projection.evaluate(() => window.textExecuted)).toBeUndefined();
  const library = await page.evaluate(
    () => JSON.parse(localStorage.getItem("beyachad-demo-v1")).library,
  );
  expect(library).toHaveLength(1);
  expect(library[0].text).toBe(text);
  expect(library[0].title).toBe("");
});
test("compact and expanded status boards keep every name visible in teacher and classroom views", async ({
  page,
  context,
}) => {
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  for (const target of [page, projection]) {
    await target
      .getByRole("button", { name: "צמצום תצוגת תלמידים", exact: true })
      .click();
    for (const width of [1440, 768, 390]) {
      await target.setViewportSize({ width, height: 1000 });
      const names = target.locator(".class-status-board .status-person strong");
      await expect(names).toHaveCount(24);
      for (const name of await names.all()) await expect(name).toBeVisible();
      expect(
        await names.evaluateAll((els) =>
          els.every(
            (el) =>
              el.textContent.trim().length > 0 &&
              getComputedStyle(el).display !== "none" &&
              el.scrollWidth <= el.clientWidth + 1,
          ),
        ),
      ).toBe(true);
      expect(
        await target.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await target.setViewportSize({ width: 1440, height: 1000 });
    await expect(target.locator(".status-tile").last()).toBeInViewport({
      ratio: 1,
    });
    await target
      .getByRole("button", { name: "הרחבת תצוגת תלמידים", exact: true })
      .click();
    await expect(target.locator(".status-person strong")).toHaveCount(24);
  }
});
