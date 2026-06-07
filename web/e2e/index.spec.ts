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

	test("shows the cookie consent banner when no consent cookie is set", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible();
	});

	test("renders indexable SEO meta tags with a large-image card", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "ContribKit");
		await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
		expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBe(await page.title());
	});
});
