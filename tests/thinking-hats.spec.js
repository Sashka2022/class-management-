import { test, expect } from "./fixtures";
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
  await expect(
    page.getByLabel("הפעלת כובעי החשיבה של דה בונו", { exact: true }),
  ).not.toBeChecked();
  await expect(page.locator(".hat-guide")).toHaveCount(0);
  await page
    .getByLabel("הפעלת כובעי החשיבה של דה בונו", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "קבוצה ידנית חדשה", exact: true })
    .click();
  const id = await page
    .getByLabel("שיבוץ איתי לוי", { exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  for (const name of ["איתי לוי", "אמה כהן"])
    await page.getByLabel(`שיבוץ ${name}`, { exact: true }).selectOption(id);
});
const state = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("beyachad-demo-v1")));
const groupHat = (page) =>
  page.getByLabel("כובע משותף — קבוצה 1", { exact: true });
test("six hats include the supplied guidance; shared and personal hats coexist with responsibilities and only hat changes go live", async ({
  page,
  context,
}) => {
  await expect(page.locator(".hat-guide-grid article")).toHaveCount(6);
  await expect(page.locator(".hat-guide")).toContainText(
    "התפקיד מגדיר אחריות; הכובע מגדיר את דרך החשיבה כרגע.",
  );
  await expect(page.locator(".hat-guide")).toContainText("בלי חובה לנמק");
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("leader");
  await groupHat(page).selectOption("white");
  await page
    .getByLabel("כובע אישי של אמה כהן", { exact: true })
    .selectOption("green");
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await expect(projector.locator(".hat-display")).toContainText(
    "מה אנחנו יודעים, ומה עוד צריך לבדוק?",
  );
  await expect(projector.locator(".personal-hat-badge")).toContainText(
    "כובע אישי: ירוק",
  );
  await expect(projector.locator(".projected-role")).toContainText(
    "מוביל/ת קבוצה",
  );
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("recorder");
  await groupHat(page).selectOption("red");
  await expect(projector.locator(".hat-display")).toContainText(
    "איך אני מרגיש לגבי הרעיון הזה?",
  );
  await expect(projector.locator(".personal-hat-badge")).toHaveCount(0);
  await expect(projector.locator(".projected-role")).toContainText(
    "מוביל/ת קבוצה",
  );
  expect((await state(page)).studentHats).toEqual({});
  await page
    .getByLabel("כובע אישי של אמה כהן", { exact: true })
    .selectOption("black");
  await expect(projector.locator(".personal-hat-badge")).toContainText(
    "כובע אישי: שחור",
  );
  await page
    .getByLabel("כובע אישי של אמה כהן", { exact: true })
    .selectOption("");
  await expect(projector.locator(".personal-hat-badge")).toHaveCount(0);
  for (const id of ["black", "yellow", "green", "blue", "white"]) {
    await page.getByRole("button", { name: "הכובע הבא", exact: true }).click();
    await expect(groupHat(page)).toHaveValue(id);
  }
  const current = await state(page);
  expect(current.groupRoles.s0.roleId).toBe("recorder");
  expect(current.projection.groups[0].members[0].role.id).toBe("leader");
  expect(
    current.projection.groups[0].members.every(
      (p) => p.thinkingHat.id === "white",
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "עדכון הקבוצות והתפקידים בהקרנה",
      exact: true,
    })
    .click();
  await expect(projector.locator(".projected-role")).toContainText("מתעד/ת");
});
test("hat timer is optional, survives refresh, pauses and expires without advancing the hat or changing the lesson timer", async ({
  page,
  context,
}) => {
  await groupHat(page).selectOption("white");
  const duration = page.getByLabel("זמן לכובע — קבוצה 1", { exact: true });
  await expect(duration).toHaveValue("0");
  await expect(
    page.getByRole("button", {
      name: "הפעלת זמן הכובע — קבוצה 1",
      exact: true,
    }),
  ).toBeDisabled();
  const before = await state(page);
  await duration.fill("1");
  await page
    .getByRole("button", { name: "הפעלת זמן הכובע — קבוצה 1", exact: true })
    .click();
  let running = await state(page);
  expect(running.timer).toEqual(before.timer);
  expect(running.groups[0].thinkingHat.timer.end).toBeGreaterThan(Date.now());
  await page.reload();
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  expect((await state(page)).groups[0].thinkingHat.timer.end).toBe(
    running.groups[0].thinkingHat.timer.end,
  );
  await page
    .getByRole("button", { name: "השהיית זמן הכובע — קבוצה 1", exact: true })
    .click();
  expect((await state(page)).groups[0].thinkingHat.timer.end).toBeNull();
  await page
    .getByRole("button", { name: "הפעלת זמן הכובע — קבוצה 1", exact: true })
    .click();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.clock.setSystemTime(new Date(Date.now() + 65000));
  await projector.clock.setSystemTime(new Date(Date.now() + 65000));
  await expect(page.locator(".hat-time")).toContainText("הזמן לכובע הסתיים");
  await expect(projector.locator(".hat-time")).toContainText(
    "הזמן לכובע הסתיים",
  );
  running = await state(page);
  expect(running.groups[0].thinkingHat.hatId).toBe("white");
  expect(running.stage).toBe(before.stage);
  expect(running.timer).toEqual(before.timer);
  await page.getByRole("button", { name: "הכובע הבא", exact: true }).click();
  expect((await state(page)).groups[0].thinkingHat).toMatchObject({
    hatId: "red",
    duration: 1,
    timer: { remaining: 60, end: null },
  });
});
test("regrouping and new lessons clear thinking choices while roles stay independent", async ({
  page,
}) => {
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("leader");
  await groupHat(page).selectOption("blue");
  await page
    .getByLabel("כובע אישי של איתי לוי", { exact: true })
    .selectOption("red");
  await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  let data = await state(page);
  expect(data.studentHats).toEqual({});
  expect(data.groups.every((g) => !g.thinkingHat)).toBe(true);
  expect(data.groupRoles.s0.roleId).toBe("leader");
  await page
    .getByLabel("כובע אישי של איתי לוי", { exact: true })
    .selectOption("yellow");
  await page.getByRole("button", { name: "תבניות שיעור", exact: true }).click();
  await createTemplate(page);
  await page.getByRole("button", { name: "שימוש בתבנית", exact: true }).click();
  await page
    .getByRole("button", { name: "פתיחת שיעור חדש", exact: true })
    .click();
  expect((await state(page)).studentHats).toEqual({});
});
test("a paired phone can change the shared hat and update the projector", async ({
  page,
  browser,
  context,
}) => {
  await groupHat(page).selectOption("white");
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "יצירת קוד חיבור", exact: true })
    .click();
  const code = await page.locator(".pair-code").innerText();
  const phoneContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    phone = await phoneContext.newPage();
  try {
    await phone.goto("http://127.0.0.1:5173/?view=join");
    await phone.getByLabel("קוד חיבור", { exact: true }).fill(code);
    await phone
      .getByRole("button", { name: "חיבור לשיעור", exact: true })
      .click();
    await phone.getByRole("button", { name: "קבוצות", exact: true }).click();
    await groupHat(phone).selectOption("blue");
    await expect(projector.locator(".hat-display")).toContainText(
      "במה נתמקד עכשיו, ומה כבר גילינו?",
    );
    expect(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await phoneContext.close();
  }
});

test("turning hats off hides published hats, pauses their timers and preserves choices until re-enabled", async ({
  page,
  context,
}) => {
  const toggle = page.getByLabel("הפעלת כובעי החשיבה של דה בונו", {
    exact: true,
  });
  await groupHat(page).selectOption("blue");
  await page
    .getByLabel("כובע אישי של אמה כהן", { exact: true })
    .selectOption("red");
  await page.getByLabel("זמן לכובע — קבוצה 1", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "הפעלת זמן הכובע — קבוצה 1", exact: true })
    .click();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  const projector = await context.newPage();
  await projector.goto("/?view=projector");
  await expect(projector.locator(".hat-display")).toHaveCount(1);
  await expect(projector.locator(".personal-hat-badge")).toHaveCount(1);
  await toggle.uncheck();
  await expect(page.locator(".group-hat-controls")).toHaveCount(0);
  await expect(page.locator(".student-hat-control")).toHaveCount(0);
  await expect(projector.locator(".hat-display")).toHaveCount(0);
  await expect(projector.locator(".personal-hat-badge")).toHaveCount(0);
  const paused = await state(page);
  expect(paused.groups[0].thinkingHat.timer.end).toBeNull();
  expect(paused.groups[0].thinkingHat.timer.remaining).toBeGreaterThan(0);
  expect(paused.groups[0].thinkingHat.hatId).toBe("blue");
  await page.reload();
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  await expect(projector.locator(".hat-display")).toHaveCount(0);
  await toggle.check();
  await expect(groupHat(page)).toHaveValue("blue");
  await expect(projector.locator(".hat-display")).toContainText("ניהול החשיבה");
  await expect(projector.locator(".personal-hat-badge")).toContainText("אדום");
  expect((await state(page)).groups[0].thinkingHat.timer.end).toBeNull();
});

test("automatic hats support existing and new groups, balance all six hats and preserve projection drafts", async ({
  page,
}) => {
  await page
    .getByLabel("תפקיד של איתי לוי", { exact: true })
    .selectOption("leader");
  await page
    .getByLabel("כובע אישי של איתי לוי", { exact: true })
    .selectOption("red");
  await page
    .getByRole("button", { name: "חלוקת כובעים אוטומטית", exact: true })
    .click();
  let data = await state(page);
  expect(data.studentHats).toEqual({});
  expect(data.groups[0].thinkingHat.hatId).toBeTruthy();
  expect(data.groupRoles.s0.roleId).toBe("leader");
  await groupHat(page).selectOption("green");
  await page.getByRole("button", { name: "הקרנת קבוצות", exact: true }).click();
  const published = (await state(page)).projection;
  const automatic = page.getByLabel("כובעים אוטומטיים בחלוקה חדשה", {
    exact: true,
  });
  await expect(automatic).not.toBeChecked();
  await automatic.check();
  for (const count of [2, 8]) {
    await page
      .getByLabel("מספר קבוצות", { exact: true })
      .selectOption(String(count));
    await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
    data = await state(page);
    expect(data.groups).toHaveLength(count);
    const hats = data.groups.map((g) => g.thinkingHat.hatId);
    const counts = ["white", "red", "black", "yellow", "green", "blue"].map(
      (id) => hats.filter((h) => h === id).length,
    );
    expect(hats.every(Boolean)).toBe(true);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(data.projection).toEqual(published);
  }
  await page.reload();
  await page.getByRole("button", { name: "הקבוצות שלנו", exact: true }).click();
  await expect(automatic).toBeChecked();
  await automatic.uncheck();
  await page.getByRole("button", { name: "חלוקה חדשה", exact: true }).click();
  expect((await state(page)).groups.every((g) => !g.thinkingHat)).toBe(true);
});
