import { expect, test } from "@playwright/test";

test.describe("api/contributions", () => {
	test("returns a calendar for a valid user", async ({ request }) => {
		const response = await request.get("/api/contributions?user=torvalds");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.username).toBe("torvalds");
		expect(Array.isArray(body.days)).toBe(true);
		expect(body.days.length).toBeGreaterThan(300);
		expect(body.cells).toEqual(body.days);

		for (const day of body.days) {
			expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(day.level).toBeGreaterThanOrEqual(0);
			expect(day.level).toBeLessThanOrEqual(4);
			expect(day.count === null || typeof day.count === "number").toBe(true);
		}

		expect(body.total === null || typeof body.total === "number").toBe(true);
	});

	test("answers for the year it was asked for, not the rolling window", async ({ request }) => {
		const response = await request.get("/api/contributions?user=torvalds&year=2022");
		expect(response.status()).toBe(200);

		const body = await response.json();
		const years = new Set(body.days.map((day: { date: string }) => day.date.slice(0, 4)));
		expect([...years]).toEqual(["2022"]);
	});

	test("returns 400 without a user", async ({ request }) => {
		const response = await request.get("/api/contributions");
		expect(response.status()).toBe(400);
	});

	test("returns 400 for a year outside the range, rather than quietly picking one", async ({ request }) => {
		const response = await request.get("/api/contributions?user=torvalds&year=1999");
		expect(response.status()).toBe(400);
	});
});
