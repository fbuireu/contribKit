import type { Page } from "@playwright/test";
import { ExportFormatKey } from "../src/ui/components/export/export-formats";
import { ClassName, ElementId, Selector, ThemeClass } from "../src/ui/utils/dom-contract";
import { expect, test } from "./fixtures";

const RESOLVED_THEME_CLASS = new RegExp(`${ThemeClass.Light}|${ThemeClass.Dark}`);
const ACTIVE_ROW_CLASS = new RegExp(ClassName.Active);
const HEX_BACKGROUND = /^background:#[0-9a-f]{6}$/i;

const byId = (id: ElementId): string => `#${id}`;

test.describe("homepage", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("renders the hero with the username input", async ({ page }) => {
		await expect(page.locator(`section.${ClassName.Hero}`)).toBeVisible();
		await expect(page.locator(byId(ElementId.HeroUsername))).toBeVisible();
	});

	test("renders the contribution grid", async ({ page }) => {
		await expect(page.locator(`${byId(ElementId.HeroGrid)} svg`)).toBeVisible();
	});

	test("shows the cookie consent banner when no consent cookie is set", async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => false });
		});
		await page.goto("/");
		await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible({ timeout: 15000 });
	});

	test("renders indexable SEO meta tags with a large-image card", async ({ page }) => {
		await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "ContribKit");
		await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
		expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBe(await page.title());
	});

	test("BaseLayout renders the page shell (lang, skip link, main, footer)", async ({ page }) => {
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator(`a.${ClassName.SkipLink}`)).toHaveAttribute("href", byId(ElementId.MainContent));
		await expect(page.locator(`main${byId(ElementId.MainContent)}`)).toBeVisible();
		await expect(page.locator(`footer.${ClassName.Footer}`)).toBeVisible();
	});

	test("renders the footer store/link icons (svgs)", async ({ page }) => {
		await expect(page.locator('footer a[href*="github.com/fbuireu/contribkit"] svg')).toBeVisible();
		await expect(page.locator("footer button svg").first()).toBeVisible();
	});

	test("renders every home section", async ({ page }) => {
		await expect(page.locator(byId(ElementId.HowItWorksSection))).toBeVisible();
		await expect(page.locator(byId(ElementId.CustomizerSection))).toBeVisible();
		await expect(page.locator(byId(ElementId.ExportSection))).toBeVisible();
		await expect(page.locator(byId(ElementId.HomeScreenWidgetSection))).toBeVisible();
	});

	test("switching the palette moves the active state", async ({ page }) => {
		const rows = page.locator(Selector.PaletteRows);
		await rows.nth(1).click();
		await expect(rows.nth(1)).toHaveClass(ACTIVE_ROW_CLASS);
		await expect(rows.nth(0)).not.toHaveClass(ACTIVE_ROW_CLASS);
	});

	test("every palette swatch is painted with a hex colour", async ({ page }) => {
		const swatches = page.locator(`${Selector.PaletteRows} span[style]`);
		const styles = await swatches.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("style") ?? ""));
		expect(styles.length).toBeGreaterThan(0);
		for (const style of styles) expect(style).toMatch(HEX_BACKGROUND);
	});

	test("switching the export tab to SVG shows the code preview", async ({ page }) => {
		await page.locator(`${byId(ElementId.ExportTabs)} [data-key="${ExportFormatKey.Svg}"]`).click();
		await expect(page.locator(Selector.ExportCodePreview)).toBeVisible();
		await expect(page.locator(Selector.ExportCopyButton)).toBeVisible();
	});

	test("the PNG tab says the size of the calendar it previews", async ({ page }) => {
		const [, width, height] =
			/^0 0 (\d+) (\d+)$/.exec(
				(await page.locator(`${Selector.ExportPngPreview} svg`).getAttribute("viewBox")) ?? "",
			) ?? [];

		expect(width).toBeDefined();
		await expect(
			page.locator(`${byId(ElementId.ExportTabs)} [data-key="${ExportFormatKey.Png}"] ${Selector.ExportTabDetail}`),
		).toHaveText(`${width}×${height} · transparent`);
	});

	test("the SVG tab previews the start of the markup it copies, and counts the Cells it leaves out", async ({
		page,
	}) => {
		const png = page.locator(Selector.ExportPngPreview);
		const viewBox = await png.locator("svg").getAttribute("viewBox");
		const cells = await png.locator("[data-date]").count();

		await page.locator(`${byId(ElementId.ExportTabs)} [data-key="${ExportFormatKey.Svg}"]`).click();

		const code = page.locator(Selector.ExportCodePreview);
		await expect(code).toContainText(`viewBox="${viewBox}"`);
		await expect(code).toContainText(`${cells - 3} more cells`);
	});

	test("clicking a suggestion fills the username input", async ({ page }) => {
		await page.locator(`.${ClassName.SuggestionButton}[data-username="gaearon"]`).click();
		await expect(page.locator(byId(ElementId.HeroUsername))).toHaveValue("gaearon");
	});

	test("the header theme toggle pins a theme", async ({ page }) => {
		await page.locator(byId(ElementId.ThemeToggle)).click();
		await expect(page.locator("html")).toHaveClass(RESOLVED_THEME_CLASS);
	});

	test("carries the security headers the middleware sets on every response", async ({ page }) => {
		const response = await page.goto("/");
		const headers = response?.headers() ?? {};

		expect(headers["x-frame-options"]).toBe("DENY");
		expect(headers["x-content-type-options"]).toBe("nosniff");
		expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
		expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
		expect(headers["content-security-policy"]).toContain("default-src");
	});

	test("carries them on static assets too, which the middleware never sees", async ({ request }) => {
		for (const path of ["/og.png", "/robots.txt", "/favicon.png"]) {
			const response = await request.get(path);
			const headers = response.headers();

			expect(response.status(), path).toBe(200);
			expect(headers["x-content-type-options"], path).toBe("nosniff");
			expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
			expect(headers["x-frame-options"], path).toBe("DENY");
		}
	});
});

test.describe("a server-rendered error state", () => {
	test("prints every figure as unknown, never as 0", async ({ page }) => {
		const response = await page.goto("/?user=foo_bar");

		expect(response?.status()).toBe(200);
		await expect(page.locator(byId(ElementId.HeroError))).toContainText("invalid username");
		await expect(page.locator(Selector.BarTag)).toHaveText("unknown contributions");
		await expect(page.locator(Selector.LegendStats)).toHaveText("unknown day streak·unknown longest");
	});
});

test.describe("rendering a username", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("an invalid handle is refused, and nobody else's calendar is shown", async ({ page }) => {
		await page.route("**/api/contributions**", (route) =>
			route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "bad" }) }),
		);

		await expect(page.locator(`${byId(ElementId.HeroGrid)} [data-count]`).first()).toBeAttached();

		await page.locator(byId(ElementId.HeroUsername)).fill("not-a-real-user");
		await page.locator(byId(ElementId.HeroRenderButton)).click();

		await expect(page.locator(byId(ElementId.HeroError))).toContainText("invalid username");
		await expect(page.locator(`${byId(ElementId.HeroGrid)} [data-count]`)).toHaveCount(0);
	});

	test("an unreachable server says so rather than leaving stale numbers", async ({ page }) => {
		await page.route("**/api/contributions**", (route) => route.abort());

		await page.locator(byId(ElementId.HeroUsername)).fill("torvalds");
		await page.locator(byId(ElementId.HeroRenderButton)).click();

		await expect(page.locator(byId(ElementId.HeroError))).toContainText("could not reach the server");
		await expect(page.locator(Selector.BarTag)).toContainText("unknown");
		await expect(page.locator(`${byId(ElementId.HeroGrid)} [data-count]`)).toHaveCount(0);
	});

	test("re-enables the render button after a request that failed", async ({ page }) => {
		await page.route("**/api/contributions**", (route) => route.abort());
		const button = page.locator(byId(ElementId.HeroRenderButton));

		await page.locator(byId(ElementId.HeroUsername)).fill("torvalds");
		await button.click();

		await expect(button).toBeEnabled();
	});

	test("a successful render fills the grid and names the user", async ({ page }) => {
		const date = `${new Date().getFullYear()}-06-01`;
		await page.route("**/api/contributions**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					username: "octocat",
					days: [{ date, level: 3, count: 7 }],
					total: 7,
				}),
			}),
		);
		const button = page.locator(byId(ElementId.HeroRenderButton));

		await page.locator(byId(ElementId.HeroUsername)).fill("octocat");
		await button.click();

		await expect(page.locator(byId(ElementId.HeroUsernameDisplay))).toHaveText("octocat");
		await expect(page.locator(`${byId(ElementId.HeroGrid)} [data-date="${date}"][data-count="7"]`)).toBeAttached();
		await expect(page.locator(`${byId(ElementId.HeroGrid)} [data-count]`)).toHaveCount(1);
		await expect(page.locator(byId(ElementId.HeroError))).toBeEmpty();
		await expect(button).toBeEnabled();
	});
});

test.describe("the DOM contract", () => {
	type SelectorName = keyof typeof Selector;

	const CODE_TAB_ONLY: readonly SelectorName[] = ["ExportCodePreview", "ExportCopyButton"];
	const PNG_TAB_ONLY: readonly SelectorName[] = ["ExportPngPreview"];

	interface UnmatchedParams {
		page: Page;
		names: readonly SelectorName[];
	}

	const unmatched = async ({ page, names }: UnmatchedParams): Promise<string[]> => {
		const missing: string[] = [];
		for (const name of names) {
			const selector = Selector[name];
			if ((await page.locator(selector).count()) === 0) missing.push(`${name} -> ${selector}`);
		}
		return missing;
	};

	test("every Selector matches something in the state that owns it", async ({ page }) => {
		await page.goto("/");

		const all = Object.keys(Selector) as SelectorName[];
		const onLoad = all.filter((name) => !CODE_TAB_ONLY.includes(name));

		expect(
			await unmatched({ page, names: onLoad }),
			"a Selector matching nothing is a renderer that has silently become a no-op",
		).toEqual([]);

		await page.locator(`${byId(ElementId.ExportTabs)} [data-key="${ExportFormatKey.Svg}"]`).click();
		await expect(page.locator(Selector.ExportCodePreview)).toBeVisible();

		expect(await unmatched({ page, names: CODE_TAB_ONLY })).toEqual([]);
		expect(
			await unmatched({ page, names: PNG_TAB_ONLY }),
			"the PNG preview belongs to the PNG tab and must go when it is not selected",
		).toEqual(PNG_TAB_ONLY.map((name) => `${name} -> ${Selector[name]}`));
	});
});
