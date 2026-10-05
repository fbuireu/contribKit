import type { ContributionDay } from "@domain/entities/types";
import type { ContributionStats } from "@domain/services/contribution-stats";
import { type CellShape, DEFAULT_CELL_SHAPE, isCellShape } from "@domain/value-objects/cell-shape";
import { DEFAULT_PALETTE_KEY, type Palette, paletteByKey } from "@domain/value-objects/palette";
import { ExportCopyOutcome, recordUsageEvent, UsageEventName } from "../components/core/telemetry/usage-event";
import { buildCodeBlock, buildMarkdownLines, buildSvgLines, markdownSnippet } from "../components/export/code-preview";
import {
	DEFAULT_EXPORT_FORMAT,
	ExportFormatKey,
	exportTabDetail,
	isExportFormatKey,
} from "../components/export/export-formats";
import { formatHomeScreenWidgetTotal, formatStreak, formatTotalContributions } from "../components/grid/contribution";
import { CUSTOMIZER_GRID_GEOMETRY, EXPORT_GRID_GEOMETRY, HERO_GRID_GEOMETRY } from "../components/grid/grid-geometry";
import { generateMiniGrid } from "../components/grid/mini-grid";
import { renderCalendarString } from "../components/grid/render-svg";
import { formatHeroError } from "./contribution-errors";
import { ClassName, ElementId, Selector } from "./dom-contract";
import { getDays, getUsername } from "./state";

const COPIED_FEEDBACK_MS = 1500;

const flashTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

const copyToClipboard = async (text: string): Promise<boolean> => {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
};

const COPY_LABEL = "copy";

interface FlashParams {
	button: HTMLButtonElement;
	message: string;
}

const flash = ({ button, message }: FlashParams): void => {
	const pending = flashTimers.get(button);
	if (pending !== undefined) clearTimeout(pending);
	button.textContent = message;
	flashTimers.set(
		button,
		setTimeout(() => {
			flashTimers.delete(button);
			button.textContent = COPY_LABEL;
		}, COPIED_FEEDBACK_MS),
	);
};

export const getActivePalette = (): Palette =>
	paletteByKey(document.querySelector<HTMLElement>(Selector.ActivePaletteRow)?.dataset.key ?? DEFAULT_PALETTE_KEY);

export const getActiveShape = (): CellShape => {
	const key = document.querySelector<HTMLElement>(Selector.ActiveShapeButton)?.dataset.key;
	return key !== undefined && isCellShape(key) ? key : DEFAULT_CELL_SHAPE;
};

export const getActiveExportTab = (): ExportFormatKey | null => {
	const key = document.querySelector<HTMLElement>(Selector.SelectedExportTab)?.dataset.key ?? DEFAULT_EXPORT_FORMAT;
	return isExportFormatKey(key) ? key : null;
};

export function renderHomeScreenWidget(): void {
	const palette = getActivePalette().colors;
	const phoneScreen = document.getElementById(ElementId.PhoneScreen);
	if (phoneScreen) phoneScreen.style.setProperty("--wp-peak", palette[4].hex);
	const homeScreenWidgetGrid = document.getElementById(ElementId.HomeScreenWidgetMiniGrid);
	if (homeScreenWidgetGrid) homeScreenWidgetGrid.innerHTML = generateMiniGrid({ palette, liveDays: getDays() });
	const homeScreenWidgetUsername = document.getElementById(ElementId.HomeScreenWidgetUsername);
	const username = getUsername();
	if (homeScreenWidgetUsername && username) homeScreenWidgetUsername.textContent = username.value;
}

export function renderCustomizer(): void {
	const palette = getActivePalette().colors;
	const shape = getActiveShape();
	const days = getDays();
	const customGrid = document.getElementById(ElementId.CustomGrid);
	if (customGrid)
		customGrid.innerHTML = renderCalendarString({
			days,
			palette,
			shape,
			...CUSTOMIZER_GRID_GEOMETRY,
			showLabels: false,
		});
	const heroGrid = document.getElementById(ElementId.HeroGrid);
	if (heroGrid)
		heroGrid.innerHTML = renderCalendarString({ days, palette, shape, ...HERO_GRID_GEOMETRY, showLabels: true });
	document.querySelectorAll<HTMLElement>(Selector.LegendSquares).forEach((square, index) => {
		square.style.background = (palette[index] ?? palette[0]).hex;
	});
	const paletteLabelEl = document.getElementById(ElementId.CustomPaletteLabel);
	if (paletteLabelEl) paletteLabelEl.textContent = getActivePalette().key;
	const shapeLabelEl = document.getElementById(ElementId.CustomShapeLabel);
	if (shapeLabelEl) shapeLabelEl.textContent = shape;
	renderExportPreview();
	renderHomeScreenWidget();
}

const renderExportTabDetails = (days: readonly ContributionDay[]): void => {
	document.querySelectorAll<HTMLElement>(Selector.ExportTabKeys).forEach((tab) => {
		const key = tab.dataset.key;
		const detail = tab.querySelector(Selector.ExportTabDetail);
		if (detail && key !== undefined && isExportFormatKey(key)) detail.textContent = exportTabDetail({ key, days });
	});
};

export function renderExportPreview(): void {
	const days = getDays();
	renderExportTabDetails(days);
	const preview = document.getElementById(ElementId.ExportPreview);
	const username = getUsername();
	if (!preview || username === null) return;
	preview.innerHTML = "";
	const card = document.createElement("div");
	card.className = ClassName.PreviewCard;
	const palette = getActivePalette().colors;
	const shape = getActiveShape();
	const exportTab = getActiveExportTab() ?? DEFAULT_EXPORT_FORMAT;

	if (exportTab === ExportFormatKey.Png) {
		card.classList.add(ClassName.PngPreview);
		const checker = document.createElement("div");
		checker.className = ClassName.PreviewChecker;
		checker.setAttribute("aria-hidden", "true");
		card.appendChild(checker);
		const content = document.createElement("div");
		content.className = ClassName.PreviewContent;
		content.innerHTML = renderCalendarString({ days, palette, shape, ...EXPORT_GRID_GEOMETRY, showLabels: false });
		card.appendChild(content);
		const tag = document.createElement("div");
		tag.className = `${ClassName.PreviewTag} mono`;
		tag.textContent = `${username.value}.png`;
		card.appendChild(tag);
	} else {
		card.classList.add(ClassName.CodePreview);
		const isSvgTab = exportTab === ExportFormatKey.Svg;
		const paletteKey = getActivePalette().key;
		const plainText = isSvgTab
			? renderCalendarString({ days, palette, shape, ...EXPORT_GRID_GEOMETRY, showLabels: false })
			: markdownSnippet({ username, palette: paletteKey, shape });
		card.appendChild(
			buildCodeBlock(
				isSvgTab ? buildSvgLines(plainText) : buildMarkdownLines({ username, palette: paletteKey, shape }),
			),
		);
		const copyButton = document.createElement("button");
		copyButton.className = `${ClassName.CopyButton} mono`;
		copyButton.textContent = COPY_LABEL;
		const format = isSvgTab ? ExportFormatKey.Svg : ExportFormatKey.Md;
		copyButton.addEventListener("click", () => {
			void copyToClipboard(plainText).then((copied) => {
				flash({ button: copyButton, message: copied ? "copied!" : "copy failed" });
				recordUsageEvent({
					event: UsageEventName.ExportCopied,
					properties: { format, outcome: copied ? ExportCopyOutcome.Copied : ExportCopyOutcome.Failed },
				});
			});
		});
		card.appendChild(copyButton);
		const tag = document.createElement("div");
		tag.className = `${ClassName.PreviewTag} mono`;
		tag.textContent = isSvgTab ? `${username.value}.svg` : "README.md";
		card.appendChild(tag);
	}
	preview.appendChild(card);
}

export function updateYearRange(days: readonly ContributionDay[]): void {
	const el = document.getElementById(ElementId.HeroYearRange);
	if (!el || days.length < 8) return;
	el.textContent = days[7].date.slice(0, 4);
}

export function updateHeroStats(stats: ContributionStats): void {
	const bar = document.querySelector(Selector.BarTag);
	if (bar)
		bar.innerHTML = `<span class="mono">${formatTotalContributions(stats.totalContributions)}</span> contributions`;
	const legend = document.querySelector(Selector.LegendStats);
	if (legend)
		legend.innerHTML = `<span><b class="mono">${formatStreak(stats.currentStreak)}</b> day streak</span><span class="${ClassName.Separator}" aria-hidden="true">·</span><span><b class="mono">${formatStreak(stats.longestStreak)}</b> longest</span>`;
}

export function updateHomeScreenWidgetStats(stats: ContributionStats): void {
	document.querySelectorAll(Selector.HomeScreenWidgetStreaks).forEach((streak) => {
		streak.textContent = formatStreak(stats.currentStreak);
	});
	const total = document.getElementById(ElementId.HomeScreenWidgetTotal);
	if (total) total.textContent = formatHomeScreenWidgetTotal(stats.totalContributions);
}

export function setHeroError(message: string | null): void {
	const errorEl = document.getElementById(ElementId.HeroError);
	if (!errorEl) return;
	if (message) {
		errorEl.textContent = formatHeroError(message);
		errorEl.hidden = false;
	} else {
		errorEl.textContent = "";
		errorEl.hidden = true;
	}
}
