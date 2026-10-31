import { test, expect } from "./fixtures";
import {
  dayInIsrael,
  schoolYear,
  dailyStudents,
} from "../shared/schoolPolicy.js";
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
function report(id = "lesson-1", hearts = 3, warnings = 2) {
  const now = Date.now();
  return {
    id,
    startedAt: now - 60000,
    endedAt: now,
    completed: true,
    summary: "must not be stored",
    students: [
      {
        id: "student-1",
        name: "תלמיד בדיקה",
        emoji: "🌿",
        present: true,
        late: false,
        hearts,
        warnings,
        events: ["must not be stored"],
      },
    ],
  };
}
test("cloud archive authenticates, scopes classes, deduplicates, aggregates and deletes with annual retention", async ({
  request,
}) => {
  const teacher = await login(request),
    admin = await login(request, "admin");
  expect(
    (await call(request, { action: "reports", classId: "a1" })).status(),
  ).toBe(401);
  expect(
    (
      await call(request, { action: "reports", classId: "b1" }, teacher)
    ).status(),
  ).toBe(403);
  expect((await call(request, { action: "overview" }, teacher)).status()).toBe(
    403,
  );
  const first = report();
  for (let i = 0; i < 2; i++)
    expect(
      (
        await call(
          request,
          { action: "saveReport", classId: "a1", report: first },
          teacher,
        )
      ).ok(),
    ).toBe(true);
  let overview = await (
    await call(request, { action: "overview" }, admin)
  ).json();
  expect(overview.totals.a1).toMatchObject({
    records: 1,
    completed: 1,
    hearts: 3,
    warnings: 2,
  });
  const changed = { ...first, students: [{ ...first.students[0], hearts: 4 }] };
  await call(
    request,
    { action: "saveReport", classId: "a1", report: changed },
    teacher,
  );
  await call(
    request,
    { action: "saveReport", classId: "a1", report: report("lesson-2", 1, 1) },
    teacher,
  );
  const result = await (
    await call(request, { action: "reports", day: dayInIsrael() }, admin)
  ).json();
  expect(result.records).toHaveLength(2);
  expect(dailyStudents(result.records)[0]).toMatchObject({
    lessons: 2,
    present: 2,
    hearts: 5,
    warnings: 3,
  });
  expect(result.records[0].expiresAt).toBe(schoolYear().expiresAt);
  expect(JSON.stringify(result)).not.toContain("must not be stored");
  expect(Object.keys(result.records[0].students[0]).sort()).toEqual(
    ["id", "name", "emoji", "present", "late", "hearts", "warnings"].sort(),
  );
  await call(
    request,
    { action: "deleteReport", classId: "a1", id: "lesson-2" },
    teacher,
  );
  overview = await (await call(request, { action: "overview" }, admin)).json();
  expect(overview.totals.a1).toMatchObject({
    records: 1,
    completed: 1,
    hearts: 4,
    warnings: 2,
    latestEndedAt: first.endedAt,
  });
  expect(
    (
      await call(
        request,
        {
          action: "saveReport",
          classId: "a1",
          report: {
            ...first,
            id: "expired",
            startedAt: Date.parse("2020-01-01"),
            endedAt: Date.parse("2020-01-02"),
          },
        },
        teacher,
      )
    ).status(),
  ).toBe(410);
});
test("central class catalog and versioned rosters are available across sessions", async ({
  request,
  page,
}) => {
  const admin = await login(request, "admin"),
    teacher = await login(request);
  const catalog = await (await call(request, { action: "classes" })).json();
  expect(catalog.classes.map((c) => c.name)).toEqual([
    "א1",
    "ב1",
    "ג1",
    "ד1",
    "ה1",
    "ו1",
    "כיתת דמה",
  ]);
  expect(
    (
      await call(request, { action: "addClass", name: "כיתה א׳1" }, admin)
    ).status(),
  ).toBe(409);
  expect(
    (await call(request, { action: "addClass", name: "ז1" }, teacher)).status(),
  ).toBe(403);
  expect(
    (await call(request, { action: "addClass", name: "ז1" }, admin)).ok(),
  ).toBe(true);
  await page.goto("/");
  await expect(
    page.getByRole("option", { name: "כיתה ז1", exact: true }),
  ).toHaveCount(1);
  const second = teacher; // A second device of the same controlling session.
  const students = [
    { id: "one", name: "תלמידה ראשונה", emoji: "🌱", hearts: 999 },
  ];
  expect(
    (
      await call(
        request,
        { action: "saveRoster", classId: "a1", students, version: 0 },
        teacher,
      )
    ).ok(),
  ).toBe(true);
  const roster = await (
    await call(request, { action: "roster", classId: "a1" }, second)
  ).json();
  expect(roster.roster).toEqual({
    version: 1,
    students: [{ id: "one", name: "תלמידה ראשונה", emoji: "🌱" }],
  });
  expect(
    (
      await call(
        request,
        { action: "saveRoster", classId: "a1", students: [], version: 0 },
        second,
      )
    ).status(),
  ).toBe(409);
});
test("fresh real classes are empty and demo retains its named presentation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText("שמירה בענן פעילה");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("beyachad-demo-v1-class-a1")).students,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("beyachad-demo-v1-class-a1")).library,
    ),
  ).toEqual([]);
  await expect(page.getByText("כאן יופיע התוכן של הכיתה")).toBeVisible();
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await page.getByLabel("הכיתה שלי", { exact: true }).selectOption("g2");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText("שמירה בענן פעילה");
  const demo = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("beyachad-demo-v1")),
  );
  expect(demo.students).toHaveLength(24);
  expect(demo.library).toContainEqual({
    id: "demo-slides",
    kind: "demo-slides",
    name: "מצגת כיתת דמה",
  });
});
test("a completed lesson is visible in a separate teacher browser and can be deleted", async ({
  page,
  browser,
  request,
}) => {
  const token = await login(request, "admin");
  await call(
    request,
    {
      action: "saveRoster",
      classId: "a1",
      version: 0,
      students: [{ id: "one", name: "תלמיד בדיקה", emoji: "🌱" }],
    },
    token,
  );
  await page.goto("/");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText("שמירה בענן פעילה");
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await page
    .getByRole("button", { name: "לב לתלמיד בדיקה", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "אזהרה מהירה לתלמיד בדיקה, ללא אזהרה",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("beyachad-demo-v1-class-a1"))
            .lessons[0]?.cloudStored,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "יציאה", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ברוכים הבאים לקלי קלוח" }),
  ).toBeVisible();
  const other = await browser.newContext(),
    remote = await other.newPage();
  await remote.goto("/");
  await remote.getByLabel("סיסמה", { exact: true }).fill("1111");
  await remote
    .getByRole("button", { name: "נכנסים לכיתה", exact: true })
    .click();
  await expect(remote.locator(".cloud-status")).toContainText(
    "שמירה בענן פעילה",
  );
  await remote
    .getByRole("button", { name: "סיכומי תלמידים", exact: true })
    .click();
  await expect(remote.locator(".report-table")).toContainText("תלמיד בדיקה");
  await expect(remote.locator(".report-table tbody td")).toHaveText([
    "1 מתוך 1 שיעורים",
    "1",
    "1",
  ]);
  await remote.getByRole("button", { name: "לפי שיעור", exact: true }).click();
  await remote
    .getByRole("button", { name: "מחיקת סיכום", exact: true })
    .click();
  await remote
    .getByRole("button", { name: "אישור מחיקת הסיכום", exact: true })
    .click();
  await expect(
    remote.getByText("אין סיכומים שמורים לתאריך הזה. סיכום נוצר בסיום שיעור."),
  ).toBeVisible();
  await other.close();
});
test("failed cloud writes remain queued locally and retry without duplicate lessons", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("סיסמה", { exact: true }).fill("1111");
  await page.getByRole("button", { name: "נכנסים לכיתה", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText("שמירה בענן פעילה");
  let blocked = true;
  await page.route("**/api/school", async (route) => {
    if (blocked && route.request().postDataJSON().action === "saveReport")
      await route.abort();
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "משהו לקחת להמשך סיכום קצר וסיום השיעור" })
    .click();
  await page.getByRole("button", { name: "סיום שיעור", exact: true }).click();
  await expect(page.locator(".cloud-status")).toContainText(
    "אין חיבור לשמירה בענן כרגע",
  );
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("beyachad-demo-v1-class-a1")).lessons,
  );
  expect(before).toHaveLength(1);
  expect(before[0].cloudStored).toBeUndefined();
  expect(before[0].students).toEqual([]);
  blocked = false;
  await page.getByRole("button", { name: "ניסיון נוסף", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("beyachad-demo-v1-class-a1"))
            .lessons[0]?.cloudStored,
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "סיכומי תלמידים", exact: true })
    .click();
  await expect(page.locator(".report-total")).toContainText("1 סיכומי שיעור");
});
test("retention follows Israeli school-year boundary", () => {
  expect(schoolYear(Date.parse("2027-06-30T20:59:58Z")).endDate).toBe(
    "2027-06-30",
  );
  expect(schoolYear(Date.parse("2027-06-30T21:00:00Z")).endDate).toBe(
    "2028-06-30",
  );
});
test("expired summaries and totals disappear while the class roster remains", async () => {
  const { memoryStore } = await import("../server/pairing.js");
  const { createSchoolHandler } = await import("../server/school.js");
  const store = memoryStore(),
    handler = createSchoolHandler(() => store);
  let now = Date.parse("2027-06-30T20:59:50Z");
  const realNow = Date.now;
  Date.now = () => now;
  async function invoke(body, token) {
    let status, result;
    await handler(
      {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body,
      },
      {
        setHeader() {},
        status(code) {
          status = code;
          return this;
        },
        json(value) {
          result = value;
        },
      },
    );
    return { status, result };
  }
  try {
    const token = (
      await invoke({
        action: "login",
        role: "teacher",
        classId: "a1",
        password: "1111",
      })
    ).result.authToken;
    const students = [{ id: "one", name: "בדיקה", emoji: "🌱" }];
    expect(
      (
        await invoke(
          { action: "saveRoster", classId: "a1", version: 0, students },
          token,
        )
      ).status,
    ).toBe(200);
    const r = {
      id: "last-day",
      startedAt: now - 60000,
      endedAt: now,
      completed: true,
      students: students.map((p) => ({
        ...p,
        present: true,
        hearts: 2,
        warnings: 1,
      })),
    };
    expect(
      (await invoke({ action: "saveReport", classId: "a1", report: r }, token))
        .status,
    ).toBe(200);
    expect(
      (
        await invoke(
          { action: "reports", classId: "a1", day: "2027-06-30" },
          token,
        )
      ).result.records,
    ).toHaveLength(1);
    now = Date.parse("2027-06-30T21:00:01Z");
    expect(
      (
        await invoke(
          { action: "reports", classId: "a1", day: "2027-06-30" },
          token,
        )
      ).result.records,
    ).toEqual([]);
    expect(
      (await invoke({ action: "roster", classId: "a1" }, token)).result.roster
        .students,
    ).toEqual(students);
    expect(await store.get("{beyachad-school}:totals:a1:2026-2027")).toBeNull();
  } finally {
    Date.now = realNow;
  }
});
