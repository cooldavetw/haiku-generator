import { expect, test } from "@playwright/test";

test("shows a usable sample and a clear setup state without a key", async ({ page, request }) => {
  await page.goto("http://127.0.0.1:3101");
  await expect(page.getByRole("heading", { name: /Haiku Garden/ })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("OPENAI_API_KEY");
  await expect(page.getByTestId("haiku-japanese-line")).toHaveCount(3);
  expect(await page.getByTestId("haiku-image").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const response = await request.post("http://127.0.0.1:3101/api/copilotkit/agent/tool_based_generative_ui/run", { data: {} });
  expect(response.status()).toBe(503);
});

test("runtime advertises the same agent used by the frontend", async ({ request }) => {
  const response = await request.get("/api/copilotkit/info");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("tool_based_generative_ui");
});

test("frontend has no model key and uses backend readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("chat tool adds poems, navigation works, and a new poem resets selection", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByText("Nature", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox");
  const garden = page.getByRole("main");
  for (let index = 1; index <= 2; index++) {
    await input.fill(`Write poem ${index}`);
    await input.press("Enter");
    await expect(garden.getByText(`Poem ${index}`, { exact: true })).toBeVisible();
  }
  await garden.getByRole("button", { name: "Next haiku" }).click();
  await expect(garden.getByText("Poem 1", { exact: true })).toBeVisible();
  await input.fill("Write poem 3");
  await input.press("Enter");
  await expect(garden.getByText("Poem 3", { exact: true })).toBeVisible();
  await expect(garden.getByRole("button", { name: "Previous haiku" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("sample page fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:3101");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
