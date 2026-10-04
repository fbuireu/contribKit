import { expect, test } from "@playwright/test";

const UNKNOWN_PATH = "/this-does-not-exist-xyz";

test.describe("smoke", () => {
	test("the homepage answers with a rendered document @smoke", async ({ page }) => {
		const response = await page.goto("/");

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(/.+/);
	});

	test("an unknown path answers 404 @smoke", async ({ page }) => {
		const response = await page.goto(UNKNOWN_PATH);

		expect(response?.status()).toBe(404);
	});

	test("robots.txt is served @smoke", async ({ request }) => {
		const response = await request.get("/robots.txt");

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("text/plain");
	});

	test("the SVG endpoint refuses a malformed Username from the Worker @smoke", async ({ request }) => {
		const response = await request.get("/user/foo_bar.svg");

		expect(response.status()).toBe(400);
		expect(response.headers()["content-type"]).toBe("text/plain");
		expect(await response.text()).toBe("Invalid GitHub username");
	});
});
