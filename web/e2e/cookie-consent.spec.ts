import { expect, test } from "@playwright/test";

test.describe("cookie consent", () => {
	test("shows the consent banner on first visit", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Manage" })).toBeVisible();
	});

	test("dismisses the banner after accepting", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Accept all" }).click();
		await expect(page.getByRole("button", { name: "Accept all" })).toBeHidden();
	});
});
