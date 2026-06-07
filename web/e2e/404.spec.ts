import { expect, test } from "@playwright/test";

test.describe("404 page", () => {
	test("unknown paths render the 404 page", async ({ page }) => {
		const response = await page.goto("/this-does-not-exist-xyz");
		expect(response?.status()).toBe(404);
		await expect(page.locator("main#main-content")).toContainText("404");
	});

	test("draws the 404 status code as a contribution grid", async ({ page }) => {
		await page.goto("/this-does-not-exist-xyz");
		await expect(page.getByRole("img", { name: /status code 404/i })).toBeVisible();
	});

	test("renders the error view (title, eyebrow, terminal, actions)", async ({ page }) => {
		await page.goto("/this-does-not-exist-xyz");
		await expect(page.locator("h1#error-title")).toHaveText("This page ghosted you.");
		await expect(page.locator(".error-eyebrow")).toContainText("404");
		await expect(page.locator(".error-terminal")).toContainText("error: 404");
		await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
		await expect(page.getByRole("link", { name: "Report issue" })).toBeVisible();
	});
});
