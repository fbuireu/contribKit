import { ElementId, ThemeClass } from "../../../utils/dom-contract";
import { recordUsageEvent, ThemeChoice, UsageEventName } from "../telemetry/usage-event";

export const COLOR_SCHEME_KEY = "color-scheme";
export const COLOR_SCHEME_META_SELECTOR = `meta[name="${COLOR_SCHEME_KEY}"]`;

export function initThemeToggle(): void {
	const button = document.getElementById(ElementId.ThemeToggle);
	if (!button) return;
	const meta = document.querySelector<HTMLMetaElement>(COLOR_SCHEME_META_SELECTOR);
	const darkModeMediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

	function pinned(): ThemeChoice | null {
		const storedScheme = localStorage.getItem(COLOR_SCHEME_KEY);
		return storedScheme === ThemeChoice.Light || storedScheme === ThemeChoice.Dark ? storedScheme : null;
	}
	function effective(): ThemeChoice {
		return pinned() ?? (darkModeMediaQuery.matches ? ThemeChoice.Dark : ThemeChoice.Light);
	}
	function apply(): void {
		const pinnedScheme = pinned();
		document.documentElement.classList.toggle(ThemeClass.Light, pinnedScheme === ThemeChoice.Light);
		document.documentElement.classList.toggle(ThemeClass.Dark, pinnedScheme === ThemeChoice.Dark);
		if (meta) meta.content = pinnedScheme ?? "light dark";
		const isDark = effective() === ThemeChoice.Dark;
		(button as HTMLElement).dataset.effective = effective();
		(button as HTMLElement).setAttribute("aria-pressed", String(isDark));
		(button as HTMLElement).setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
	}

	apply();

	button.addEventListener("click", () => {
		const pinnedScheme = pinned();
		if (pinnedScheme) {
			localStorage.removeItem(COLOR_SCHEME_KEY);
		} else {
			localStorage.setItem(COLOR_SCHEME_KEY, darkModeMediaQuery.matches ? ThemeChoice.Light : ThemeChoice.Dark);
		}
		apply();
		recordUsageEvent({ event: UsageEventName.ThemeChanged, properties: { theme: pinned() ?? ThemeChoice.System } });
	});

	darkModeMediaQuery.addEventListener("change", () => {
		if (!pinned()) apply();
	});
}
