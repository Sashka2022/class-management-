import { test, expect } from "./fixtures";
import jsQR from "jsqr";
async function createPair(page) {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({ role: "teacher", classId: "g2" }),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "השלט שלי", exact: true }).click();
  await page
    .getByRole("button", { name: "יצירת קוד חיבור", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "QR לחיבור מכשיר המורה" }),
  ).toBeVisible();
}
test("real QR pixels decode to a private-fragment join URL and a separate phone browser joins with the prefilled code", async ({
  page,
  browser,
}) => {
  await createPair(page);
  const pixels = await page
    .locator(".pair-qr canvas")
    .evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
      data: Array.from(
        canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height)
          .data,
      ),
    }));
  const decoded = jsQR(
    new Uint8ClampedArray(pixels.data),
    pixels.width,
    pixels.height,
  );
  expect(decoded).not.toBeNull();
  const url = new URL(decoded.data),
    code = await page.locator(".pair-code").innerText();
  expect(url.origin).toBe("http://127.0.0.1:5173");
  expect(url.search).toBe("?view=join");
  expect(url.hash).toBe(`#code=${code}`);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const phone = await context.newPage();
  try {
    await phone.goto(url.href);
    await expect(phone.getByLabel("קוד חיבור", { exact: true })).toHaveValue(
      code,
    );
    expect(new URL(phone.url()).hash).toBe("");
    await expect(
      page.getByRole("img", { name: "QR לחיבור מכשיר המורה" }),
    ).toBeVisible();
    await phone
      .getByRole("button", { name: "חיבור לשיעור", exact: true })
      .click();
    await expect(
      phone.getByRole("heading", { name: "השיעור בידיים שלך." }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "QR לחיבור מכשיר המורה" }),
    ).toHaveCount(0);
    await phone.getByRole("button", { name: "הבא", exact: true }).click();
    await page.getByRole("button", { name: "סגירה", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "כל צמח מתחיל בזרע קטן" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("expired QR is hidden and invalid fragment never grants a connection", async ({
  page,
  browser,
}) => {
  await createPair(page);
  await page.clock.setSystemTime(new Date(Date.now() + 11 * 60000));
  await expect(
    page.getByRole("img", { name: "QR לחיבור מכשיר המורה" }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveText(
    "תוקף הקוד פג. נתקי את החיבור וצרי קוד חדש.",
  );
  const context = await browser.newContext(),
    phone = await context.newPage();
  try {
    await phone.goto("http://127.0.0.1:5173/?view=join#code=not-a-code");
    await expect(phone.getByLabel("קוד חיבור", { exact: true })).toHaveValue(
      "",
    );
    await expect(
      phone.getByRole("heading", { name: "השיעור עובר לידיים שלך" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
