import { createTemplate } from "./helpers/templates";
import { test, expect } from "./fixtures";
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

test("class mode and quote journal can be opened from the sidebar on any page", async ({
  page,
}) => {
  await page.getByRole("button", { name: "הכיתה שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת מצב כיתה מתפריט הצד", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "מצב כיתה", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /מקשיבים יחד/ }).click();
  await expect(
    page.getByRole("heading", { name: "כל תלמיד הוא עולם.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "פתיחת שווה ציטוט מתפריט הצד", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "שווה ציטוט", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("מה נאמר בכיתה?", { exact: true })
    .fill("ציטוט שנשמר דרך התפריט");
  await page.getByRole("button", { name: "שמירת ציטוט", exact: true }).click();
  await expect(page.locator(".quote-card")).toContainText(
    "ציטוט שנשמר דרך התפריט",
  );
  await page.getByRole("button", { name: "סגירה", exact: true }).click();
  await page.getByRole("button", { name: "השיעור שלי", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "מצב הכיתה המוצג" }),
  ).toContainText("מקשיבים יחד");
  await expect(
    page.getByRole("button", { name: "שווה ציטוט", exact: true }),
  ).toBeVisible();
});

test("Hebrew mode labels fit every badge without splitting words, including narrow and extra-media views", async ({
  page,
  context,
}) => {
  async function verify(target, selector) {
    await expect(target.locator(selector)).toBeVisible();
    await expect
      .poll(() =>
        target.locator(selector).evaluate((badge) => {
          const title = badge.querySelector("h2"),
            text = title.firstChild,
            bounds = badge.getBoundingClientRect();
          if (!text) return false;
          return [...title.textContent.matchAll(/\S+/g)].every((match) => {
            const range = document.createRange();
            range.setStart(text, match.index);
            range.setEnd(text, match.index + match[0].length);
            const rects = [...range.getClientRects()].filter(
              (r) => r.width > 0,
            );
            return (
              rects.length === 1 &&
              rects.every(
                (r) =>
                  r.left >= bounds.left - 1 &&
                  r.right <= bounds.right + 1 &&
                  r.top >= bounds.top - 1 &&
                  r.bottom <= bounds.bottom + 1,
              )
            );
          });
        }),
      )
      .toBe(true);
  }
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByRole("button", { name: /מקשיבים יחד/ }).click();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await verify(page, ".slide-container>.class-mode-badge");
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await verify(projection, ".projector-content>.class-mode-badge");
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page
    .getByLabel("כותרת מצב כיתה")
    .fill("מקשיבים ומשתפים ברעיונות חדשים");
  await page.getByRole("button", { name: "הצגת המצב שלי" }).click();
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  await page.getByLabel("קישור לאתר או YouTube").fill("https://example.com");
  await page.getByRole("button", { name: "הוספת קישור", exact: true }).click();
  await page.getByRole("button", { name: "חלון נוסף", exact: true }).click();
  await verify(page, ".slide-container>.class-mode-badge");
  await verify(projection, ".projector-content>.class-mode-badge");
  await page.setViewportSize({ width: 390, height: 844 });
  await verify(page, ".slide-container>.class-mode-badge");
});
