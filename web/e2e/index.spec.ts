import { expect, test } from "@playwright/test";
import { ClassName, ElementId, Selector } from "../src/ui/utils/dom-contract";

const ANY_NON_EMPTY_TITLE = /.+/;
const RESOLVED_THEME_CLASS = /theme-(light|dark)/;
const ACTIVE_ROW_CLASS = new RegExp(ClassName.Active);

const byId = (id: string) => `#${id}`;

test.describe("homepage", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("returns 200", async ({ page }) => {
		const response = await page.goto("/");
		expect(response?.status()).toBe(200);
	});

	test("has a non-empty title", async ({ page }) => {
		await expect(page).toHaveTitle(ANY_NON_EMPTY_TITLE);
	});

	test("renders main#main-content", async ({ page }) => {
		await expect(page.locator("main#main-content")).toBeVisible();
	});

	test("renders the hero with the username input", async ({ page }) => {
		await expect(page.locator("section.hero")).toBeVisible();
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
		await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main-content");
		await expect(page.locator("main#main-content")).toBeVisible();
		await expect(page.locator("footer.footer")).toBeVisible();
	});

	test("renders the footer store/link icons (svgs)", async ({ page }) => {
		await expect(page.locator('footer a[href*="github.com/fbuireu/contribkit"] svg')).toBeVisible();
		await expect(page.locator("footer button svg").first()).toBeVisible();
	});

	test("renders every home section", async ({ page }) => {
		await expect(page.locator("#how")).toBeVisible();
		await expect(page.locator("#custom")).toBeVisible();
		await expect(page.locator("#export")).toBeVisible();
		await expect(page.locator("#widget")).toBeVisible();
	});

	test("switching the palette moves the active state", async ({ page }) => {
		const rows = page.locator(Selector.PaletteRows);
		await rows.nth(1).click();
		await expect(rows.nth(1)).toHaveClass(ACTIVE_ROW_CLASS);
		await expect(rows.nth(0)).not.toHaveClass(ACTIVE_ROW_CLASS);
	});

	test("switching the export tab to SVG shows the code preview", async ({ page }) => {
		await page.locator(`${byId(ElementId.ExportTabs)} [data-key="svg"]`).click();
		await expect(page.locator(Selector.ExportCodePreview)).toBeVisible();
		await expect(page.locator(Selector.ExportCopyButton)).toBeVisible();
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

test.describe("rendering a username", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("an invalid handle is refused, and nobody else's calendar is shown", async ({ page }) => {
		await page.route("**/api/contributions**", (route) =>
			route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "bad" }) }),
		);

		await page.locator(byId(ElementId.HeroUsername)).fill("not-a-real-user");
		await page.locator(byId(ElementId.HeroRenderButton)).click();

		await expect(page.locator(byId(ElementId.HeroError))).toContainText("invalid username");
	});

	test("an unreachable server says so rather than leaving stale numbers", async ({ page }) => {
		await page.route("**/api/contributions**", (route) => route.abort());

		await page.locator(byId(ElementId.HeroUsername)).fill("torvalds");
		await page.locator(byId(ElementId.HeroRenderButton)).click();

		await expect(page.locator(byId(ElementId.HeroError))).toContainText("could not reach the server");
	});

	test("re-enables the render button whether the fetch worked or not", async ({ page }) => {
		await page.route("**/api/contributions**", (route) => route.abort());
		const button = page.locator(byId(ElementId.HeroRenderButton));

		await page.locator(byId(ElementId.HeroUsername)).fill("torvalds");
		await button.click();

		await expect(button).toBeEnabled();
	});

	test("a successful render fills the grid and names the user", async ({ page }) => {
		await page.route("**/api/contributions**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					username: "octocat",
					days: [{ date: "2026-06-01", level: 3, count: 7 }],
					total: 7,
				}),
			}),
		);

		await page.locator(byId(ElementId.HeroUsername)).fill("octocat");
		await page.locator(byId(ElementId.HeroRenderButton)).click();

		await expect(page.locator(byId(ElementId.HeroUsernameDisplay))).toHaveText("octocat");
		await expect(page.locator(`${byId(ElementId.HeroGrid)} svg`)).toBeVisible();
		await expect(page.locator(byId(ElementId.HeroError))).toBeEmpty();
	});
});
