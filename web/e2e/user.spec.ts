import { expect, test } from "@playwright/test";

test.describe("user svg endpoint", () => {
	test("returns an SVG image for a real user", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("svg");
		expect(await response.text()).toContain("<svg");
	});

	test("honors the shape query param", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg?shape=hex");
		expect(response.status()).toBe(200);
		expect(await response.text()).toContain("<polygon");
	});

	test("rejects an invalid username with 400", async ({ request }) => {
		const response = await request.get("/user/foo_bar.svg");
		expect(response.status()).toBe(400);
	});
});
