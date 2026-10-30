import { test, expect } from "@playwright/test";
test("a separate mobile browser can warn from the student list, undo and confirm further responses", async ({
  page,
  browser,
  context,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({ role: "teacher", classId: "g2" }),
    ),
  );
  await page.goto("/");
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "יצירת קוד חיבור", exact: true })
    .click();
  const code = await page.locator(".pair-code").innerText();
  await page.getByRole("button", { name: "סגירה", exact: true }).click();
  const remoteContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    remote = await remoteContext.newPage();
  try {
    await remote.goto("http://127.0.0.1:5173/?view=join");
    await remote.getByLabel("קוד חיבור", { exact: true }).fill(code);
    await remote
      .getByRole("button", { name: "חיבור לשיעור", exact: true })
      .click();
    await remote.getByRole("button", { name: "תלמידים", exact: true }).click();
    const warning = remote.getByRole("button", {
      name: /^אזהרה מהירה לאיתי לוי,/,
    });
    await expect(warning).toBeVisible();
    const size = await warning.boundingBox();
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
    await warning.click();
    await expect(warning).toHaveAccessibleName(
      "אזהרה מהירה לאיתי לוי, אזהרה ראשונה",
    );
    await expect(
      page.getByRole("button", { name: "אזהרה 1 לאיתי לוי", exact: true }),
    ).toBeVisible();
    await expect(
      projector.getByRole("button", { name: "אזהרה 1 לאיתי לוי", exact: true }),
    ).toBeVisible();
    await expect(
      remote.getByRole("dialog", { name: "רגע של עידוד", exact: true }),
    ).toBeVisible();
    await remote.getByRole("button", { name: "ביטול", exact: true }).click();
    await expect(warning).toHaveAccessibleName(
      "אזהרה מהירה לאיתי לוי, ללא אזהרה",
    );
    await expect(
      projector.getByRole("button", { name: "אזהרה 0 לאיתי לוי", exact: true }),
    ).toBeVisible();
    await warning.click();
    await expect(warning).toHaveText("1");
    await warning.click();
    await expect(warning).toHaveText("2");
    await expect(
      projector.getByRole("button", { name: "אזהרה 2 לאיתי לוי", exact: true }),
    ).toBeVisible();
    await warning.click();
    await expect(
      remote.getByRole("button", { name: "אישור ההצעה", exact: true }),
    ).toBeVisible();
    await expect(
      projector.getByRole("button", { name: "אזהרה 2 לאיתי לוי", exact: true }),
    ).toBeVisible();
    await remote
      .getByRole("dialog")
      .getByRole("button", { name: "ביטול", exact: true })
      .click();
    expect(
      await remote.evaluate(
        () =>
          JSON.parse(localStorage.getItem("beyachad-demo-v1")).students[0]
            .warning,
      ),
    ).toBe(2);
    expect(
      await remote.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await remoteContext.close();
  }
});
