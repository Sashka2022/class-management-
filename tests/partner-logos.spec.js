import { test, expect } from "./fixtures";

for (const width of [390, 1440]) {
  test(`the supplied partner strip stays transparent and proportional at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const externalRequests = [];
    page.on("request", (request) => {
      if (request.url().includes("mofet.macam.ac.il"))
        externalRequests.push(request.url());
    });
    await page.goto("/");
    const strip = page.getByRole("img", {
      name: "חותם — אחריות לחינוך בישראל; ראשית — קהילות מחנכות",
      exact: true,
    });
    await expect(strip).toBeVisible();
    await expect(strip).toHaveCount(1);
    const image = await strip.evaluate(async (element) => {
      await element.decode();
      const canvas = document.createElement("canvas");
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const context = canvas.getContext("2d");
      context.drawImage(element, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let transparent = 0,
        left = 0,
        right = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha === 0) transparent++;
          if (alpha > 200) {
            if (x < canvas.width / 2) left++;
            else right++;
          }
        }
      }
      return {
        ratio: canvas.width / canvas.height,
        transparent: transparent / (canvas.width * canvas.height),
        left,
        right,
      };
    });
    const box = await strip.boundingBox();
    expect(Math.abs(box.width / box.height - image.ratio)).toBeLessThan(0.01);
    expect(image.transparent).toBeGreaterThan(0.5);
    expect(image.left).toBeGreaterThan(100);
    expect(image.right).toBeGreaterThan(100);
    expect(externalRequests).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
