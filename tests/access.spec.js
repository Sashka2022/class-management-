import { createTemplate } from "./helpers/templates";
import { test, expect } from "./fixtures";
async function login(page, role = "teacher", classId = "g2") {
  await page
    .getByRole("button", {
      name: role === "admin" ? "כניסת אדמין" : "כניסת מורה",
      exact: true,
    })
    .click();
  if (role === "teacher")
    await page.getByLabel("הכיתה שלי", { exact: true }).selectOption(classId);
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page
    .getByRole("button", {
      name: role === "admin" ? "למרחב האדמין" : "נכנסים לכיתה",
      exact: true,
    })
    .click();
}
async function endLesson(page) {
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
}
async function giveHeart(page, name = "איתי לוי") {
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await page.getByRole("button", { name: `לב ל${name}`, exact: true }).click();
}
test("shared password gates teacher and admin entry and sessions survive refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("סיסמה", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "הסיסמה אינה נכונה. נסו שוב.",
  );
  await expect(
    page.getByRole("heading", { name: "השיעור שלנו", exact: true }),
  ).toHaveCount(0);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "השיעור שלנו", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "החלפת כיתה" })).toContainText(
    "כיתת דמה",
  );
  await page.goto("/?view=admin");
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לביחד" }),
  ).toBeVisible();
  await login(page, "admin");
  await expect(
    page.getByRole("heading", { name: "כל הכיתות, סיפור משותף." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "כל הכיתות, סיפור משותף." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לביחד" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לביחד" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }).includes("1111"),
    ),
  ).toBe(false);
});
test("class data and projections are isolated and any teacher can resume the class", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await login(page);
  await giveHeart(page);
  const projection = await context.newPage();
  await projection.goto("/?view=projector&class=g2");
  await page.getByRole("button", { name: "השקף הבא", exact: true }).click();
  await expect(
    projection.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await login(page, "teacher", "g1");
  await page.getByRole("button", { name: "הכיתה שלי", exact: true }).click();
  await expect(page.locator(".count")).toHaveText("0");
  await page.getByRole("button", { name: "הוספת תלמידים" }).click();
  await page.getByLabel("שמות תלמידים").fill("נועה הדגמה");
  await page.getByRole("button", { name: "הוספה לכיתה", exact: true }).click();
  await page
    .getByRole("button", { name: "לב לנועה הדגמה", exact: true })
    .click();
  await expect(
    projection.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/?view=projector&class=g1");
  await expect(
    other.getByRole("heading", { name: "כאן יופיע התוכן של הכיתה" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await login(page);
  await expect(page.getByRole("button", { name: "החלפת כיתה" })).toContainText(
    "כיתת דמה",
  );
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "לב לאיתי לוי", exact: true }),
  ).toHaveText("1");
});
test("admin totals persist across new lessons, undo is counted, completion is idempotent, and new classes are available", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await login(page);
  await giveHeart(page);
  await page.getByRole("button", { name: "ביטול", exact: true }).click();
  const admin = await context.newPage();
  await admin.goto("/?view=admin");
  await login(admin, "admin");
  const row = () =>
    admin.getByRole("row").filter({
      has: admin.getByRole("rowheader", { name: "כיתת דמה", exact: true }),
    });
  await expect(row().locator("td").nth(2)).toHaveText("0");
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  await expect(row().locator("td").nth(2)).toHaveText("1");
  await endLesson(page);
  await endLesson(page);
  await expect(row().locator("td").nth(1)).toHaveText("1");
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page);
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await expect(row().locator("td").nth(2)).toHaveText("1");
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  await expect(row().locator("td").nth(2)).toHaveText("2");
  await endLesson(page);
  await expect(row().locator("td").nth(1)).toHaveText("2");
  await admin.reload();
  await expect(row().locator("td").nth(2)).toHaveText("2");
  await admin.getByLabel("שם הכיתה", { exact: true }).fill("ז1");
  await admin.getByRole("button", { name: "הוספת כיתה", exact: true }).click();
  await expect(admin.getByRole("status")).toHaveText("כיתה ז1 נוספה בהצלחה");
  await admin.getByLabel("שם הכיתה", { exact: true }).fill("ז1");
  await admin.getByRole("button", { name: "הוספת כיתה", exact: true }).click();
  await expect(admin.getByRole("alert")).toHaveText("כיתה בשם הזה כבר קיימת.");
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "כיתה ז1", exact: true }),
  ).toHaveCount(1);
  await login(
    page,
    "teacher",
    await page
      .getByRole("option", { name: "כיתה ז1", exact: true })
      .getAttribute("value"),
  );
  await expect(page.getByRole("button", { name: "החלפת כיתה" })).toContainText(
    "ז1",
  );
});
test("login and admin fit narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "נכנסים לכיתה", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await login(page, "admin");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("columnheader", { name: "לבבות מצטברים" }),
  ).toHaveCount(1);
});
