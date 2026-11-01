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

test("projection keeps mode, lesson stages and live clocks alongside every content view", async ({
  page,
  context,
}) => {
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  const plan = projector.getByRole("navigation", {
    name: "מהלך השיעור המוקרן",
  });
  await expect(plan.locator("li")).toHaveCount(5);
  await expect(plan.locator('[aria-current="step"]')).toContainText(
    "מגלים יחד",
  );
  await expect(projector.locator(".projection-mode")).toContainText("טרם נבחר");
  await expect(
    projector.getByLabel("זמן שנותר לשלב", { exact: true }),
  ).toHaveText("12:00");
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page.getByRole("button", { name: /עבודה שקטה/ }).click();
  await expect(
    projector.locator(".projector-hud .class-mode-badge"),
  ).toContainText("עבודה שקטה");
  await page.getByRole("button", { name: "מהלך השיעור", exact: true }).click();
  await page
    .locator(".stage-item")
    .filter({ hasText: "צומחים בקבוצות" })
    .locator(".stage-main")
    .click();
  await expect(plan.locator('[aria-current="step"]')).toContainText(
    "צומחים בקבוצות",
  );
  await expect(
    projector.getByLabel("זמן שנותר לשלב", { exact: true }),
  ).toHaveText("15:00");
  await page.getByRole("button", { name: "התחלת טיימר", exact: true }).click();
  await expect(
    projector.getByLabel("זמן שנותר לשלב", { exact: true }),
  ).not.toHaveText("15:00");
  await page
    .getByRole("button", { name: "מה עושים עכשיו?", exact: true })
    .click();
  await expect(projector.locator(".projector-hud")).toBeVisible();
  await expect(plan).toBeVisible();
  const before = await projector
    .getByLabel("זמן מתחילת השיעור", { exact: true })
    .innerText();
  await page.getByRole("button", { name: "השהיית טיימר", exact: true }).click();
  await expect(
    projector.getByLabel("זמן מתחילת השיעור", { exact: true }),
  ).not.toHaveText(before);
  const publicData = await projector.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1-projection")),
  );
  expect(
    publicData.stages.every(
      (stage) => !("instruction" in stage) && !("equipment" in stage),
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
  await expect(projector.locator(".projection-mode")).toContainText(
    "השיעור הסתיים",
  );
  await expect(plan.locator("li.completed")).toHaveCount(2);
  const frozen = await projector
    .getByLabel("זמן מתחילת השיעור", { exact: true })
    .innerText();
  const later = new Date(Date.now() + 65000);
  await projector.clock.setSystemTime(later);
  const wall = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(later);
  await expect(projector.getByLabel("שעה נוכחית", { exact: true })).toHaveText(
    wall,
  );
  await expect(
    projector.getByLabel("זמן מתחילת השיעור", { exact: true }),
  ).toHaveText(frozen);
});

test("projector context fits phones, tablets and boards with a readable selected mode", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "מצב כיתה", exact: true }).click();
  await page
    .getByLabel("כותרת מצב כיתה")
    .fill("מקשיבים ומשתפים ברעיונות חדשים");
  await page
    .getByRole("button", { name: "הצגת המצב שלי", exact: true })
    .click();
  await page
    .locator(".stage-item")
    .filter({ hasText: "מחשבה לדרך" })
    .locator(".stage-main")
    .click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1024, 768],
    [1366, 768],
    [844, 390],
    [1440, 900],
    [1920, 1080],
  ]) {
    await projector.setViewportSize({ width, height });
    for (const selector of [
      ".projector-hud",
      ".projector-lesson-plan",
      ".projection-clocks",
      ".projection-mode",
    ]) {
      await expect(projector.locator(selector)).toBeInViewport({ ratio: 1 });
    }
    await expect(
      projector.locator('.projector-lesson-plan [aria-current="step"]'),
    ).toBeInViewport({ ratio: 0.99 });
    const scene = await projector.locator(".projector-scene").boundingBox();
    const header = await projector
      .locator(".projector-lesson-plan")
      .boundingBox();
    expect(scene.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
    expect(scene.height).toBeGreaterThan(100);
    expect(
      await projector.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const fixed = new Date("2026-11-01T09:37:00Z");
  await projector.clock.setSystemTime(fixed);
  const expected = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fixed);
  await expect(projector.getByLabel("שעה נוכחית", { exact: true })).toHaveText(
    expected,
  );
});
