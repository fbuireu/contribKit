import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
	test("the homepage answers 200 @smoke", async ({ page }) => {
		const response = await page.goto("/");
		expect(response?.status()).toBe(200);
	});

	test("an unknown path answers 404 @smoke", async ({ page }) => {
		const response = await page.goto("/this-does-not-exist-xyz");
		expect(response?.status()).toBe(404);
		await expect(page.locator("main#main-content")).toContainText("404");
	});

	test("the SVG endpoint answers with an image @smoke", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("svg");
		expect(await response.text()).toContain("<svg");
	});
});
