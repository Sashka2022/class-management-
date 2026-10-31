import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem(
      "beyachad-session-v1",
      JSON.stringify({ role: "teacher", classId: "g2" }),
    );
    window.__playedTones = [];
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      createOscillator() {
        const oscillator = super.createOscillator();
        let frequency;
        const setFrequency = oscillator.frequency.setValueAtTime.bind(
          oscillator.frequency,
        );
        oscillator.frequency.setValueAtTime = (value, time) => {
          frequency = value;
          return setFrequency(value, time);
        };
        const start = oscillator.start.bind(oscillator);
        oscillator.start = (time) => {
          window.__playedTones.push({ type: oscillator.type, frequency });
          return start(time);
        };
        return oscillator;
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
});

const tones = (page) => page.evaluate(() => window.__playedTones);

test("heart and warning play distinct sounds only when added, without replaying on undo or refresh", async ({
  page,
}) => {
  expect(await tones(page)).toEqual([]);
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  await expect
    .poll(() => tones(page))
    .toEqual([
      { type: "sine", frequency: 659.25 },
      { type: "sine", frequency: 880 },
    ]);
  const warning = page.getByRole("button", { name: /^אזהרה מהירה לאיתי לוי,/ });
  await warning.click();
  await expect.poll(() => tones(page)).toHaveLength(4);
  expect((await tones(page)).slice(2)).toEqual([
    { type: "triangle", frequency: 293.66 },
    { type: "triangle", frequency: 220 },
  ]);
  await page.getByRole("button", { name: "ביטול", exact: true }).click();
  await expect(warning).toHaveText("0");
  expect(await tones(page)).toHaveLength(4);
  await warning.click();
  await expect.poll(() => tones(page)).toHaveLength(6);
  await warning.click();
  await expect.poll(() => tones(page)).toHaveLength(8);
  await warning.click();
  await expect(
    page.getByRole("button", { name: "אישור ההצעה", exact: true }),
  ).toBeVisible();
  expect(await tones(page)).toHaveLength(8);
  await page.reload();
  await page.getByRole("button", { name: "התלמידים", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^אזהרה מהירה לאיתי לוי,/ }),
  ).toHaveText("2");
  expect(await tones(page)).toEqual([]);
});

test("unsupported audio does not prevent hearts and warnings from being saved", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
  });
  await page.getByRole("button", { name: "לב לאיתי לוי", exact: true }).click();
  const warning = page.getByRole("button", { name: /^אזהרה מהירה לאיתי לוי,/ });
  await warning.click();
  await expect(warning).toHaveText("1");
  const student = await page.evaluate(
    () => JSON.parse(localStorage.getItem("beyachad-demo-v1")).students[0],
  );
  expect(student.hearts).toBe(1);
  expect(student.warning).toBe(1);
  expect(await tones(page)).toEqual([]);
});
