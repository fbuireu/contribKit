import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const resolvePath = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const MIN_THRESHOLD = 85;

const summaryLabel = {
	onTestRunEnd() {
		if (!process.env.GITHUB_STEP_SUMMARY) return;
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\n## Vitest run: unit + docs contract (web)\n");
	},
};

export default defineConfig({
	resolve: {
		alias: {
			"@shared": resolvePath("../shared"),
			"@domain": resolvePath("./src/domain"),
			"@application": resolvePath("./src/application"),
			"@infrastructure": resolvePath("./src/infrastructure"),
			"@ui": resolvePath("./src/ui"),
		},
	},
	test: {
		reporters: process.env.GITHUB_ACTIONS ? ["default", summaryLabel, "github-actions"] : ["default"],
		include: [...configDefaults.include, "../docs/**/*.test.ts"],
		exclude: [...configDefaults.exclude, "e2e/**"],
		coverage: {
			provider: "istanbul",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/env.d.ts", "**/types.ts", "**/*.astro"],
			thresholds: {
				lines: MIN_THRESHOLD,
				functions: MIN_THRESHOLD,
				branches: MIN_THRESHOLD,
				statements: MIN_THRESHOLD,
			},
		},
	},
});
