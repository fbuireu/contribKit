// @vitest-environment happy-dom

import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassName, ElementId, Selector } from "./dom-contract";
import {
	getActiveExportTab,
	getActivePalette,
	renderCustomize,
	renderExportPreview,
	renderWidget,
	setHeroError,
	updateHeroStats,
	updateYearRange,
} from "./render";
import { setDays, setUsername } from "./state";

const recordUsageEvent = vi.hoisted(() => vi.fn());

vi.mock("../components/core/telemetry/usage-event", async (importOriginal) => ({
	...(await importOriginal<typeof import("../components/core/telemetry/usage-event")>()),
	recordUsageEvent,
}));

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const $ = (selector: string) => document.querySelector(selector) as HTMLElement;

const day = (params: ContributionDayParams): ContributionDay => {
	const built = contributionDay(params);
	if (isFailure(built)) throw new Error(`fixture is not a Contribution Day: ${params.date}`);
	return built;
};

const days: ContributionDay[] = Array.from({ length: 371 }, () => day({ date: "2024-06-15", level: 2, count: 4 }));

beforeEach(() => {
	document.body.innerHTML = "";
	recordUsageEvent.mockClear();
	setDays(days);
	setUsername("torvalds");
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("setHeroError", () => {
	it("shows then clears the hero error", () => {
		document.body.innerHTML = `<div id="${ElementId.HeroError}" hidden></div>`;
		setHeroError("boom");
		expect(byId(ElementId.HeroError).textContent).toBe("↳ boom");
		expect(byId(ElementId.HeroError).hidden).toBe(false);
		setHeroError(null);
		expect(byId(ElementId.HeroError).hidden).toBe(true);
	});
});

describe("updateHeroStats", () => {
	it("writes the totals into the bar and legend", () => {
		document.body.innerHTML = `<span class="${ClassName.BarTag}"></span><div class="${ClassName.LegendStats}"></div>`;
		updateHeroStats({ totalContributions: 1234, currentStreak: 5, longestStreak: 9 });
		expect($(Selector.BarTag).innerHTML).toContain("1,234");
		expect($(Selector.LegendStats).innerHTML).toContain("5");
		expect($(Selector.LegendStats).innerHTML).toContain("9");
	});

	it("prints every figure it was not given as unknown, never as 0", () => {
		document.body.innerHTML = `<span class="${ClassName.BarTag}"></span><div class="${ClassName.LegendStats}"></div>`;
		updateHeroStats({ totalContributions: null, currentStreak: null, longestStreak: null });

		expect($(Selector.BarTag).textContent).toBe("unknown contributions");
		expect($(Selector.LegendStats).textContent).toBe("unknown day streak·unknown longest");
	});

	it("writes what Hero.astro renders: no colour of its own, and a separator screen readers skip", () => {
		document.body.innerHTML = `<span class="${ClassName.BarTag}"></span><div class="${ClassName.LegendStats}"></div>`;
		updateHeroStats({ totalContributions: 1234, currentStreak: 5, longestStreak: 9 });

		expect($(Selector.BarTag).innerHTML).toBe(`<span class="mono">1,234</span> contributions`);
		expect($(`.${ClassName.LegendStats} .${ClassName.Separator}`).getAttribute("aria-hidden")).toBe("true");
	});
});

describe("updateYearRange", () => {
	it("takes the year from the 8th cell", () => {
		document.body.innerHTML = `<span id="${ElementId.HeroYearRange}"></span>`;
		updateYearRange(days);
		expect(byId(ElementId.HeroYearRange).textContent).toBe("2024");
	});
});

describe("renderExportPreview", () => {
	it("renders a png card by default", () => {
		document.body.innerHTML = `<div id="${ElementId.ExportPreview}"></div>`;
		renderExportPreview();
		expect(document.querySelector(Selector.ExportPngPreview)).not.toBeNull();
	});

	it("draws the default preview for a selected tab whose key names no Export Format", () => {
		document.body.innerHTML = `<div id="${ElementId.ExportTabs}"><button data-key="gif" aria-selected="true"></button></div><div id="${ElementId.ExportPreview}"></div>`;

		expect(getActiveExportTab()).toBeNull();
		renderExportPreview();

		expect(document.querySelector(Selector.ExportPngPreview)).not.toBeNull();
		expect(document.querySelector(Selector.ExportCodePreview)).toBeNull();
	});

	it("renders a code preview when the svg tab is active", () => {
		document.body.innerHTML = `<div id="${ElementId.ExportTabs}"><button data-key="svg" aria-selected="true"></button></div><div id="${ElementId.ExportPreview}"></div>`;
		expect(getActiveExportTab()).toBe("svg");
		renderExportPreview();
		expect(document.querySelector(Selector.ExportCodePreview)).not.toBeNull();
		expect(document.querySelector(Selector.ExportCopyButton)).not.toBeNull();
	});
});

describe("getActivePalette", () => {
	const withActiveKey = (key: string) => {
		document.body.innerHTML = `<div id="${ElementId.PaletteList}"><div class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="${key}"></div></div>`;
	};

	it("reads the key the markup marks active", () => {
		withActiveKey("catppuccin");

		expect(getActivePalette().key).toBe("catppuccin");
		expect(getActivePalette().colors).toEqual(PALETTES.catppuccin.colors);
	});

	it("falls back to the default when no row is active", () => {
		document.body.innerHTML = `<div id="${ElementId.PaletteList}"></div>`;

		expect(getActivePalette().key).toBe(DEFAULT_PALETTE_KEY);
	});

	it("falls back rather than throwing when the markup names a palette that does not exist", () => {
		withActiveKey("not-a-palette");

		expect(() => getActivePalette()).not.toThrow();
		expect(getActivePalette().key).toBe(DEFAULT_PALETTE_KEY);
	});

	it("reports the key it actually used, so the label cannot disagree with the colours", () => {
		withActiveKey("not-a-palette");
		const palette = getActivePalette();

		expect(palette.colors).toEqual(PALETTES[palette.key].colors);
	});
});

describe("the copy button", () => {
	const clickCopy = async (writeText: () => Promise<void>) => {
		vi.stubGlobal("navigator", { clipboard: { writeText } });
		document.body.innerHTML = `<div id="${ElementId.ExportTabs}"><button data-key="svg" aria-selected="true"></button></div><div id="${ElementId.ExportPreview}"></div>`;
		renderExportPreview();
		const button = document.querySelector<HTMLButtonElement>(Selector.ExportCopyButton);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		return button;
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("says it copied, then goes back to offering to", async () => {
		const button = await clickCopy(async () => {});

		expect(button?.textContent).toBe("copied!");
		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});

	it("says it failed rather than staying silent when the clipboard refuses", async () => {
		const button = await clickCopy(() => Promise.reject(new Error("denied")));

		expect(button?.textContent).toBe("copy failed");
	});

	it("settles back on copy after a second click, never on a stale label", async () => {
		const button = await clickCopy(async () => {});
		expect(button?.textContent).toBe("copied!");

		await vi.advanceTimersByTimeAsync(500);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(button?.textContent).toBe("copied!");

		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});

	it("records the copy with the Export Format it copied", async () => {
		await clickCopy(async () => {});

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "export_copied", properties: { format: "svg", outcome: "copied" } }],
		]);
	});

	it("records a refused clipboard as a failed copy", async () => {
		await clickCopy(() => Promise.reject(new Error("denied")));

		expect(recordUsageEvent.mock.calls).toEqual([
			[{ event: "export_copied", properties: { format: "svg", outcome: "failed" } }],
		]);
	});

	it("does not claim success when the second click is the one that failed", async () => {
		let refuse = false;
		const button = await clickCopy(async () => {
			if (refuse) throw new Error("denied");
		});
		expect(button?.textContent).toBe("copied!");

		refuse = true;
		await vi.advanceTimersByTimeAsync(500);
		button?.click();
		await vi.advanceTimersByTimeAsync(0);
		expect(button?.textContent).toBe("copy failed");

		await vi.advanceTimersByTimeAsync(1500);
		expect(button?.textContent).toBe("copy");
	});
});

const CUSTOMIZE_DOM = `
	<div id="${ElementId.PaletteList}"><button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="nord"></button></div>
	<div id="${ElementId.ShapeList}"><button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="square"></button></div>
	<div id="${ElementId.CustomGrid}"></div>
	<div id="${ElementId.HeroGrid}"></div>
	<span id="${ElementId.CustomPaletteLabel}"></span>
	<span id="${ElementId.CustomShapeLabel}"></span>
`;

describe("getActiveShape", () => {
	it("falls back rather than trusting a data-key naming no Cell Shape", () => {
		document.body.innerHTML = `<div id="${ElementId.ShapeList}"><button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="hexagram"></button></div><span id="${ElementId.CustomShapeLabel}"></span>`;
		renderCustomize();

		expect(byId(ElementId.CustomShapeLabel).textContent).toBe(DEFAULT_CELL_SHAPE);
	});

	it("falls back when nothing is marked active at all", () => {
		document.body.innerHTML = `<span id="${ElementId.CustomShapeLabel}"></span>`;
		renderCustomize();

		expect(byId(ElementId.CustomShapeLabel).textContent).toBe(DEFAULT_CELL_SHAPE);
	});
});

describe("renderCustomize over a full customize panel", () => {
	it("labels a Palette the markup does not define with the one it fell back to", () => {
		document.body.innerHTML = `<div id="${ElementId.PaletteList}"><button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="sepia"></button></div><span id="${ElementId.CustomPaletteLabel}"></span>`;

		expect(() => renderCustomize()).not.toThrow();
		expect(byId(ElementId.CustomPaletteLabel).textContent).toBe(DEFAULT_PALETTE_KEY);
	});

	it("names the Palette and the Cell Shape the reader picked", () => {
		document.body.innerHTML = CUSTOMIZE_DOM;
		renderCustomize();

		expect(byId(ElementId.CustomPaletteLabel).textContent).toBe("nord");
		expect(byId(ElementId.CustomShapeLabel).textContent).toBe("square");
		expect(byId(ElementId.CustomGrid).innerHTML).toContain("<svg");
		expect(byId(ElementId.HeroGrid).innerHTML).toContain("<svg");
	});

	it("paints the legend from the Palette, and repeats the first colour past its end", () => {
		document.body.innerHTML = `${CUSTOMIZE_DOM}<div class="${ClassName.Legend}">${`<span class="${ClassName.LegendSquare}"></span>`.repeat(6)}</div>`;
		renderCustomize();

		const squares = document.querySelectorAll<HTMLElement>(Selector.LegendSquares);
		const colours = PALETTES.nord.colors;

		expect(squares[0].style.background).toBe(colours[0].hex);
		expect(squares[4].style.background).toBe(colours[4].hex);
		expect(squares[5].style.background).toBe(colours[0].hex);
	});

	it("skips every node the page does not carry rather than throwing", () => {
		document.body.innerHTML = "";

		expect(() => renderCustomize()).not.toThrow();
	});
});

describe("renderWidget", () => {
	it("paints the phone preview from the active Palette and names the viewer", () => {
		document.body.innerHTML = `${CUSTOMIZE_DOM}<div id="${ElementId.PhoneScreen}"></div><div id="${ElementId.WidgetMiniGrid}"></div><span id="${ElementId.WidgetUsername}"></span>`;
		renderWidget();

		expect(byId(ElementId.PhoneScreen).style.getPropertyValue("--wp-peak")).toBe(PALETTES.nord.colors[4].hex);
		expect(byId(ElementId.WidgetMiniGrid).innerHTML).toContain("<svg");
		expect(byId(ElementId.WidgetUsername).textContent).toBe("torvalds");
	});

	it("leaves the username slot alone when there is no username to put in it", () => {
		setUsername("");
		document.body.innerHTML = `<span id="${ElementId.WidgetUsername}">previous</span>`;
		renderWidget();

		expect(byId(ElementId.WidgetUsername).textContent).toBe("previous");
	});

	it("skips every node the page does not carry rather than throwing", () => {
		document.body.innerHTML = "";

		expect(() => renderWidget()).not.toThrow();
	});
});

describe("renderExportPreview on the markdown tab", () => {
	const MARKDOWN_DOM = `
		<div id="${ElementId.ExportTabs}"><button data-key="md" aria-selected="true"></button></div>
		<div id="${ElementId.PaletteList}"><button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="nord"></button></div>
		<div id="${ElementId.ShapeList}"><button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="square"></button></div>
		<div id="${ElementId.ExportPreview}"></div>
	`;

	it("names the file README.md rather than an image", () => {
		document.body.innerHTML = MARKDOWN_DOM;
		renderExportPreview();

		expect($(`#${ElementId.ExportPreview} .${ClassName.PreviewTag}`).textContent).toBe("README.md");
	});

	it("records a copy as markdown, and never the username the snippet carries", async () => {
		vi.stubGlobal("navigator", { clipboard: { writeText: async () => {} } });
		document.body.innerHTML = MARKDOWN_DOM;
		renderExportPreview();

		document.querySelector<HTMLButtonElement>(Selector.ExportCopyButton)?.click();
		await vi.waitFor(() =>
			expect(recordUsageEvent.mock.calls).toEqual([
				[{ event: "export_copied", properties: { format: "md", outcome: "copied" } }],
			]),
		);

		expect(JSON.stringify(recordUsageEvent.mock.calls)).not.toContain("torvalds");
	});

	it("shows exactly the text its copy button copies, with the Cell Shape at its default", async () => {
		const copied: string[] = [];
		vi.stubGlobal("navigator", {
			clipboard: {
				writeText: async (text: string) => {
					copied.push(text);
				},
			},
		});
		document.body.innerHTML = MARKDOWN_DOM.replace('data-key="square"', `data-key="${DEFAULT_CELL_SHAPE}"`);
		renderExportPreview();

		const shown = [...document.querySelectorAll(`${Selector.ExportCodePreview} .code-line`)]
			.map((line) => line.textContent)
			.join("\n");
		document.querySelector<HTMLButtonElement>(Selector.ExportCopyButton)?.click();
		await vi.waitFor(() => expect(copied).toHaveLength(1));

		expect(shown).toBe(copied[0]);
	});

	it("shows a code block naming the viewer, the Palette and the Cell Shape", () => {
		document.body.innerHTML = MARKDOWN_DOM;
		renderExportPreview();

		const code = $(Selector.ExportCodePreview).textContent ?? "";

		expect(getActiveExportTab()).toBe("md");
		expect(code).toContain("torvalds");
		expect(code).toContain("nord");
		expect(code).toContain("square");
	});
});
