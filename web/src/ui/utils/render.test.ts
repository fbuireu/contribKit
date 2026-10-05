// @vitest-environment happy-dom

import { type ContributionDayParams, contributionDay } from "@domain/entities/contribution-day";
import type { ContributionDay } from "@domain/entities/types";
import { isFailure } from "@domain/failures/failure";
import { buildGridFromApi } from "@domain/services/calendar-grid";
import { DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { parseUsername, type Username } from "@domain/value-objects/username";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassName, ElementId, Selector } from "./dom-contract";
import {
	getActiveExportTab,
	getActivePalette,
	renderCustomizer,
	renderExportPreview,
	renderHomeScreenWidget,
	setHeroError,
	updateHeroStats,
	updateHomeScreenWidgetStats,
	updateYearRange,
} from "./render";
import { setDays, setUsername } from "./state";

const recordUsageEvent = vi.hoisted(() => vi.fn());

vi.mock("../components/core/telemetry/usage-event", async (importOriginal) => ({
	...(await importOriginal<typeof import("../components/core/telemetry/usage-event")>()),
	recordUsageEvent,
}));

const usernameOf = (raw: string): Username => {
	const parsed = parseUsername(raw);
	if (isFailure(parsed)) throw new Error(`fixture is not a Username: ${raw}`);
	return parsed;
};

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
	setUsername(usernameOf("torvalds"));
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

describe("updateHomeScreenWidgetStats", () => {
	const WIDGET_DOM = `<span class="${ClassName.HomeScreenWidgetStreak}"></span><span class="${ClassName.HomeScreenWidgetStreak}"></span><span id="${ElementId.HomeScreenWidgetTotal}"></span>`;
	const streaks = () =>
		[...document.querySelectorAll(Selector.HomeScreenWidgetStreaks)].map((node) => node.textContent);

	it("writes the streak the hero prints into both widgets, and the total into the medium one", () => {
		document.body.innerHTML = WIDGET_DOM;
		updateHomeScreenWidgetStats({ totalContributions: 1234, currentStreak: 5, longestStreak: 9 });

		expect(streaks()).toEqual(["5", "5"]);
		expect(byId(ElementId.HomeScreenWidgetTotal).textContent).toBe("1,234 contributions this year");
	});

	it("says unknown for a figure it was not given, never a 0 and never a number made up for the mock-up", () => {
		document.body.innerHTML = WIDGET_DOM;
		updateHomeScreenWidgetStats({ totalContributions: null, currentStreak: null, longestStreak: null });

		expect(streaks()).toEqual(["unknown", "unknown"]);
		expect(byId(ElementId.HomeScreenWidgetTotal).textContent).toBe("contributions unknown");
	});

	it("skips every node the page does not carry rather than throwing", () => {
		document.body.innerHTML = "";

		expect(() =>
			updateHomeScreenWidgetStats({ totalContributions: 1, currentStreak: 1, longestStreak: 1 }),
		).not.toThrow();
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

const CUSTOMIZER_DOM = `
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
		renderCustomizer();

		expect(byId(ElementId.CustomShapeLabel).textContent).toBe(DEFAULT_CELL_SHAPE);
	});

	it("falls back when nothing is marked active at all", () => {
		document.body.innerHTML = `<span id="${ElementId.CustomShapeLabel}"></span>`;
		renderCustomizer();

		expect(byId(ElementId.CustomShapeLabel).textContent).toBe(DEFAULT_CELL_SHAPE);
	});
});

describe("renderCustomizer over a full Customizer panel", () => {
	it("labels a Palette the markup does not define with the one it fell back to", () => {
		document.body.innerHTML = `<div id="${ElementId.PaletteList}"><button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="sepia"></button></div><span id="${ElementId.CustomPaletteLabel}"></span>`;

		expect(() => renderCustomizer()).not.toThrow();
		expect(byId(ElementId.CustomPaletteLabel).textContent).toBe(DEFAULT_PALETTE_KEY);
	});

	it("names the Palette and the Cell Shape the reader picked", () => {
		document.body.innerHTML = CUSTOMIZER_DOM;
		renderCustomizer();

		expect(byId(ElementId.CustomPaletteLabel).textContent).toBe("nord");
		expect(byId(ElementId.CustomShapeLabel).textContent).toBe("square");
		expect(byId(ElementId.CustomGrid).innerHTML).toContain("<svg");
		expect(byId(ElementId.HeroGrid).innerHTML).toContain("<svg");
	});

	it("paints the legend from the Palette, and repeats the first colour past its end", () => {
		document.body.innerHTML = `${CUSTOMIZER_DOM}<div class="${ClassName.Legend}">${`<span class="${ClassName.LegendSquare}"></span>`.repeat(6)}</div>`;
		renderCustomizer();

		const squares = document.querySelectorAll<HTMLElement>(Selector.LegendSquares);
		const colours = PALETTES.nord.colors;

		expect(squares[0].style.background).toBe(colours[0].hex);
		expect(squares[4].style.background).toBe(colours[4].hex);
		expect(squares[5].style.background).toBe(colours[0].hex);
	});

	it("skips every node the page does not carry rather than throwing", () => {
		document.body.innerHTML = "";

		expect(() => renderCustomizer()).not.toThrow();
	});
});

describe("renderHomeScreenWidget", () => {
	it("paints the phone preview from the active Palette and names the viewer", () => {
		document.body.innerHTML = `${CUSTOMIZER_DOM}<div id="${ElementId.PhoneScreen}"></div><div id="${ElementId.HomeScreenWidgetMiniGrid}"></div><span id="${ElementId.HomeScreenWidgetUsername}"></span>`;
		renderHomeScreenWidget();

		expect(byId(ElementId.PhoneScreen).style.getPropertyValue("--wp-peak")).toBe(PALETTES.nord.colors[4].hex);
		expect(byId(ElementId.HomeScreenWidgetMiniGrid).innerHTML).toContain("<svg");
		expect(byId(ElementId.HomeScreenWidgetUsername).textContent).toBe("torvalds");
	});

	it("leaves the username slot alone when there is no username to put in it", () => {
		setUsername(null);
		document.body.innerHTML = `<span id="${ElementId.HomeScreenWidgetUsername}">previous</span>`;
		renderHomeScreenWidget();

		expect(byId(ElementId.HomeScreenWidgetUsername).textContent).toBe("previous");
	});

	it("skips every node the page does not carry rather than throwing", () => {
		document.body.innerHTML = "";

		expect(() => renderHomeScreenWidget()).not.toThrow();
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

describe("renderExportPreview on the SVG tab", () => {
	const SVG_DOM = `
		<div id="${ElementId.ExportTabs}"><button data-key="svg" aria-selected="true"></button></div>
		<div id="${ElementId.PaletteList}"><button class="${ClassName.PaletteRow} ${ClassName.Active}" data-key="nord"></button></div>
		<div id="${ElementId.ShapeList}"><button class="${ClassName.ShapeButton} ${ClassName.Active}" data-key="hex"></button></div>
		<div id="${ElementId.ExportPreview}"></div>
	`;

	const copiedAfterClick = async (): Promise<string> => {
		const copied: string[] = [];
		vi.stubGlobal("navigator", {
			clipboard: {
				writeText: async (text: string) => {
					copied.push(text);
				},
			},
		});
		document.querySelector<HTMLButtonElement>(Selector.ExportCopyButton)?.click();
		await vi.waitFor(() => expect(copied).toHaveLength(1));
		return copied[0];
	};

	const shownLines = (): string[] =>
		[...document.querySelectorAll(`${Selector.ExportCodePreview} .code-line`)].map((line) => line.textContent ?? "");

	it("opens and closes with the markup its copy button copies, and counts the Cells between", async () => {
		setDays(buildGridFromApi({ days: [], year: 2028 }));
		document.body.innerHTML = SVG_DOM;
		renderExportPreview();

		const copied = await copiedAfterClick();
		const lines = shownLines();
		const at = lines.findIndex((line) => line.includes("more cells"));
		const head = lines.slice(0, at).join("");
		const tail = lines.slice(at + 1).join("");

		expect(copied.startsWith(head)).toBe(true);
		expect(copied.endsWith(tail)).toBe(true);
		expect(head).toContain('viewBox="0 0 672 108"');
		expect(lines[at]).toBe(`<!-- … ${54 * 7 - 3} more cells … -->`);
	});

	it("draws the Palette and the Cell Shape the reader picked", () => {
		document.body.innerHTML = SVG_DOM;
		renderExportPreview();

		const code = $(Selector.ExportCodePreview).textContent ?? "";

		expect(code).toContain("<polygon");
		expect(code).toContain(PALETTES.nord.colors[2].hex);
	});

	it("names the file after the viewer", () => {
		document.body.innerHTML = SVG_DOM;
		renderExportPreview();

		expect($(`#${ElementId.ExportPreview} .${ClassName.PreviewTag}`).textContent).toBe("torvalds.svg");
	});
});

describe("the tabs' details", () => {
	const TABS_DOM = `
		<div id="${ElementId.ExportTabs}">
			<button data-key="png" aria-selected="true"><span class="${ClassName.ExportTabDetail}">stale</span></button>
			<button data-key="svg" aria-selected="false"><span class="${ClassName.ExportTabDetail}">stale</span></button>
			<button data-key="md" aria-selected="false"><span class="${ClassName.ExportTabDetail}">stale</span></button>
		</div>
		<div id="${ElementId.ExportPreview}"></div>
	`;
	const details = (): string[] =>
		[...document.querySelectorAll(Selector.ExportTabKeys)].map(
			(tab) => tab.querySelector(Selector.ExportTabDetail)?.textContent ?? "",
		);

	it("are written from the days on screen", () => {
		setDays(buildGridFromApi({ days: [], year: 2024 }));
		document.body.innerHTML = TABS_DOM;
		renderExportPreview();

		expect(details()).toEqual(["660×108 · transparent", "Vector · 53×7 grid", "Live embed, re-renders on view"]);
	});

	it("are written again when a fetch brings a year of another length", () => {
		setDays(buildGridFromApi({ days: [], year: 2024 }));
		document.body.innerHTML = TABS_DOM;
		renderExportPreview();
		setDays(buildGridFromApi({ days: [], year: 2028 }));
		renderExportPreview();

		expect(details()).toEqual(["672×108 · transparent", "Vector · 54×7 grid", "Live embed, re-renders on view"]);
	});

	it("follow the days even when the Customizer redraws everything", () => {
		setDays(buildGridFromApi({ days: [], year: 2028 }));
		document.body.innerHTML = `${CUSTOMIZER_DOM}${TABS_DOM}`;
		renderCustomizer();

		expect(details()[0]).toBe("672×108 · transparent");
	});

	it("are written when there is no Username to draw a preview for", () => {
		setUsername(null);
		setDays(buildGridFromApi({ days: [], year: 2028 }));
		document.body.innerHTML = TABS_DOM;
		renderExportPreview();

		expect(details()[0]).toBe("672×108 · transparent");
	});

	it("skip a tab whose key names no Export Format and one that carries no detail", () => {
		document.body.innerHTML = `<div id="${ElementId.ExportTabs}"><button data-key="gif"><span class="${ClassName.ExportTabDetail}">kept</span></button><button data-key="png"></button></div>`;

		expect(() => renderExportPreview()).not.toThrow();
		expect(details()[0]).toBe("kept");
	});
});
