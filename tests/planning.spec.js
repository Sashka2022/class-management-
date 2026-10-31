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
test("bulk roster import and compact status preserve every student", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "צמצום תצוגת תלמידים", exact: true })
    .click();
  await expect(page.locator(".class-status-board")).toHaveClass(/compact/);
  await expect(page.locator(".status-tile")).toHaveCount(24);
  await page
    .getByRole("button", { name: "הרחבת תצוגת תלמידים", exact: true })
    .click();
  await page.getByRole("button", { name: "הכיתה שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "הדבקת רשימת תלמידים", exact: true })
    .click();
  await page.getByLabel("טעינת רשימה מקובץ טקסט").setInputFiles({
    name: "names.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("נועה הדגמה\nעידו הדגמה\nתמר הדגמה"),
  });
  await expect(page.getByLabel("שמות תלמידים")).toHaveValue(
    "נועה הדגמה\nעידו הדגמה\nתמר הדגמה",
  );
  await page.getByRole("button", { name: "הוספה לכיתה", exact: true }).click();
  await expect(page.locator(".count")).toHaveText("27");
});
test("daily plan persists per date and can be projected explicitly", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "המבט היומי", exact: true }).click();
  await page.getByLabel("תאריך סדר יום").fill("2026-11-01");
  await page
    .getByRole("button", { name: "הוספת פעילות לסדר היום", exact: true })
    .click();
  await page.getByLabel("פעילות 1", { exact: true }).fill("חשבון");
  await page.getByLabel("שעה 1", { exact: true }).fill("09:15");
  await page.getByLabel("הערה 1", { exact: true }).fill("מחברת משובצת");
  await page.getByRole("button", { name: "הצגת סדר היום לכיתה" }).click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await expect(projector.getByText("חשבון", { exact: true })).toBeVisible();
  await page.getByLabel("תאריך סדר יום").fill("2026-11-02");
  await expect(page.getByLabel("פעילות 1", { exact: true })).toHaveCount(0);
  await page.getByLabel("תאריך סדר יום").fill("2026-11-01");
  await expect(page.getByLabel("פעילות 1", { exact: true })).toHaveValue(
    "חשבון",
  );
  await page.reload();
  await page.getByRole("button", { name: "המבט היומי", exact: true }).click();
  await page.getByLabel("תאריך סדר יום").fill("2026-11-01");
  await expect(page.getByLabel("פעילות 1", { exact: true })).toHaveValue(
    "חשבון",
  );
});
test("manual groups start empty and assign students; different and personal templates work", async ({
  page,
}) => {
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  await page
    .getByRole("button", { name: "קבוצה ידנית חדשה", exact: true })
    .click();
  await page.getByLabel(/^שם קבוצה /).fill("קבוצת שמש");
  await page
    .getByLabel("שיבוץ איתי לוי", { exact: true })
    .selectOption({ label: "קבוצת שמש" });
  await expect(page.locator(".group-card")).toContainText("איתי לוי");
  await page
    .getByLabel("העברת איתי לוי לקבוצה", { exact: true })
    .selectOption("");
  await expect(
    page.getByLabel("שיבוץ איתי לוי", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await expect(page.locator(".template-card")).toHaveCount(0);
  await expect(page.getByLabel("שם שלב בתבנית 1", { exact: true })).toHaveValue(
    "",
  );
  await createTemplate(page, "הקריאה שלנו");
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "עריכת קוראים יחד", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await expect(page.locator(".template-card")).toHaveCount(1);
  await createTemplate(page, "תרגול שלנו", "מתרגלים");
  await expect(page.locator(".template-card")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await expect(page.locator(".template-card")).toHaveCount(2);
});
test("a different browser joins by one-time code and controls the live class", async ({
  page,
  browser,
}) => {
  await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "יצירת קוד חיבור", exact: true })
    .click();
  const code = await page.locator(".pair-code").innerText();
  expect(code).toMatch(/^\d{8}$/);
  const remoteContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const remote = await remoteContext.newPage();
  try {
    await remote.goto("http://127.0.0.1:5173/?view=join");
    await remote.getByLabel("קוד חיבור", { exact: true }).fill(code);
    await remote
      .getByRole("button", { name: "חיבור לשיעור", exact: true })
      .click();
    await expect(
      remote.getByRole("heading", { name: "השיעור בידיים שלך." }),
    ).toBeVisible();
    await remote.getByRole("button", { name: "הבא", exact: true }).click();
    await page.getByRole("button", { name: "סגירה", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
    ).toBeVisible();
    await remote.getByRole("button", { name: "תלמידים", exact: true }).click();
    await remote
      .getByRole("button", { name: "לב לאיתי לוי", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "חיזוק מהיר לאיתי לוי", exact: true }),
    ).toHaveText("1");
    await Promise.all([
      remote.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click(),
      page
        .getByRole("button", { name: "חיזוק מהיר לאיתי לוי", exact: true })
        .click(),
    ]);
    await expect(
      page.getByRole("button", { name: "חיזוק מהיר לאיתי לוי", exact: true }),
    ).toHaveText("3");
    await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
    await page
      .getByRole("button", { name: "ניתוק החיבור", exact: true })
      .click();
    await expect(
      remote.getByText("החיבור הסתיים. צרו קוד חדש במחשב.", { exact: true }),
    ).toBeVisible();
  } finally {
    await remoteContext.close();
  }
});

test("teacher creates and edits a permanent blank template without coupling it to live lesson edits", async ({
  page,
}) => {
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "אין עדיין תבניות שמורות" }),
  ).toBeVisible();
  await createTemplate(page, "תבנית קבועה", "שלב ראשון");
  await page
    .getByRole("button", { name: "עריכת תבנית תבנית קבועה", exact: true })
    .click();
  await page.getByLabel("שם לתבנית אישית").fill("התבנית המעודכנת");
  await page
    .getByRole("button", { name: "הוספת שלב לתבנית", exact: true })
    .click();
  await expect(page.getByLabel("שם שלב בתבנית 2", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel("שם שלב בתבנית 2", { exact: true }).fill("שלב שני");
  await page.getByLabel("משך שלב בתבנית 2", { exact: true }).fill("5");
  await page.getByRole("button", { name: "שמירת תבנית", exact: true }).click();
  await expect(page.locator(".template-card")).toHaveCount(1);
  await expect(page.locator(".template-card")).toContainText("2 שלבים");
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await page
    .getByRole("button", { name: "עריכת שלב ראשון", exact: true })
    .click();
  await page.getByLabel("הנחיה קצרה").fill("שינוי רק בשיעור הפעיל");
  await page.getByRole("button", { name: "שמירת השלב", exact: true }).click();
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await page
    .getByRole("button", { name: "עריכת תבנית התבנית המעודכנת", exact: true })
    .click();
  await expect(
    page.getByLabel("הנחיה לשלב בתבנית 1", { exact: true }),
  ).toHaveValue("הנחיה שהמורה הגדיר");
  await page
    .getByRole("button", { name: "מחיקת תבנית התבנית המעודכנת", exact: true })
    .click();
  await expect(page.locator(".template-card")).toHaveCount(0);
});
