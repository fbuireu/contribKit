import { defineConfig, devices } from "@playwright/test";

const LOCAL_URL = "http://localhost:8787";
const BASE_URL = process.env.BASE_URL ?? LOCAL_URL;

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? "50%" : undefined,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
	use: {
		baseURL: BASE_URL,
		trace: "on-first-retry",
	},
	webServer: process.env.BASE_URL
		? undefined
		: { command: "pnpm wrangler:dev", url: LOCAL_URL, reuseExistingServer: true, timeout: 180_000 },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
