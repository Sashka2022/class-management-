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
test("all students and warnings stay visible beside content and sync to class", async ({
  page,
  context,
}) => {
  const board = page.getByRole("region", { name: "סטטוס כל התלמידים" });
  await expect(board.locator(".status-tile")).toHaveCount(24);
  await expect(board.locator(".status-tile").last()).toBeInViewport();
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await page
    .getByRole("button", { name: "אזהרה 0 לאיתי לוי", exact: true })
    .click();
  await expect(
    projection.getByRole("button", { name: "אזהרה 1 לאיתי לוי", exact: true }),
  ).toBeVisible();
  await expect(projection.locator(".status-tile").last()).toBeInViewport();
  await page
    .getByRole("button", { name: "חיזוק מהיר לאיתי לוי", exact: true })
    .click();
  await expect(
    projection.getByRole("button", {
      name: "חיזוק מהיר לאיתי לוי",
      exact: true,
    }),
  ).toHaveText("1");
});
test("image files persist in browser and only show after publication; sites support a second window", async ({
  page,
  context,
}) => {
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  await page
    .getByLabel("העלאת מדיה")
    .setInputFiles({
      name: "demo.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>',
      ),
    });
  await expect(page.locator(".media-library")).toContainText("demo.svg");
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await expect(
    projection.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "הצג לכיתה", exact: true }).click();
  await expect(projection.getByRole("img", { name: "demo.svg" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "demo.svg" })).toBeVisible();
  await page
    .getByRole("button", { name: "תוכן, קבצים וקישורים", exact: true })
    .click();
  await page
    .getByLabel("קישור לאתר או YouTube")
    .fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "הוספת קישור", exact: true }).click();
  await page.getByRole("button", { name: "חלון נוסף", exact: true }).click();
  await expect(page.locator(".additional-content iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  await expect(projection.locator(".projector-content iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  await expect(projection.getByRole("img", { name: "demo.svg" })).toBeVisible();
  await page
    .getByRole("button", { name: "סגירת חלון נוסף", exact: true })
    .click();
  await expect(projection.locator(".projector-content iframe")).toHaveCount(0);
});
