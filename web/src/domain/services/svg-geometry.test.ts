import { describe, expect, it } from "vitest";
import type { ContributionDay } from "../entities/types";
import { buildGridFromApi } from "./calendar-grid";
import { GRID_CELL_COUNT, WEEKS_PER_YEAR } from "./dates";
import { calendarLayout, dotRadius, hexPoints } from "./svg-geometry";

const TWO_DECIMAL_POINT_PAIR = /^-?\d+\.\d{2},-?\d+\.\d{2}$/;

const SIZE = 10;
const GAP = 2;
const CELL_WIDTH = SIZE + GAP;

const year = (value: number): ContributionDay[] => buildGridFromApi({ days: [], year: value });

const layoutFor = (overrides: Partial<Parameters<typeof calendarLayout>[0]> = {}) =>
	calendarLayout({ days: year(2024), shape: "rounded", size: SIZE, gap: GAP, ...overrides });

describe("dotRadius", () => {
	it("level 0 → 1.4", () => expect(dotRadius(0)).toBe(1.4));
	it("grows with level", () => {
		expect(dotRadius(1)).toBe(2.4);
		expect(dotRadius(4)).toBe(5.4);
	});
});

describe("hexPoints", () => {
	it("returns 6 space-separated x,y points fixed to 2 decimals", () => {
		const points = hexPoints({ cx: 10, cy: 10, radius: 7 }).split(" ");
		expect(points).toHaveLength(6);
		for (const point of points) expect(point).toMatch(TWO_DECIMAL_POINT_PAIR);
	});
});

describe("calendarLayout — the radius each Cell Shape is drawn with", () => {
	it("rounded → 2.5", () => expect(layoutFor({ shape: "rounded" }).radius).toBe(2.5));
	it("square → 0", () => expect(layoutFor({ shape: "square" }).radius).toBe(0));
	it("other shapes → size / 2", () => {
		expect(layoutFor({ shape: "circle" }).radius).toBe(5);
		expect(layoutFor({ shape: "dot", size: 12 }).radius).toBe(6);
	});
});

describe("calendarLayout — dimensions", () => {
	it("is a whole Contribution Grid wide, plus the weekday gutter and the padding", () => {
		expect(layoutFor().width).toBe(WEEKS_PER_YEAR * CELL_WIDTH + 28 + 12 * 2);
	});

	it("drops both gutters when labels are hidden", () => {
		const hidden = layoutFor({ showLabels: false });

		expect(hidden.origin).toEqual({ x: 12, y: 12 });
		expect(hidden.width).toBe(WEEKS_PER_YEAR * CELL_WIDTH + 12 * 2);
		expect(hidden.monthLabels).toEqual([]);
		expect(hidden.weekdayLabels).toEqual([]);
	});

	it("puts the grid origin past both gutters", () => {
		expect(layoutFor().origin).toEqual({ x: 12 + 28, y: 12 + 18 });
	});

	it("carries the size the cells were laid out with, so a renderer never re-derives it", () => {
		expect(layoutFor({ size: 14 }).size).toBe(14);
	});
});

describe("calendarLayout — month labels", () => {
	const labelsFor = (days: ContributionDay[]) => calendarLayout({ days, shape: "rounded" }).monthLabels;

	it("names twelve months for a calendar year, in order", () => {
		const labels = labelsFor(year(2024));

		expect(labels).toHaveLength(12);
		expect(labels[0].label).toBe("Jan");
		expect(labels[11].label).toBe("Dec");
	});

	it("steps one cell width per week", () => {
		const labels = layoutFor().monthLabels;

		expect((labels[1].x - labels[0].x) % CELL_WIDTH).toBe(0);
	});

	it("sits on a single baseline", () => {
		const labels = layoutFor().monthLabels;

		expect(new Set(labels.map(({ y }) => y)).size).toBe(1);
	});

	it("skips a month whose first visible week starts too late", () => {
		const days: ContributionDay[] = [
			{ date: "2024-01-01", level: 0, count: null },
			{ date: "2024-02-09", level: 0, count: null },
		];

		expect(labelsFor(days).map(({ label }) => label)).toEqual(["Jan"]);
	});
});

describe("calendarLayout — weekday labels", () => {
	it("draws three labels on alternate rows", () => {
		const rows = layoutFor().weekdayLabels.map(({ y }) => y);

		expect(rows).toHaveLength(3);
		expect(rows[1] - rows[0]).toBe(CELL_WIDTH * 2);
		expect(rows[2] - rows[1]).toBe(CELL_WIDTH * 2);
	});

	it("sits in the gutter, left of the grid", () => {
		const layout = layoutFor();

		for (const { x } of layout.weekdayLabels) expect(x).toBeLessThan(layout.origin.x);
	});
});

describe("calendarLayout — cells", () => {
	it("places one Cell per Contribution Day of the whole grid", () => {
		expect(layoutFor().cells).toHaveLength(GRID_CELL_COUNT);
	});

	it("lays cells out week by column and day by row, relative to the origin", () => {
		const cells = layoutFor().cells;

		expect(cells[0]).toMatchObject({ x: 0, y: 0 });
		expect(cells[3]).toMatchObject({ x: 0, y: 3 * CELL_WIDTH });
		expect(cells[7]).toMatchObject({ x: CELL_WIDTH, y: 0 });
	});

	it("carries each Contribution Day's own date and Count", () => {
		const days: ContributionDay[] = [{ date: "2024-06-15", level: 3, count: 9 }];
		const cell = calendarLayout({ days: buildGridFromApi({ days, year: 2024 }), shape: "rounded" }).cells.find(
			({ date }) => date === "2024-06-15",
		);

		expect(cell?.count).toBe(9);
		expect(cell?.level).toBe(3);
	});

	it("clamps a level neither renderer's input type guarantees", () => {
		const untrusted = [{ date: "2024-06-15", level: 9, count: 1 }] as unknown as ContributionDay[];
		const cell = calendarLayout({ days: untrusted, shape: "rounded" }).cells[0];

		expect(cell.level).toBe(4);
	});

	it("keeps an unknown Count null rather than turning it into a zero", () => {
		expect(layoutFor().cells.every(({ count }) => count === null)).toBe(true);
	});
});
