import type { ContributionDay } from "@domain/entities/types";
import { DEFAULT_PALETTE_KEY, PALETTES } from "@domain/value-objects/palette";
import { DEFAULT_SHAPE_KIND } from "@domain/value-objects/shape";
import { buildCodeBlock, buildMarkdownLines, markdownSnippet, SVG_LINES } from "@ui/components/export/code-preview";
import { DEFAULT_EXPORT_FORMAT, ExportFormatKey } from "@ui/components/export/export-formats";
import type { CellSummary } from "@ui/components/grid/calendar";
import { CUSTOMIZE_GRID_PRESET, EXPORT_GRID_PRESET, HERO_GRID_PRESET } from "@ui/components/grid/grid-presets";
import { generateMiniGrid } from "@ui/components/grid/mini-grid";
import { renderCalendarString } from "@ui/components/grid/render-svg";
import { formatHeroError } from "./contribution-errors";
import { getCells, getUsername } from "./state";

export const getActivePalette = (): string =>
	document.querySelector<HTMLElement>("#palette-list .palette-row.active")?.dataset.key ?? DEFAULT_PALETTE_KEY;

export const getActiveShape = (): string =>
	document.querySelector<HTMLElement>("#shape-list .shape-btn.active")?.dataset.key ?? DEFAULT_SHAPE_KIND;

export const getActiveExportTab = (): string =>
	document.querySelector<HTMLElement>('#export-tabs [aria-selected="true"]')?.dataset.key ?? DEFAULT_EXPORT_FORMAT;

export function renderWidget(): void {
	const palette = PALETTES[getActivePalette()].colors;
	const phoneScreen = document.getElementById("phone-screen");
	if (phoneScreen) phoneScreen.style.setProperty("--wp-peak", palette[4]);
	const widgetGrid = document.getElementById("widget-mini-grid");
	if (widgetGrid) widgetGrid.innerHTML = generateMiniGrid(palette, getCells());
	const widgetUsername = document.getElementById("widget-username");
	const username = getUsername();
	if (widgetUsername && username) widgetUsername.textContent = username;
}

export function renderCustomize(): void {
	const palette = PALETTES[getActivePalette()].colors;
	const shape = getActiveShape();
	const cells = getCells();
	const customGrid = document.getElementById("custom-grid-container");
	if (customGrid)
		customGrid.innerHTML = renderCalendarString({ cells, palette, shape, ...CUSTOMIZE_GRID_PRESET, showLabels: false });
	const heroGrid = document.getElementById("hero-grid-container");
	if (heroGrid)
		heroGrid.innerHTML = renderCalendarString({ cells, palette, shape, ...HERO_GRID_PRESET, showLabels: true });
	document.querySelectorAll<HTMLElement>(".legend .legend-sq").forEach((square, index) => {
		square.style.background = palette[index] ?? palette[0];
	});
	const paletteLabelEl = document.getElementById("custom-palette-label");
	if (paletteLabelEl) paletteLabelEl.textContent = getActivePalette();
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
	const palette = PALETTES[getActivePalette()].colors;
	const shape = getActiveShape();
	const exportTab = getActiveExportTab();
	const cells = getCells();
	const username = getUsername();

	if (exportTab === ExportFormatKey.Png) {
		card.classList.add("png-preview");
		const checker = document.createElement("div");
		checker.className = "preview-checker";
		checker.setAttribute("aria-hidden", "true");
		card.appendChild(checker);
		const content = document.createElement("div");
		content.className = "preview-content";
		content.innerHTML = renderCalendarString({ cells, palette, shape, ...EXPORT_GRID_PRESET, showLabels: false });
		card.appendChild(content);
		const tag = document.createElement("div");
		tag.className = "preview-tag mono";
		tag.textContent = `${username}.png`;
		card.appendChild(tag);
	} else {
		card.classList.add("code-preview");
		const isSvgTab = exportTab === ExportFormatKey.Svg;
		card.appendChild(
			buildCodeBlock(isSvgTab ? SVG_LINES : buildMarkdownLines({ username, palette: getActivePalette(), shape })),
		);
		const plainText = isSvgTab
			? renderCalendarString({ cells, palette, shape, ...EXPORT_GRID_PRESET, showLabels: false })
			: markdownSnippet(username);
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

export function updateYearRange(cells: ContributionDay[]): void {
	const el = document.getElementById("hero-year-range");
	if (!el || cells.length < 8) return;
	el.textContent = cells[7].date.slice(0, 4);
}

export function updateHeroStats(summary: CellSummary): void {
	const bar = document.querySelector(".bar-tag");
	if (bar)
		bar.innerHTML = `<span class="mono" style="color:var(--contrib-peak)">${summary.count.toLocaleString()}</span> contributions`;
	const stats = document.querySelector(".legend-stats");
	if (stats)
		stats.innerHTML = `<span><b class="mono">${summary.streak}</b> day streak</span><span class="sep">·</span><span><b class="mono">${summary.longest}</b> longest</span>`;
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
