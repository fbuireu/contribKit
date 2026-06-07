import { describe, expect, it } from "vitest";
import { getCells, getUsername, setCells, setUsername } from "./home-state";

describe("home-state", () => {
	it("stores and returns the cells", () => {
		const cells = [{ date: "2024-01-01", level: 2, count: 4 }];
		setCells(cells);
		expect(getCells()).toBe(cells);
	});

	it("stores and returns the username", () => {
		setUsername("torvalds");
		expect(getUsername()).toBe("torvalds");
	});
});
