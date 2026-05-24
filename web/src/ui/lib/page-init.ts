import type { Cell, CellSummary } from './calendar-utils';
import type { ContributionDay } from '../../domain/entities/contribution-day';
import { formatContribLabel } from './contribution';
import { PALETTES, DEFAULT_PALETTE_KEY } from '../../domain/value-objects/palette';
import { DEFAULT_SHAPE_KIND } from '../../domain/value-objects/shape';
import { buildGridFromApi, rehydrateCells, summarize, generateData } from './calendar-utils';
import { renderCalendarString } from './render-svg';
import { SVG_LINES, buildMdLines, buildCodeBlock } from './code-preview';

const CELLS = Array.isArray(window.__INITIAL_CELLS__) && window.__INITIAL_CELLS__.length
  ? rehydrateCells(window.__INITIAL_CELLS__)
  : generateData(7);

const ERRORS: Record<number, string> = {
  404: 'user not found — check the username and try again',
  400: 'invalid username',
  502: 'could not reach github, try again in a moment',
};

let liveCells = CELLS;
let liveUsername = window.__INITIAL_USERNAME__;

const getActivePalette = () =>
  document.querySelector<HTMLElement>('#palette-list .palette-row.active')?.dataset.key ?? DEFAULT_PALETTE_KEY;

const getActiveShape = () =>
  document.querySelector<HTMLElement>('#shape-list .shape-btn.active')?.dataset.key ?? DEFAULT_SHAPE_KIND;

const getActiveExportTab = () =>
  document.querySelector<HTMLElement>('#export-tabs [aria-selected="true"]')?.dataset.key ?? 'png';

function renderCustomize() {
  const palette = PALETTES[getActivePalette()].colors;
  const shape = getActiveShape();
  const customGrid = document.getElementById('custom-grid-container');
  if (customGrid) customGrid.innerHTML = renderCalendarString({ cells: liveCells, palette, shape, size: 12, gap: 3, showLabels: false });
  const heroGrid = document.getElementById('hero-grid-container');
  if (heroGrid) heroGrid.innerHTML = renderCalendarString({ cells: liveCells, palette, shape, size: 13, gap: 3, showLabels: true });
  document.querySelectorAll<HTMLElement>('.legend .legend-sq').forEach((square, i) => {
    square.style.background = palette[i] ?? palette[0];
  });
  const paletteLabelEl = document.getElementById('custom-palette-label');
  if (paletteLabelEl) paletteLabelEl.textContent = getActivePalette();
  const shapeLabelEl = document.getElementById('custom-shape-label');
  if (shapeLabelEl) shapeLabelEl.textContent = shape;
  renderExportPreview();
}

function renderExportPreview() {
  const preview = document.getElementById('export-preview');
  if (!preview) return;
  preview.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'preview-card';
  const palette = PALETTES[getActivePalette()].colors;
  const shape = getActiveShape();
  const exportTab = getActiveExportTab();

  if (exportTab === 'png') {
    card.classList.add('png-preview');
    const checker = document.createElement('div');
    checker.className = 'preview-checker';
    checker.setAttribute('aria-hidden', 'true');
    card.appendChild(checker);
    const content = document.createElement('div');
    content.className = 'preview-content';
    content.innerHTML = renderCalendarString({ cells: liveCells, palette, shape, size: 10, gap: 2, showLabels: false });
    card.appendChild(content);
    const tag = document.createElement('div');
    tag.className = 'preview-tag mono';
    tag.textContent = `${liveUsername}.png`;
    card.appendChild(tag);
  } else {
    card.classList.add('code-preview');
    const mdLines = buildMdLines(liveUsername, getActivePalette(), shape);
    card.appendChild(buildCodeBlock(exportTab === 'svg' ? SVG_LINES : mdLines));
    const plainText = exportTab === 'svg'
      ? renderCalendarString({ cells: liveCells, palette, shape, size: 10, gap: 2, showLabels: false })
      : `![contributions](https://contribkit.app/user/${liveUsername}.svg)`;
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-btn mono';
    copyButton.textContent = 'copy';
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(plainText).then(() => {
        copyButton.textContent = 'copied!';
        setTimeout(() => { copyButton.textContent = 'copy'; }, 1500);
      });
    });
    card.appendChild(copyButton);
    const tag = document.createElement('div');
    tag.className = 'preview-tag mono';
    tag.textContent = exportTab === 'svg' ? `${liveUsername}.svg` : 'README.md';
    card.appendChild(tag);
  }
  preview.appendChild(card);
}

function updateYearRange(cells: Cell[]) {
  const el = document.getElementById('hero-year-range');
  if (!el || cells.length < 8) return;
  // cells[0] may be late December of the previous year; cells[7] is always in the target year
  el.textContent = cells[7].date.slice(0, 4);
}

function updateHeroStats(summary: CellSummary) {
  const bar = document.querySelector('.bar-tag');
  if (bar) bar.innerHTML = `<span class="mono" style="color:var(--contrib-peak)">${summary.count.toLocaleString()}</span> contributions`;
  const stats = document.querySelector('.legend-stats');
  if (stats) stats.innerHTML = `<span><b class="mono">${summary.streak}</b> day streak</span><span class="sep">·</span><span><b class="mono">${summary.longest}</b> longest</span>`;
}

function setHeroError(message: string | null) {
  const errorEl = document.getElementById('hero-error');
  if (!errorEl) return;
  if (message) { errorEl.textContent = `↳ ${message}`; errorEl.hidden = false; }
  else { errorEl.textContent = ''; errorEl.hidden = true; }
}

async function renderFromGitHub(username: string) {
  const renderButton = document.getElementById('hero-render-btn') as HTMLButtonElement | null;
  const renderLabel = document.getElementById('hero-render-label');
  const gridContainer = document.getElementById('hero-grid-container');
  const usernameDisplay = document.getElementById('hero-username-display');
  const yearSelect = document.getElementById('hero-year') as HTMLSelectElement | null;
  if (!renderButton || !gridContainer) return;

  const selectedYear = Number(yearSelect?.value ?? 0);
  const yearQuery = selectedYear && selectedYear <= new Date().getFullYear() ? `&year=${selectedYear}` : '';

  setHeroError(null);
  renderButton.disabled = true;
  if (renderLabel) renderLabel.textContent = 'loading…';

  try {
    const response = await fetch(`/api/contributions?user=${encodeURIComponent(username)}${yearQuery}`);
    const data = await response.json();

    if (!response.ok) {
      setHeroError(ERRORS[response.status] ?? data.error ?? 'something went wrong');
      liveCells = buildGridFromApi([], selectedYear || new Date().getFullYear());
      renderCustomize();
      updateHeroStats({ count: 0, streak: 0, longest: 0 });
    } else {
      const year = parseInt(data.cells[0]?.date ?? String(new Date().getFullYear()), 10);
      liveCells = buildGridFromApi(data.cells, year);
      liveUsername = username;
      renderCustomize();
      if (usernameDisplay) usernameDisplay.textContent = username;
      const stats = summarize(
        data.cells.map((cell: ContributionDay) => ({
          date: cell.date,
          level: cell.level,
          count: cell.count ?? null,
        })),
      );
      if (data.total != null) stats.count = data.total;
      updateHeroStats(stats);
      updateYearRange(liveCells);
      renderExportPreview();
      const howWidget = document.getElementById('how-widget-username');
      if (howWidget) howWidget.textContent = username;
    }
  } catch {
    setHeroError('could not reach the server, try again');
    liveCells = buildGridFromApi([], selectedYear || new Date().getFullYear());
    renderCustomize();
    updateHeroStats({ count: 0, streak: 0, longest: 0 });
  }

  renderButton.disabled = false;
  if (renderLabel) renderLabel.textContent = 'render';
}

function initPaletteList() {
  const allPaletteButtons = document.querySelectorAll<HTMLElement>('#palette-list .palette-row');
  allPaletteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      allPaletteButtons.forEach((other) => { other.classList.remove('active'); other.setAttribute('aria-checked', 'false'); });
      button.classList.add('active');
      button.setAttribute('aria-checked', 'true');
      renderCustomize();
    });
  });
}

function initShapeList() {
  const allShapeButtons = document.querySelectorAll<HTMLElement>('#shape-list .shape-btn');
  allShapeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      allShapeButtons.forEach((other) => { other.classList.remove('active'); other.setAttribute('aria-checked', 'false'); });
      button.classList.add('active');
      button.setAttribute('aria-checked', 'true');
      renderCustomize();
    });
  });
}

function initExportTabs() {
  const allTabs = document.querySelectorAll<HTMLElement>('#export-tabs [data-key]');
  allTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      allTabs.forEach((other) => { other.classList.remove('active'); other.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      renderExportPreview();
    });
  });
}

function initUsernameStrip() {
  const input = document.getElementById('hero-username') as HTMLInputElement | null;
  const renderButton = document.getElementById('hero-render-btn') as HTMLButtonElement | null;
  const usernameDisplay = document.getElementById('hero-username-display');
  if (!input || !renderButton || !usernameDisplay) return;

  input.addEventListener('input', () => {
    usernameDisplay.textContent = input.value.trim() || 'torvalds';
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') renderFromGitHub(input.value.trim() || 'torvalds');
  });
  renderButton.addEventListener('click', () => {
    renderFromGitHub(input.value.trim() || 'torvalds');
  });
  document.querySelectorAll<HTMLElement>('.sug-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const username = button.dataset.username;
      if (!username) return;
      input.value = username;
      usernameDisplay.textContent = username;
      renderFromGitHub(username);
    });
  });
}

function initCellTooltip() {
  const maybeTooltip = document.getElementById('cell-tip');
  if (!maybeTooltip || typeof maybeTooltip.showPopover !== 'function') return;
  const tooltip = maybeTooltip;

  let activeCell: Element | null = null;

  function positionTooltip() {
    if (!activeCell) return;
    const cellRect = activeCell.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = cellRect.left + cellRect.width / 2 - tooltipRect.width / 2;
    let top = cellRect.top - tooltipRect.height - 8;
    left = Math.max(8, Math.min(left, window.innerWidth - tooltipRect.width - 8));
    if (top < 8) top = cellRect.bottom + 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showTooltip(element: Element) {
    activeCell = element;
    tooltip.textContent = formatContribLabel(
      element.getAttribute('data-date') || '',
      parseInt(element.getAttribute('data-count') || '0', 10),
    );
    if (!tooltip.matches(':popover-open')) tooltip.showPopover();
    positionTooltip();
  }

  function hideTooltip() {
    activeCell = null;
    if (tooltip.matches(':popover-open')) tooltip.hidePopover();
  }

  document.addEventListener('mouseover', (event) => {
    const cell = event.target instanceof Element ? event.target.closest('[data-date][data-count]') : null;
    if (cell) showTooltip(cell);
    else if (activeCell) hideTooltip();
  });
  document.addEventListener('mouseleave', hideTooltip);
  window.addEventListener('scroll', positionTooltip, { passive: true });
  window.addEventListener('resize', positionTooltip);
}

export function initPage() {
  renderCustomize();
  renderExportPreview();
  initPaletteList();
  initShapeList();
  initExportTabs();
  initUsernameStrip();
  updateYearRange(CELLS);
  initCellTooltip();
}
