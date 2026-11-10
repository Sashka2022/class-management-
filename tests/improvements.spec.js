import { readFile } from "node:fs/promises";
import { createTemplate } from "./helpers/templates";
import { test, expect } from "./fixtures";
import { dayInIsrael } from "../shared/schoolPolicy.js";

async function call(request, body, token) {
  return request.post("/api/school", {
    data: body,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
async function login(request, role = "teacher", classId = "a1") {
  const r = await call(request, {
    action: "login",
    role,
    classId,
    password: "1111",
  });
  expect(r.ok()).toBe(true);
  return (await r.json()).authToken;
}
function lessonState(extra = {}) {
  return {
    students: [
      {
        id: "one",
        name: "תלמיד בדיקה",
        emoji: "🌱",
        present: true,
        hearts: 2,
        warning: 0,
      },
    ],
    stages: [{ id: "s1", name: "פתיחה", minutes: 10, instruction: "" }],
    stage: 0,
    groups: [],
    projection: { type: "blank" },
    timer: { remaining: 600, end: null },
    customTemplates: [{ id: "t1", name: "תבנית מגובה", stages: [] }],
    dayPlans: { "2026-11-10": [{ id: "r1", time: "08:00", title: "חשבון" }] },
    library: [],
    quotes: [{ id: "q1", text: "ציטוט" }],
    revisedAt: 1234,
    ...extra,
  };
}
function report(id, endedAt) {
  return {
    id,
    startedAt: endedAt - 60000,
    endedAt,
    completed: true,
    students: [
      {
        id: "one",
        name: "=תלמיד, בדיקה",
        emoji: "🌱",
        present: true,
        late: true,
        hearts: 2,
        warnings: 1,
      },
    ],
  };
}
async function enterClass(page) {
  await page.goto("/");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText("שמירה בענן פעילה");
}

test("class backup is limited to the class teacher and separates planning from lesson data", async ({
  request,
}) => {
  const teacher = await login(request),
    other = await login(request, "teacher", "b1"),
    admin = await login(request, "admin");
  expect(
    await (
      await call(request, { action: "backup", classId: "a1" }, teacher)
    ).json(),
  ).toEqual({ backup: null });
  const save = (state, token = teacher, classId = "a1") =>
    call(request, { action: "saveBackup", classId, state }, token);
  expect((await save(lessonState(), other)).status()).toBe(403);
  expect((await save(lessonState(), admin)).status()).toBe(403);
  expect((await save({ students: [] })).status()).toBe(400);
  expect(
    (await call(request, { action: "saveBackup", classId: "a1" })).status(),
  ).toBe(401);
  expect((await save(lessonState())).ok()).toBe(true);
  expect((await save(lessonState({ revisedAt: 5678, stage: 0 }))).ok()).toBe(
    true,
  );
  const { backup } = await (
    await call(request, { action: "backup", classId: "a1" }, teacher)
  ).json();
  expect(backup.revisedAt).toBe(5678);
  expect(Object.keys(backup.plan).sort()).toEqual([
    "customTemplates",
    "dayPlans",
    "library",
  ]);
  expect(backup.plan.customTemplates[0].name).toBe("תבנית מגובה");
  expect(backup.state.students[0].hearts).toBe(2);
  expect(backup.state.quotes).toHaveLength(1);
  expect(backup.state.customTemplates).toBeUndefined();
  expect(
    (await call(request, { action: "backup", classId: "a1" }, other)).status(),
  ).toBe(403);
});

test("a teacher continues the lesson plan and templates on a different computer", async ({
  page,
  browser,
}) => {
  await enterClass(page);
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page, "תבנית שעוברת מחשב", "שלב מהמחשב הראשון");
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  await expect(page.locator(".backup-status")).toContainText(
    "השיעור והתבניות מגובים בענן",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לקלי קלוח" }),
  ).toBeVisible();
  const context = await browser.newContext(),
    second = await context.newPage();
  try {
    await enterClass(second);
    await expect(
      second.getByText("השיעור, התבניות והתכנון שוחזרו מהגיבוי בענן."),
    ).toBeVisible();
    await expect(
      second.getByRole("button", {
        name: "עריכת שלב מהמחשב הראשון",
        exact: true,
      }),
    ).toHaveCount(1);
    await second
      .getByRole("button", { name: "תבניות שיעור", exact: true })
      .click();
    await expect(second.locator(".template-card")).toContainText(
      "תבנית שעוברת מחשב",
    );
  } finally {
    await context.close();
  }
});

test("a device that could not read the backup never overwrites it", async ({
  page,
  request,
}) => {
  const teacher = await login(request);
  expect(
    (
      await call(
        request,
        { action: "saveBackup", classId: "a1", state: lessonState() },
        teacher,
      )
    ).ok(),
  ).toBe(true);
  await call(request, { action: "release" }, teacher);
  let saves = 0;
  await page.route("**/api/school", async (route) => {
    const action = route.request().postDataJSON().action;
    if (action === "saveBackup") saves++;
    if (action === "backup") await route.abort();
    else await route.continue();
  });
  await enterClass(page);
  await expect(page.locator(".backup-status")).toContainText(
    "גיבוי השיעור בענן נכשל",
  );
  await page.getByRole("button", { name: "מהלך השיעור" }).click();
  await page
    .getByRole("button", { name: "עריכת תחילת שיעור", exact: true })
    .click();
  await page.getByLabel("הנחיה קצרה").fill("שינוי בלי גיבוי");
  await page.getByRole("button", { name: "שמירת השלב", exact: true }).click();
  await page.waitForTimeout(5500);
  expect(saves).toBe(0);
});

test("reports cover a date range and export to a spreadsheet file", async ({
  page,
  request,
}) => {
  const admin = await login(request, "admin"),
    now = Date.now(),
    earlier = now - 3 * 86400000;
  for (const [id, time] of [
    ["old-lesson", earlier],
    ["new-lesson", now],
  ])
    expect(
      (
        await call(
          request,
          { action: "saveReport", classId: "a1", report: report(id, time) },
          admin,
        )
      ).ok(),
    ).toBe(true);
  const from = dayInIsrael(earlier),
    to = dayInIsrael(now);
  const single = await (
    await call(request, { action: "reports", classId: "a1", day: to }, admin)
  ).json();
  expect(single.records.map((r) => r.id)).toEqual(["new-lesson"]);
  const range = await (
    await call(
      request,
      { action: "reports", classId: "a1", day: from, to },
      admin,
    )
  ).json();
  expect(range.records.map((r) => r.id)).toEqual(["old-lesson", "new-lesson"]);
  const all = await (
    await call(request, { action: "reports", day: from, to }, admin)
  ).json();
  expect(all.records).toHaveLength(2);
  expect(
    (
      await call(
        request,
        { action: "reports", classId: "a1", day: to, to: from },
        admin,
      )
    ).status(),
  ).toBe(400);
  await call(
    request,
    { action: "deleteReport", classId: "a1", id: "old-lesson" },
    admin,
  );
  const after = await (
    await call(
      request,
      { action: "reports", classId: "a1", day: from, to },
      admin,
    )
  ).json();
  expect(after.records.map((r) => r.id)).toEqual(["new-lesson"]);
  await call(
    request,
    {
      action: "saveReport",
      classId: "a1",
      report: report("old-lesson", earlier),
    },
    admin,
  );

  await enterClass(page);
  await page
    .getByRole("button", { name: "סיכומי תלמידים", exact: true })
    .click();
  await expect(page.locator(".report-table tbody td").first()).toHaveText(
    "1 מתוך 1 שיעורים",
  );
  await page.getByLabel("תאריך סיכומים").fill(from);
  await expect(page.getByLabel("עד תאריך")).toHaveValue(from);
  await page.getByLabel("עד תאריך").fill(to);
  await expect(page.locator(".report-table tbody td").first()).toHaveText(
    "2 מתוך 2 שיעורים",
  );
  await expect(
    page.getByRole("button", { name: "סיכום התקופה", exact: true }),
  ).toBeVisible();
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ייצוא ל־Excel" }).click();
  let file = await download;
  expect(file.suggestedFilename()).toBe(`sikumim-talmidim-${from}_${to}.csv`);
  let text = await readFile(await file.path(), "utf8");
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text.slice(1).split("\r\n")).toEqual([
    "כיתה,תלמיד/ה,שיעורים,נוכחות,איחורים,לבבות,אזהרות",
    `א1,"'=תלמיד, בדיקה",2,2,2,4,2`,
  ]);
  await page.getByRole("button", { name: "לפי שיעור", exact: true }).click();
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: "ייצוא ל־Excel" }).click();
  file = await download;
  expect(file.suggestedFilename()).toBe(`sikumim-shiurim-${from}_${to}.csv`);
  text = await readFile(await file.path(), "utf8");
  const lines = text.slice(1).split("\r\n");
  expect(lines).toHaveLength(3);
  expect(lines[0]).toBe("תאריך,שעת סיום,כיתה,תלמיד/ה,נוכחות,לבבות,אזהרות");
  expect(lines[1]).toContain(`א1,"'=תלמיד, בדיקה",באיחור,2,1`);

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".report-print-title")).toBeVisible();
  await expect(page.locator(".report-print-title")).toContainText("כיתה א1");
  await expect(page.locator(".report-table").first()).toBeVisible();
  await expect(page.locator(".report-filters")).toBeHidden();
  await expect(page.locator(".sidebar, nav").first()).toBeHidden();
});

test.describe("lesson plan editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() =>
      sessionStorage.setItem(
        "beyachad-session-v1",
        JSON.stringify({ role: "teacher", classId: "g2" }),
      ),
    );
    await page.goto("/");
  });
  const names = (page) => page.locator(".stage-item .stage-main strong");

  test("stages are reordered, duplicated and removed while the current stage stays current", async ({
    page,
  }) => {
    await expect(page.locator(".stage-item.current strong")).toHaveText(
      "מגלים יחד",
    );
    await page
      .getByRole("button", { name: "עריכת מגלים יחד", exact: true })
      .click();
    await page.getByRole("button", { name: "הקדמת השלב", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "הקדמת השלב", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "סגירה", exact: true }).click();
    await expect(names(page)).toHaveText([
      "מגלים יחד",
      "נכנסים לאווירה",
      "צומחים בקבוצות",
      "משתפים בתגליות",
      "מחשבה לדרך",
    ]);
    await expect(page.locator(".stage-item.current strong")).toHaveText(
      "מגלים יחד",
    );
    await page.getByRole("button", { name: "ביטול", exact: true }).click();
    await expect(names(page).first()).toHaveText("נכנסים לאווירה");
    await expect(page.locator(".stage-item.current strong")).toHaveText(
      "מגלים יחד",
    );

    await page
      .getByRole("button", { name: "עריכת נכנסים לאווירה", exact: true })
      .click();
    await page.getByRole("button", { name: "שכפול השלב", exact: true }).click();
    await expect(names(page)).toHaveText([
      "נכנסים לאווירה",
      "נכנסים לאווירה (עותק)",
      "מגלים יחד",
      "צומחים בקבוצות",
      "משתפים בתגליות",
      "מחשבה לדרך",
    ]);
    await expect(page.locator(".stage-item.current strong")).toHaveText(
      "מגלים יחד",
    );

    await page
      .locator(".stage-item", { hasText: "מחשבה לדרך" })
      .dragTo(page.locator(".stage-item", { hasText: "צומחים בקבוצות" }));
    await expect(names(page)).toHaveText([
      "נכנסים לאווירה",
      "נכנסים לאווירה (עותק)",
      "מגלים יחד",
      "מחשבה לדרך",
      "צומחים בקבוצות",
      "משתפים בתגליות",
    ]);

    await page
      .getByRole("button", { name: "עריכת נכנסים לאווירה (עותק)", exact: true })
      .click();
    await page.getByRole("button", { name: "מחיקת השלב", exact: true }).click();
    await expect(names(page)).toHaveCount(5);
    await expect(page.locator(".stage-item.current strong")).toHaveText(
      "מגלים יחד",
    );
    await page.reload();
    await expect(names(page)).toHaveText([
      "נכנסים לאווירה",
      "מגלים יחד",
      "מחשבה לדרך",
      "צומחים בקבוצות",
      "משתפים בתגליות",
    ]);
  });

  test("template stages are reordered and duplicated, and a whole template is duplicated", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "תבניות שיעור", exact: true })
      .click();
    await page.getByLabel("שם לתבנית אישית").fill("תבנית מקור");
    await page.getByLabel("שם שלב בתבנית 1", { exact: true }).fill("ראשון");
    await page.getByLabel("משך שלב בתבנית 1", { exact: true }).fill("10");
    await page
      .getByRole("button", { name: "שכפול שלב 1 בתבנית", exact: true })
      .click();
    await expect(
      page.getByLabel("משך שלב בתבנית 2", { exact: true }),
    ).toHaveValue("10");
    await page.getByLabel("שם שלב בתבנית 2", { exact: true }).fill("שני");
    await page
      .getByRole("button", { name: "הקדמת שלב 2 בתבנית", exact: true })
      .click();
    await expect(
      page.getByLabel("שם שלב בתבנית 1", { exact: true }),
    ).toHaveValue("שני");
    await page
      .getByRole("button", { name: "שמירת תבנית", exact: true })
      .click();
    await page
      .getByRole("button", { name: "שכפול תבנית תבנית מקור", exact: true })
      .click();
    await expect(page.locator(".template-card h2")).toHaveText([
      "תבנית מקור",
      "תבנית מקור (עותק)",
    ]);
    await page
      .getByRole("button", {
        name: "עריכת תבנית תבנית מקור (עותק)",
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel("שם שלב בתבנית 1", { exact: true }),
    ).toHaveValue("שני");
    await page.getByLabel("שם שלב בתבנית 1", { exact: true }).fill("שונה");
    await page
      .getByRole("button", { name: "שמירת תבנית", exact: true })
      .click();
    await page
      .getByRole("button", { name: "עריכת תבנית תבנית מקור", exact: true })
      .click();
    await expect(
      page.getByLabel("שם שלב בתבנית 1", { exact: true }),
    ).toHaveValue("שני");
  });
});
