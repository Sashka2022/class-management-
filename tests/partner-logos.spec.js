import { test, expect } from "./fixtures";

// Count turquoise paint in the right-hand slot while its own artwork is hidden.
// Any such pixels are the duplicate Reshit logo leaking out of the left SVG.
async function turquoisePixels(page, slot = 1) {
  const png = await page.locator(".partner-logo").nth(slot).screenshot();
  return page.evaluate(async (bytes) => {
    const bitmap = await createImageBitmap(
      new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    );
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (g > 100 && b > 100 && r < g * 0.8 && r < b * 0.8) count++;
    }
    bitmap.close();
    return count;
  }, Array.from(png));
}

for (const width of [390, 1440]) {
  test(`Hotam artwork cannot duplicate Reshit in the adjacent slot at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route(
      "https://mofet.macam.ac.il/**/macam-reshit-logo-img.png",
      (route) =>
        route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="220"></svg>',
        }),
    );
    await page.goto("/");
    await expect(page.locator(".partner-logo-art")).toBeVisible();
    expect(await turquoisePixels(page)).toBe(0);
    expect(await turquoisePixels(page, 0)).toBeGreaterThan(20);
    // Positive control: reproduce the previous bug to verify the pixel check detects it.
    const artwork = page.locator(".partner-logo-art image");
    const clip = await artwork.getAttribute("clip-path");
    await artwork.evaluate((image) => image.removeAttribute("clip-path"));
    expect(await turquoisePixels(page)).toBeGreaterThan(100);
    await artwork.evaluate(
      (image, value) => image.setAttribute("clip-path", value),
      clip,
    );
    expect(await turquoisePixels(page)).toBe(0);
  });
}
