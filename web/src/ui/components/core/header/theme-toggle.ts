import { ElementId } from "@ui/utils/dom-contract";

export const COLOR_SCHEME_KEY = "color-scheme";
export const COLOR_SCHEME_META_SELECTOR = `meta[name="${COLOR_SCHEME_KEY}"]`;

export const ThemeClass = {
	Light: "theme-light",
	Dark: "theme-dark",
} as const;

export function initThemeToggle(): void {
	const button = document.getElementById(ElementId.ThemeToggle);
	if (!button) return;
	const meta = document.querySelector<HTMLMetaElement>(COLOR_SCHEME_META_SELECTOR);
	const darkModeMediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

	function pinned(): string | null {
		const storedScheme = localStorage.getItem(COLOR_SCHEME_KEY);
		return storedScheme === "light" || storedScheme === "dark" ? storedScheme : null;
	}
	function effective(): string {
		return pinned() ?? (darkModeMediaQuery.matches ? "dark" : "light");
	}
	function apply(): void {
		const pinnedScheme = pinned();
		document.documentElement.classList.toggle(ThemeClass.Light, pinnedScheme === "light");
		document.documentElement.classList.toggle(ThemeClass.Dark, pinnedScheme === "dark");
		if (meta) meta.content = pinnedScheme ?? "light dark";
		const isDark = effective() === "dark";
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
			localStorage.setItem(COLOR_SCHEME_KEY, darkModeMediaQuery.matches ? "light" : "dark");
		}
		apply();
	});

	darkModeMediaQuery.addEventListener("change", () => {
		if (!pinned()) apply();
	});
}
