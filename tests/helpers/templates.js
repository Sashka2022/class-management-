export async function createTemplate(
  page,
  name = "תבנית בדיקה",
  stage = "קוראים יחד",
) {
  await page.getByLabel("שם לתבנית אישית").fill(name);
  await page.getByLabel("שם שלב בתבנית 1", { exact: true }).fill(stage);
  await page.getByLabel("משך שלב בתבנית 1", { exact: true }).fill("10");
  await page
    .getByLabel("הנחיה לשלב בתבנית 1", { exact: true })
    .fill("הנחיה שהמורה הגדיר");
  await page.getByRole("button", { name: "שמירת תבנית", exact: true }).click();
}
