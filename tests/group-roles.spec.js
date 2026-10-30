import { test, expect } from "@playwright/test";
import { createTemplate } from "./helpers/templates";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({ role: "teacher", classId: "g2" }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
});
async function setup(page) {
  await page
    .getByRole("button", { name: "קבוצה ידנית חדשה", exact: true })
    .click();
  const option = await page
    .getByLabel("שיבוץ איתי לוי", { exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await page.getByLabel("שיבוץ איתי לוי", { exact: true }).selectOption(option);
  await page.getByLabel("שיבוץ אמה כהן", { exact: true }).selectOption(option);
}
test("four roles have explanations and repeated roles and independent icons persist through refresh and regrouping", async ({
  page,
}) => {
  const guide = page.getByRole("region", { name: "הסבר ארבעת התפקידים" });
  await expect(guide.locator("article")).toHaveCount(4);
  await expect(guide).toContainText("אפשר לתת את אותו תפקיד לכמה תלמידים");
  await setup(page);
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("leader");
  await page
    .getByLabel("תפקיד של אמה כהן", { exact: true })
    .selectOption("leader");
  await expect(
    page.getByLabel("אייקון תפקיד של איתי לוי", { exact: true }),
  ).toHaveValue("🧭");
  await page
    .getByLabel("אייקון תפקיד של איתי לוי", { exact: true })
    .selectOption("🚩");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1")),
  );
  expect(data.groupRoles.s0).toEqual({ roleId: "leader", icon: "🚩" });
  expect(data.groupRoles.s1.roleId).toBe("leader");
  expect(data.students[0].emoji).toBe("🐻");
  await page.reload();
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  await expect(
    page.getByLabel("אייקון תפקיד של איתי לוי", { exact: true }),
  ).toHaveValue("🚩");
  await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  await expect(
    page.getByLabel("תפקיד של איתי לוי", { exact: true }),
  ).toHaveValue("leader");
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("recorder");
  await expect(
    page.getByLabel("אייקון תפקיד של איתי לוי", { exact: true }),
  ).toHaveValue("✍️");
  await page.getByLabel("תפקיד של איתי לוי", { exact: true }).selectOption("");
  await expect(
    page.getByLabel("אייקון תפקיד של איתי לוי", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("תפקיד של אמה כהן", { exact: true }),
  ).toHaveValue("leader");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const control = await page
    .getByLabel("תפקיד של אמה כהן", { exact: true })
    .boundingBox();
  expect(control.width).toBeGreaterThan(140);
});
test("projected roles are snapshots and only change on explicit publication; a new lesson clears assignments", async ({
  page,
  context,
}) => {
  await setup(page);
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("timekeeper");
  await page
    .getByLabel("אייקון תפקיד של איתי לוי", { exact: true })
    .selectOption("⌛");
  const projection = await context.newPage();
  await projection.goto("/?view=projector");
  await expect(projection.locator(".projected-role")).toHaveCount(0);
  await page
    .getByRole("button", { name: "הצג קבוצות לכיתה", exact: true })
    .click();
  await expect(projection.locator(".projected-role")).toContainText(
    "אחראי/ת זמן",
  );
  await expect(projection.locator(".projected-role")).toContainText("⌛");
  await expect(projection.locator(".projected-role")).toContainText(
    "תפקיד: אחראי/ת זמן",
  );
  await expect(projection.locator(".projected-role-empty")).toHaveText(
    "תפקיד: טרם נבחר",
  );

  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("presenter");
  await expect(projection.locator(".projected-role")).toContainText(
    "אחראי/ת זמן",
  );
  await expect(
    page.getByText("יש שינויים בקבוצות או בתפקידים שעדיין לא הוקרנו.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "עדכון הקבוצות והתפקידים בהקרנה",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("יש שינויים בקבוצות או בתפקידים שעדיין לא הוקרנו.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(projection.locator(".projected-role")).toContainText("מציג/ה");
  await page
    .getByRole("button", { name: "קבוצה ידנית חדשה", exact: true })
    .click();
  const dest = await page
    .getByLabel("העברת איתי לוי לקבוצה", { exact: true })
    .locator("option")
    .last()
    .getAttribute("value");
  await page
    .getByLabel("העברת איתי לוי לקבוצה", { exact: true })
    .selectOption(dest);
  await expect(
    page.getByLabel("תפקיד של איתי לוי", { exact: true }),
  ).toHaveValue("presenter");
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page);
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("beyachad-demo-v1")).groupRoles,
    ),
  ).toEqual({});
});
