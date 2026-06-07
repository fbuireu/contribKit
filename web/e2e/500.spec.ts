import { expect, test } from "@playwright/test";

test.describe("500 page", () => {
	test("the /500 route renders the error page with a 500 status", async ({ request }) => {
		const response = await request.get("/500");
		expect(response.status()).toBe(500);
		expect(await response.text()).toContain("500");
	});

	test("renders the error view with the danger tone and 500 grid", async ({ page }) => {
		await page.goto("/500");
		await expect(page.locator("h1#error-title")).toHaveText("Something broke on our end.");
		await expect(page.locator("section.error-page.is-danger")).toBeVisible();
		await expect(page.locator(".error-terminal")).toContainText("error: 500");
		await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/");
		await expect(page.getByRole("img", { name: /status code 500/i })).toBeVisible();
	});
});
