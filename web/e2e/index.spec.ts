import { expect, test } from "@playwright/test";

const ANY_NON_EMPTY_TITLE = /.+/;
const RESOLVED_THEME_CLASS = /theme-(light|dark)/;
const ACTIVE_ROW_CLASS = /active/;

test.describe("homepage", () => {
	test("returns 200", async ({ page }) => {
		const response = await page.goto("/");
		expect(response?.status()).toBe(200);
	});

	test("has a non-empty title", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(ANY_NON_EMPTY_TITLE);
	});

	test("renders main#main-content", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("main#main-content")).toBeVisible();
	});

	test("renders the hero with the username input", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("section.hero")).toBeVisible();
		await expect(page.locator("#hero-username")).toBeVisible();
	});

	test("renders the contribution grid", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#hero-grid-container svg")).toBeVisible();
	});

	test("shows the cookie consent banner when no consent cookie is set", async ({ page }) => {
		await page.addInitScript(() => {
			Object.defineProperty(navigator, "webdriver", { get: () => false });
		});
		await page.goto("/");
		await expect(page.getByRole("button", { name: "Accept all" })).toBeVisible({ timeout: 15000 });
	});

	test("renders indexable SEO meta tags with a large-image card", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "ContribKit");
		await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
		await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
		expect(await page.locator('meta[property="og:title"]').getAttribute("content")).toBe(await page.title());
	});

	test("BaseLayout renders the page shell (lang, skip link, main, footer)", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("html")).toHaveAttribute("lang", "en");
		await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main-content");
		await expect(page.locator("main#main-content")).toBeVisible();
		await expect(page.locator("footer.footer")).toBeVisible();
	});

	test("renders the footer store/link icons (svgs)", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator('footer a[href*="github.com/fbuireu/contribkit"] svg')).toBeVisible();
		await expect(page.locator("footer button svg").first()).toBeVisible();
	});

	test("renders every home section", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("#how")).toBeVisible();
		await expect(page.locator("#custom")).toBeVisible();
		await expect(page.locator("#export")).toBeVisible();
		await expect(page.locator("#widget")).toBeVisible();
	});

	test("switching the palette moves the active state", async ({ page }) => {
		await page.goto("/");
		const rows = page.locator("#palette-list .palette-row");
		await rows.nth(1).click();
		await expect(rows.nth(1)).toHaveClass(ACTIVE_ROW_CLASS);
		await expect(rows.nth(0)).not.toHaveClass(ACTIVE_ROW_CLASS);
	});

	test("switching the export tab to SVG shows the code preview", async ({ page }) => {
		await page.goto("/");
		await page.locator('#export-tabs [data-key="svg"]').click();
		await expect(page.locator("#export-preview .code-preview")).toBeVisible();
		await expect(page.locator("#export-preview .copy-btn")).toBeVisible();
	});

	test("clicking a suggestion fills the username input", async ({ page }) => {
		await page.goto("/");
		await page.locator('.sug-btn[data-username="gaearon"]').click();
		await expect(page.locator("#hero-username")).toHaveValue("gaearon");
	});

	test("the header theme toggle pins a theme", async ({ page }) => {
		await page.goto("/");
		await page.locator(".theme-toggle").click();
		await expect(page.locator("html")).toHaveClass(RESOLVED_THEME_CLASS);
	});
});
