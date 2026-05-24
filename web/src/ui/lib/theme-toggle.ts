export function initThemeToggle(): void {
	const button = document.getElementById("theme-toggle");
	if (!button) return;
	const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
	const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	function pinned(): string | null {
		const storedScheme = localStorage.getItem("color-scheme");
		return storedScheme === "light" || storedScheme === "dark" ? storedScheme : null;
	}
	function effective(): string {
		return pinned() ?? (darkModeMediaQuery.matches ? "dark" : "light");
	}
	function apply(): void {
		const pinnedScheme = pinned();
		document.documentElement.classList.toggle("theme-light", pinnedScheme === "light");
		document.documentElement.classList.toggle("theme-dark", pinnedScheme === "dark");
		if (meta) meta.content = pinnedScheme ?? "light dark";
		(button as HTMLElement).dataset.effective = effective();
	}

	apply();

	button.addEventListener("click", () => {
		const pinnedScheme = pinned();
		if (pinnedScheme) {
			localStorage.removeItem("color-scheme");
		} else {
			localStorage.setItem("color-scheme", darkModeMediaQuery.matches ? "light" : "dark");
		}
		apply();
	});

	darkModeMediaQuery.addEventListener("change", () => {
		if (!pinned()) apply();
	});
}
