import { expect, test } from "@playwright/test";

test.describe("homepage", () => {
	test("returns 200", async ({ page }) => {
		const response = await page.goto("/");
		expect(response?.status()).toBe(200);
	});

	test("has a non-empty title", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/.+/);
	});

	test("renders main#main-content", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("main#main-content")).toBeVisible();
	});

	test("renders the hero with the username input", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("section.hero")).toBeVisible();
		await expect(page.locator("#hero-username")).toBeVisible();
	});

	test("renders the contribution grid", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#hero-grid-container svg")).toBeVisible();
	});
});
