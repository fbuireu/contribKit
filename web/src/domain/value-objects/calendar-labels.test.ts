import { describe, expect, it } from "vitest";
import { DOW, MONTHS } from "./calendar-labels";

describe("calendar labels", () => {
	it("has 12 months from Jan to Dec", () => {
		expect(MONTHS).toHaveLength(12);
		expect(MONTHS[0]).toBe("Jan");
		expect(MONTHS[11]).toBe("Dec");
	});

	it("exposes Mon/Wed/Fri day labels", () => {
		expect(DOW).toEqual(["Mon", "Wed", "Fri"]);
	});
});
