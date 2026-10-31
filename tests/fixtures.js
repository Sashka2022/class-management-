import { test as base, expect } from "@playwright/test";
export const test = base.extend({
  resetBackend: [
    async ({ request }, use) => {
      const response = await request.post("/__test/reset");
      expect(response.ok()).toBe(true);
      await use();
    },
    { auto: true },
  ],
});
export { expect };
