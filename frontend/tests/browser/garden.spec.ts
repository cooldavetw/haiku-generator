import { expect, test, type Page } from "@playwright/test";

async function writePoems(page: Page, numbers: number[]) {
  const input = page.getByRole("textbox", { name: "Message" });
  const garden = page.getByRole("main");
  for (const number of numbers) {
    await input.fill(`Write poem ${number}`);
    await input.press("Enter");
    await expect(garden.getByText(`Poem ${number}`, { exact: true })).toBeVisible();
  }
}

test("shows a usable sample and a clear setup state without a key", async ({ page, request }) => {
  await page.goto("http://127.0.0.1:8101");
  await expect(page.getByRole("heading", { name: /Haiku Garden/ })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("OPENAI_API_KEY");
  await expect(page.getByTestId("haiku-japanese-line")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Open chat" })).toHaveCount(0);
  expect(await page.getByTestId("haiku-image").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const response = await request.post("http://127.0.0.1:8101/agent", { data: {} });
  expect(response.status()).toBe(503);
});

test("a configured backend offers the chat and no setup notice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("chat tool adds poems, navigation works, and a new poem resets selection", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("button", { name: "Nature", exact: true })).toBeVisible();
  const garden = page.getByRole("main");
  await writePoems(page, [1, 2]);
  await garden.getByRole("button", { name: "Next haiku" }).click();
  await expect(garden.getByText("Poem 1", { exact: true })).toBeVisible();
  await writePoems(page, [3]);
  await expect(garden.getByRole("button", { name: "Previous haiku" })).toBeDisabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("works under a Segma URL prefix opened without a trailing slash", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).pathname.startsWith("/fastapi-prod/7/api")) outside.push(request.url());
  });
  await page.goto("http://127.0.0.1:8102/fastapi-prod/7/api");
  expect(await page.getByTestId("haiku-image").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await writePoems(page, [1]);
  expect(outside).toEqual([]);
});

test("works without secure-context APIs, as on a plain-HTTP LAN address", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Browsers expose crypto.randomUUID only on HTTPS or localhost.
  await page.addInitScript(() => { Object.defineProperty(Crypto.prototype, "randomUUID", { value: undefined }); });
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await writePoems(page, [1]);
  expect(errors).toEqual([]);
});

test("survives browsers whose scrollIntoView returns a Promise", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Newer Chrome returns a Promise from scroll methods.
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      scroll.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await writePoems(page, [1, 2]);
  expect(errors).toEqual([]);
});

test("sample page fits a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://127.0.0.1:8101");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
