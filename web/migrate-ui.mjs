import { existsSync, globSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const moves = {
	"src/ui/components/TopNav.astro": "src/ui/core/header/Header.astro",
	"src/ui/components/top-nav.css": "src/ui/core/header/header.css",
	"src/ui/lib/theme-toggle.ts": "src/ui/core/header/theme-toggle.ts",
	"src/ui/components/Footer.astro": "src/ui/core/footer/Footer.astro",
	"src/ui/components/footer.css": "src/ui/core/footer/footer.css",
	"src/ui/components/layouts/BaseLayout.astro": "src/ui/core/layouts/BaseLayout.astro",
	"src/ui/components/core/seo/SEO.astro": "src/ui/core/seo/SEO.astro",
	"src/ui/components/core/seo/types.ts": "src/ui/core/seo/types.ts",
	"src/ui/components/Analytics.astro": "src/ui/core/analytics/Analytics.astro",
	"src/ui/lib/analytics.ts": "src/ui/core/analytics/analytics.ts",
	"src/ui/components/cookieConsent/CookieConsent.astro": "src/ui/core/cookie-consent/CookieConsent.astro",
	"src/ui/components/cookieConsent/config.ts": "src/ui/core/cookie-consent/config.ts",
	"src/ui/components/cookieConsent/config.test.ts": "src/ui/core/cookie-consent/config.test.ts",
	"src/ui/components/Hero.astro": "src/ui/components/hero/Hero.astro",
	"src/ui/components/hero.css": "src/ui/components/hero/hero.css",
	"src/ui/components/Customize.astro": "src/ui/components/customize/Customize.astro",
	"src/ui/components/customize.css": "src/ui/components/customize/customize.css",
	"src/ui/components/Export.astro": "src/ui/components/export/Export.astro",
	"src/ui/components/export.css": "src/ui/components/export/export.css",
	"src/ui/lib/code-preview.ts": "src/ui/components/export/code-preview.ts",
	"src/ui/components/HowItWorks.astro": "src/ui/components/how-it-works/HowItWorks.astro",
	"src/ui/components/how-it-works.css": "src/ui/components/how-it-works/how-it-works.css",
	"src/ui/components/Widget.astro": "src/ui/components/widget/Widget.astro",
	"src/ui/components/widget.css": "src/ui/components/widget/widget.css",
	"src/ui/components/CellTip.astro": "src/ui/components/grid/CellTip.astro",
	"src/ui/components/cell-tip.css": "src/ui/components/grid/cell-tip.css",
	"src/ui/lib/calendar-utils.ts": "src/ui/components/grid/calendar-utils.ts",
	"src/ui/lib/render-svg.ts": "src/ui/components/grid/render-svg.ts",
	"src/ui/lib/mini-grid.ts": "src/ui/components/grid/mini-grid.ts",
	"src/ui/lib/contribution.ts": "src/ui/components/grid/contribution.ts",
	"src/ui/lib/load-initial-contributions.ts": "src/ui/components/grid/load-initial-contributions.ts",
	"src/ui/components/legal.css": "src/ui/components/legal/legal.css",
};

for (const [from, to] of Object.entries(moves)) {
	mkdirSync(dirname(to), { recursive: true });
	renameSync(from, to);
}

const aliasRemap = [
	["@ui/components/CellTip.astro", "@ui/components/grid/CellTip.astro"],
	["@ui/components/core/seo/types", "@ui/core/seo/types"],
	["@ui/components/Customize.astro", "@ui/components/customize/Customize.astro"],
	["@ui/components/Export.astro", "@ui/components/export/Export.astro"],
	["@ui/components/Hero.astro", "@ui/components/hero/Hero.astro"],
	["@ui/components/HowItWorks.astro", "@ui/components/how-it-works/HowItWorks.astro"],
	["@ui/components/layouts/BaseLayout.astro", "@ui/core/layouts/BaseLayout.astro"],
	["@ui/components/legal.css", "@ui/components/legal/legal.css"],
	["@ui/components/Widget.astro", "@ui/components/widget/Widget.astro"],
	["@ui/lib/analytics", "@ui/core/analytics/analytics"],
	["@ui/lib/calendar-utils", "@ui/components/grid/calendar-utils"],
	["@ui/lib/load-initial-contributions", "@ui/components/grid/load-initial-contributions"],
	["@ui/lib/render-svg", "@ui/components/grid/render-svg"],
];

const perFile = {
	"src/ui/core/header/Header.astro": [
		["../lib/theme-toggle", "./theme-toggle"],
		['class="topnav"', 'class="header"'],
	],
	"src/ui/core/header/header.css": [["@scope (.topnav)", "@scope (.header)"]],
	"src/ui/core/layouts/BaseLayout.astro": [
		['import Analytics from "../Analytics.astro"', 'import Analytics from "../analytics/Analytics.astro"'],
		['from "../cookieConsent/CookieConsent.astro"', 'from "../cookie-consent/CookieConsent.astro"'],
		['from "../core/seo/SEO.astro"', 'from "../seo/SEO.astro"'],
		['from "../core/seo/types"', 'from "../seo/types"'],
		['import Footer from "../Footer.astro"', 'import Footer from "../footer/Footer.astro"'],
		['import TopNav from "../TopNav.astro"', 'import Header from "../header/Header.astro"'],
		["<TopNav />", "<Header />"],
	],
	"src/ui/components/grid/calendar-utils.ts": [
		["../../domain/entities/types", "@domain/entities/types"],
		["../../domain/value-objects/calendar-labels", "@domain/value-objects/calendar-labels"],
		["./mulberry", "@ui/lib/mulberry"],
	],
	"src/ui/components/grid/mini-grid.ts": [["./mulberry", "@ui/lib/mulberry"]],
	"src/ui/components/grid/load-initial-contributions.ts": [["./failure-http", "@ui/lib/failure-http"]],
	"src/ui/lib/page-init.ts": [
		["./calendar-utils", "@ui/components/grid/calendar-utils"],
		["./code-preview", "@ui/components/export/code-preview"],
		["./contribution-errors", "@ui/lib/contribution-errors"],
		["./contribution", "@ui/components/grid/contribution"],
		["./mini-grid", "@ui/components/grid/mini-grid"],
		["./render-svg", "@ui/components/grid/render-svg"],
	],
};

for (const file of globSync("src/**/*.{ts,astro}")) {
	let content = readFileSync(file, "utf8");
	const original = content;
	for (const [from, to] of aliasRemap) content = content.split(from).join(to);
	for (const [from, to] of perFile[file] ?? []) content = content.split(from).join(to);
	if (content !== original) writeFileSync(file, content);
}

for (const dir of ["src/ui/components/cookieConsent", "src/ui/components/core/seo", "src/ui/components/core", "src/ui/components/layouts"]) {
	if (existsSync(dir) && globSync(`${dir}/**/*`).length === 0) rmdirSync(dir, { recursive: true });
}

console.log("migration done");
