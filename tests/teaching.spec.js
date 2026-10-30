import { createTemplate } from "./helpers/templates";
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
test("class mode is prominent beside the slide, survives refresh and can be removed", async ({
  page,
  context,
}) => {
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByRole("button", { name: /עבודה שקטה/ }).click();
  await expect(
    page.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toContainText("🤫");
  await expect(
    projector.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toContainText("עבודה שקטה");
  await expect(
    projector.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
  await expect(page.locator(".status-tile").last()).toBeInViewport();
  const content = await page.locator(".slide-container>.slide").boundingBox(),
    mode = await page
      .locator(".slide-container>.class-mode-badge")
      .boundingBox();
  expect(Math.abs(content.y - mode.y)).toBeLessThan(5);
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toContainText("עבודה שקטה");
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByLabel("כותרת מצב כיתה").fill("זמן יצירה");
  await page.getByLabel("אייקון למצב").selectOption("🎨");
  await page.getByRole("button", { name: "הצגת המצב שלי" }).click();
  await expect(
    projector.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toContainText("זמן יצירה");
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByRole("button", { name: "הסרת מצב הכיתה מההקרנה" }).click();
  await expect(
    projector.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toHaveCount(0);
});
test("quotes are private until published, editable, retained between lessons and deletable", async ({
  page,
  context,
}) => {
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.getByRole("button", { name: "שווה ציטוט", exact: true }).click();
  await page
    .getByLabel("מה נאמר בכיתה?")
    .fill("גם שאלה קטנה יכולה לפתוח עולם גדול.");
  await page.getByLabel("תלמיד או תלמידה לציטוט").selectOption("s0");
  await page.getByRole("button", { name: "שמירת ציטוט", exact: true }).click();
  await expect(page.locator(".quote-card")).toContainText("איתי לוי");
  await expect(
    projector.getByText("גם שאלה קטנה יכולה לפתוח עולם גדול.", { exact: true }),
  ).toHaveCount(0);
  const publicState = await projector.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1-projection")),
  );
  expect(publicState.quotes).toBeUndefined();
  expect(JSON.stringify(publicState)).not.toContain("שאלה קטנה");
  await page
    .getByRole("button", { name: "הצגת הציטוט לכיתה", exact: true })
    .click();
  await expect(projector.getByRole("blockquote")).toContainText("שאלה קטנה");
  await page.getByRole("button", { name: "שווה ציטוט", exact: true }).click();
  await page.getByRole("button", { name: /עריכת ציטוט:/ }).click();
  await page
    .getByLabel("עריכת הציטוט", { exact: true })
    .fill("לכל רעיון יש מקום.");
  await page
    .getByRole("button", { name: "שמירת השינויים", exact: true })
    .click();
  await expect(page.locator(".quote-card")).toContainText("לכל רעיון יש מקום.");
  await expect(projector.getByRole("blockquote")).toContainText("שאלה קטנה");
  await page.getByRole("button", { name: "סגירה", exact: true }).click();
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page);
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await page.getByRole("button", { name: "שווה ציטוט", exact: true }).click();
  await expect(page.locator(".quote-card")).toHaveCount(1);
  await page.getByLabel("השיעור הנוכחי", { exact: true }).check();
  await expect(page.locator(".quote-card")).toHaveCount(0);
  await page.getByLabel("השיעור הנוכחי", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "הצגת הציטוט לכיתה", exact: true })
    .click();
  await expect(projector.getByRole("blockquote")).toContainText(
    "לכל רעיון יש מקום.",
  );
  await page.getByRole("button", { name: "שווה ציטוט", exact: true }).click();
  await page.getByRole("button", { name: /מחיקת ציטוט:/ }).click();
  await expect(page.locator(".quote-card")).toHaveCount(0);
  await expect(projector.getByRole("blockquote")).toHaveCount(0);
});
test("new lesson clears class mode and the mobile remote exposes both tools", async ({
  page,
  browser,
}) => {
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByRole("button", { name: /עבודה בזוגות/ }).click();
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page);
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await expect(page.locator(".class-mode-badge")).toHaveCount(0);
  await page.goto("/?view=remote");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "מצב כיתה", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "שווה ציטוט", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
