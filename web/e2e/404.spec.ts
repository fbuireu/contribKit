import { expect, test } from "@playwright/test";
import { ClassName, ElementId } from "../src/ui/utils/dom-contract";

test.describe("404 page", () => {
	test("keeps the 404 out of every cache", async ({ request }) => {
		const response = await request.get("/this-does-not-exist-xyz");

		expect(response.status()).toBe(404);
		expect(response.headers()["cache-control"]).toBe("no-store");
	});

	test("draws the 404 status code as a contribution grid", async ({ page }) => {
		await page.goto("/this-does-not-exist-xyz");
		await expect(page.getByRole("img", { name: /status code 404/i })).toBeVisible();
	});

	test("renders the error view (title, eyebrow, terminal, actions)", async ({ page }) => {
		await page.goto("/this-does-not-exist-xyz");
		await expect(page.locator(`h1#${ElementId.ErrorTitle}`)).toHaveText("This page ghosted you.");
		await expect(page.locator(`.${ClassName.ErrorEyebrow}`)).toContainText("404");
		await expect(page.locator(`.${ClassName.ErrorTerminal}`)).toContainText("error: 404");
		await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
		await expect(page.getByRole("link", { name: "Report issue" })).toBeVisible();
	});
});
