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
test("lesson shortcut opens group setup when empty and projects the chosen groups with roles without losing the slide", async ({
  page,
  context,
}) => {
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.getByRole("button", { name: "השקף הבא", exact: true }).click();
  await expect(
    projector.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "הקבוצות שלנו", exact: true }),
  ).toBeVisible();
  await expect(
    projector.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  await dialog
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("presenter");
  await dialog
    .getByRole("button", { name: "הקרנת קבוצות", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    projector.getByRole("heading", { name: "הקבוצות שלנו", exact: true }),
  ).toBeVisible();
  await expect(projector.locator(".projected-role")).toContainText("מציג/ה");
  await expect(projector.locator(".projected-members li")).toHaveCount(22);
  for (const member of await projector.locator(".projected-members li").all())
    await expect(member).toBeInViewport({ ratio: 1 });

  await page.getByRole("button", { name: "חזרה למצגת", exact: true }).click();
  await expect(
    projector.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  await expect(
    projector.getByRole("heading", { name: "הקבוצות שלנו", exact: true }),
  ).toBeVisible();
  await page.goto("/?view=remote");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "חזרה למצגת", exact: true }).click();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  await expect(
    projector.getByRole("heading", { name: "הקבוצות שלנו", exact: true }),
  ).toBeVisible();
});
