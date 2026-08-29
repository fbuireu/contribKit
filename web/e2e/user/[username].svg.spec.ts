import { expect, test } from "@playwright/test";

test.describe("user svg endpoint", () => {
	test("honors the shape query param", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg?shape=hex");
		expect(response.status()).toBe(200);
		expect(await response.text()).toContain("<polygon");
	});

	test("rejects an invalid username with 400", async ({ request }) => {
		const response = await request.get("/user/foo_bar.svg");
		expect(response.status()).toBe(400);
	});

	test("honors the palette query param", async ({ request }) => {
		const nord = await request.get("/user/torvalds.svg?palette=nord");
		const github = await request.get("/user/torvalds.svg");

		expect(nord.status()).toBe(200);
		expect(await nord.text()).not.toBe(await github.text());
	});

	test("degrades a junk palette or shape instead of erroring, because it is an <img>", async ({ request }) => {
		for (const query of ["?palette=not-a-palette", "?shape=not-a-shape", "?palette=x&shape=y"]) {
			const response = await request.get(`/user/torvalds.svg${query}`);

			expect(response.status(), query).toBe(200);
			expect(await response.text(), query).toContain("<svg");
		}
	});

	test("paints a background it accepts, and ignores one it does not", async ({ request }) => {
		const painted = await request.get("/user/torvalds.svg?background=%23ff0000");
		const rejected = await request.get("/user/torvalds.svg?background=url(javascript:alert(1))");

		expect(painted.status()).toBe(200);
		expect(await painted.text()).toContain("#ff0000");

		expect(rejected.status()).toBe(200);
		expect(await rejected.text()).not.toContain("javascript");
	});

	test("is cached for an hour, which is the only thing throttling this route", async ({ request }) => {
		const response = await request.get("/user/torvalds.svg");

		expect(response.status(), await response.text()).toBe(200);
		expect(response.headers()["cache-control"]).toBe("public, max-age=3600, stale-while-revalidate=86400");
	});

	test("says no-store when it could not answer, so nobody's README caches a failure", async ({ request }) => {
		const response = await request.get("/user/foo_bar.svg");

		expect(response.status()).toBe(400);
		expect(response.headers()["cache-control"]).toBe("no-store");
	});

	test("opts out of the same-origin resource policy, so the Embed renders elsewhere", async ({ request }) => {
		const embed = await request.get("/user/torvalds.svg");
		const page = await request.get("/");

		expect(embed.headers()["cross-origin-resource-policy"]).toBe("cross-origin");
		expect(page.headers()["cross-origin-resource-policy"]).toBe("same-origin");
	});
});
