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
test("teacher controls projector size and focus, keeps all names and statuses visible, and restores content", async ({
  page,
  context,
}) => {
  const projector = await context.newPage();
  await projector.goto("/?view=projector&class=g2");
  await expect(projector.locator(".status-person strong")).toHaveCount(24);
  await page
    .getByLabel("גודל לוח התלמידים בהקרנה", { exact: true })
    .selectOption("large");
  await expect(projector.locator(".projector-page")).toHaveClass(/board-large/);
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
  ]) {
    await projector.setViewportSize(size);
    await expect(projector.locator(".status-tile").last()).toBeInViewport({
      ratio: 1,
    });
    await expect
      .poll(() =>
        projector
          .locator(".status-person strong")
          .evaluateAll((nodes) =>
            nodes.every((n) => n.scrollWidth <= n.clientWidth + 1),
          ),
      )
      .toBe(true);
    expect(
      await projector.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await projector.setViewportSize({ width: 1440, height: 900 });
  await page
    .getByRole("button", { name: "התמקדות בתלמידים", exact: true })
    .click();
  await expect(projector.locator(".projector-scene")).toBeHidden();
  await expect(projector.locator(".status-person strong")).toHaveCount(24);
  await expect(projector.locator(".status-tile").last()).toBeInViewport({
    ratio: 1,
  });
  const focusedFont = await projector
    .locator(".status-person strong")
    .first()
    .evaluate((n) => parseFloat(getComputedStyle(n).fontSize));
  expect(focusedFont).toBeGreaterThanOrEqual(26);
  await projector.reload();
  await expect(projector.locator(".projector-scene")).toBeHidden();
  await projector
    .getByRole("button", { name: "חזרה למצגת ולתלמידים", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "התמקדות בתלמידים", exact: true }),
  ).toBeVisible();
  await expect(
    projector.getByRole("heading", { name: "מה צמחים צריכים כדי לגדול?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "אזהרה 0 לאיתי לוי", exact: true })
    .click();
  await expect(projector.locator(".status-tile").first()).toHaveClass(
    /warning-1/,
  );
  await page
    .getByLabel("גודל לוח התלמידים בהקרנה", { exact: true })
    .selectOption("small");
  await expect(projector.locator(".projector-page")).toHaveClass(/board-small/);
});
test("focus fits a larger roster with full names and no lost attendance or warnings", async ({
  page,
  context,
}) => {
  await page.evaluate(() => {
    const key = "beyachad-demo-v1",
      s = JSON.parse(localStorage.getItem(key));
    s.students = Array.from({ length: 40 }, (_, i) => ({
      id: `p${i}`,
      name: `תלמיד בדיקה ${i + 1}`,
      emoji: "🌱",
      present: i !== 0,
      hearts: i % 3,
      warning: i % 3,
    }));
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload();
  await page
    .getByRole("button", { name: "התמקדות בתלמידים", exact: true })
    .click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector&class=g2");
  await expect(projector.locator(".status-person strong")).toHaveCount(40);
  await expect(projector.locator(".status-person strong").last()).toHaveText(
    "תלמיד בדיקה 40",
  );
  await expect(projector.locator(".status-tile").last()).toBeInViewport({
    ratio: 1,
  });
  await expect(projector.locator(".status-tile").first()).toHaveClass(
    /is-absent/,
  );
  await expect(projector.locator(".status-tile").nth(2)).toHaveClass(
    /warning-2/,
  );
});
