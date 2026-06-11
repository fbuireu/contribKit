import type { ContributionDay } from "@domain/entities/types";
import { describe, expect, it } from "vitest";
import { getCells, getUsername, setCells, setUsername } from "./state";

describe("state", () => {
	it("stores and returns the cells", () => {
		const cells: ContributionDay[] = [{ date: "2024-01-01", level: 2, count: 4 }];
		setCells(cells);
		expect(getCells()).toBe(cells);
	});

	it("stores and returns the username", () => {
		setUsername("torvalds");
		expect(getUsername()).toBe("torvalds");
	});
});
