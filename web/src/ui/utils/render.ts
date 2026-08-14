import type { ContributionDay } from "@domain/entities/types";
import type { ContributionStats } from "@domain/services/contribution-stats";
import { DEFAULT_CELL_SHAPE } from "@domain/value-objects/cell-shape";
import { DEFAULT_PALETTE_KEY, type Palette, paletteByKey } from "@domain/value-objects/palette";
import { buildCodeBlock, buildMarkdownLines, markdownSnippet, SVG_LINES } from "@ui/components/export/code-preview";
import { DEFAULT_EXPORT_FORMAT, ExportFormatKey } from "@ui/components/export/export-formats";
import { formatTotalContributions } from "@ui/components/grid/contribution";
import { CUSTOMIZE_GRID_PRESET, EXPORT_GRID_PRESET, HERO_GRID_PRESET } from "@ui/components/grid/grid-presets";
import { generateMiniGrid } from "@ui/components/grid/mini-grid";
import { renderCalendarString } from "@ui/components/grid/render-svg";
import { formatHeroError } from "./contribution-errors";
import { getDays, getUsername } from "./state";

export const getActivePalette = (): Palette =>
	paletteByKey(
		document.querySelector<HTMLElement>("#palette-list .palette-row.active")?.dataset.key ?? DEFAULT_PALETTE_KEY,
	);

export const getActiveShape = (): string =>
	document.querySelector<HTMLElement>("#shape-list .shape-btn.active")?.dataset.key ?? DEFAULT_CELL_SHAPE;

export const getActiveExportTab = (): string =>
	document.querySelector<HTMLElement>('#export-tabs [aria-selected="true"]')?.dataset.key ?? DEFAULT_EXPORT_FORMAT;

export function renderWidget(): void {
	const palette = getActivePalette().colors;
	const phoneScreen = document.getElementById("phone-screen");
	if (phoneScreen) phoneScreen.style.setProperty("--wp-peak", palette[4]);
	const widgetGrid = document.getElementById("widget-mini-grid");
	if (widgetGrid) widgetGrid.innerHTML = generateMiniGrid({ palette, liveDays: getDays() });
	const widgetUsername = document.getElementById("widget-username");
	const username = getUsername();
	if (widgetUsername && username) widgetUsername.textContent = username;
}

export function renderCustomize(): void {
	const palette = getActivePalette().colors;
	const shape = getActiveShape();
	const days = getDays();
	const customGrid = document.getElementById("custom-grid-container");
	if (customGrid)
		customGrid.innerHTML = renderCalendarString({ days, palette, shape, ...CUSTOMIZE_GRID_PRESET, showLabels: false });
	const heroGrid = document.getElementById("hero-grid-container");
	if (heroGrid)
		heroGrid.innerHTML = renderCalendarString({ days, palette, shape, ...HERO_GRID_PRESET, showLabels: true });
	document.querySelectorAll<HTMLElement>(".legend .legend-sq").forEach((square, index) => {
		square.style.background = palette[index] ?? palette[0];
	});
	const paletteLabelEl = document.getElementById("custom-palette-label");
	if (paletteLabelEl) paletteLabelEl.textContent = getActivePalette().key;
	const shapeLabelEl = document.getElementById("custom-shape-label");
	if (shapeLabelEl) shapeLabelEl.textContent = shape;
	renderExportPreview();
	renderWidget();
}

export function renderExportPreview(): void {
	const preview = document.getElementById("export-preview");
	if (!preview) return;
	preview.innerHTML = "";
	const card = document.createElement("div");
	card.className = "preview-card";
	const palette = getActivePalette().colors;
	const shape = getActiveShape();
	const exportTab = getActiveExportTab();
	const days = getDays();
	const username = getUsername();

	if (exportTab === ExportFormatKey.Png) {
		card.classList.add("png-preview");
		const checker = document.createElement("div");
		checker.className = "preview-checker";
		checker.setAttribute("aria-hidden", "true");
		card.appendChild(checker);
		const content = document.createElement("div");
		content.className = "preview-content";
		content.innerHTML = renderCalendarString({ days, palette, shape, ...EXPORT_GRID_PRESET, showLabels: false });
		card.appendChild(content);
		const tag = document.createElement("div");
		tag.className = "preview-tag mono";
		tag.textContent = `${username}.png`;
		card.appendChild(tag);
	} else {
		card.classList.add("code-preview");
		const isSvgTab = exportTab === ExportFormatKey.Svg;
		const paletteKey = getActivePalette().key;
		card.appendChild(
			buildCodeBlock(isSvgTab ? SVG_LINES : buildMarkdownLines({ username, palette: paletteKey, shape })),
		);
		const plainText = isSvgTab
			? renderCalendarString({ days, palette, shape, ...EXPORT_GRID_PRESET, showLabels: false })
			: markdownSnippet({ username, palette: paletteKey, shape });
		const copyButton = document.createElement("button");
		copyButton.className = "copy-btn mono";
		copyButton.textContent = "copy";
		copyButton.addEventListener("click", () => {
			navigator.clipboard.writeText(plainText).then(() => {
				copyButton.textContent = "copied!";
				setTimeout(() => {
					copyButton.textContent = "copy";
				}, 1500);
			});
		});
		card.appendChild(copyButton);
		const tag = document.createElement("div");
		tag.className = "preview-tag mono";
		tag.textContent = isSvgTab ? `${username}.svg` : "README.md";
		card.appendChild(tag);
	}
	preview.appendChild(card);
}

export function updateYearRange(days: ContributionDay[]): void {
	const el = document.getElementById("hero-year-range");
	if (!el || days.length < 8) return;
	el.textContent = days[7].date.slice(0, 4);
}

export function updateHeroStats(stats: ContributionStats): void {
	const bar = document.querySelector(".bar-tag");
	if (bar)
		bar.innerHTML = `<span class="mono" style="color:var(--contrib-peak)">${formatTotalContributions(stats.totalContributions)}</span> contributions`;
	const legend = document.querySelector(".legend-stats");
	if (legend)
		legend.innerHTML = `<span><b class="mono">${stats.currentStreak}</b> day streak</span><span class="sep">·</span><span><b class="mono">${stats.longestStreak}</b> longest</span>`;
}

export function setHeroError(message: string | null): void {
	const errorEl = document.getElementById("hero-error");
	if (!errorEl) return;
	if (message) {
		errorEl.textContent = formatHeroError(message);
		errorEl.hidden = false;
	} else {
		errorEl.textContent = "";
		errorEl.hidden = true;
	}
}
