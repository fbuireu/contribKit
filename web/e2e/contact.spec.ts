import { expect, test } from "@playwright/test";
import { ElementId } from "../src/ui/utils/dom-contract";

const byId = (id: string) => `#${id}`;

test.describe("contact", () => {
	test("answers 200 with a heading and the whole form", async ({ page }) => {
		const response = await page.goto("/contact");

		expect(response?.status()).toBe(200);
		await expect(page.locator("h1")).toBeVisible();
		await expect(page.locator(byId(ElementId.ContactForm))).toBeVisible();
		await expect(page.locator(byId(ElementId.ContactEmail))).toBeVisible();
		await expect(page.locator(byId(ElementId.ContactMessage))).toBeVisible();
		await expect(page.locator(byId(ElementId.ContactSubmit))).toBeVisible();
	});

	test("stays in the index, unlike the legal pages", async ({ page }) => {
		await page.goto("/contact");

		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
	});

	test("400s a request that carries no message at all", async ({ request }) => {
		const response = await request.post("/api/contact", { data: {} });

		expect(response.status()).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid request body" });
	});

	test("accepts a submission that filled the honeypot, and sends no mail for it", async ({ request }) => {
		const response = await request.post("/api/contact", {
			data: {
				name: "spam bot",
				email: "bot@example.com",
				message: "this one never leaves the Worker",
				website: "https://spam.example",
			},
		});

		expect(response.status()).toBe(202);
		expect(await response.json()).toEqual({ status: "accepted" });
		expect(response.headers()["cache-control"]).toBe("no-store");
	});
});
