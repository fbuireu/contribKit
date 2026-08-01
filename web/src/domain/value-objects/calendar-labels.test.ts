import { describe, expect, it } from "vitest";
import { MONTH_LABELS, WEEKDAY_LABELS } from "./calendar-labels";

describe("calendar labels", () => {
	it("has 12 months from Jan to Dec", () => {
		expect(MONTH_LABELS).toHaveLength(12);
		expect(MONTH_LABELS[0]).toBe("Jan");
		expect(MONTH_LABELS[11]).toBe("Dec");
	});

	it("exposes Mon/Wed/Fri day labels", () => {
		expect(WEEKDAY_LABELS).toEqual(["Mon", "Wed", "Fri"]);
	});
});
