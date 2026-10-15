import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { GithubActionsReporter, type Reporter, type TestModule } from "vitest/node";

const resolvePath = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

const MIN_THRESHOLD = 85;

const jobSummary = (titleOf: (testModules: readonly TestModule[]) => string): Reporter => {
	const github = new GithubActionsReporter();

	return {
		onInit: (vitest) => github.onInit(vitest),
		onTestCaseAnnotate: (testCase, annotation) => github.onTestCaseAnnotate(testCase, annotation),
		onTestRunEnd: (testModules, unhandledErrors) => {
			if (testModules.length === 0 && unhandledErrors.length === 0) return;
			github.options.jobSummary.title = titleOf(testModules);
			github.onTestRunEnd(testModules, unhandledErrors);
		},
	};
};

const DOCS_CONTRACT = "docs/docs-consistency.test.ts";

const suitesRun = (testModules: readonly TestModule[]): string => {
	const suites = new Set<string>(
		testModules.map((module) => (module.moduleId.endsWith(DOCS_CONTRACT) ? "docs contract" : "unit")),
	);

	return `Vitest run: ${["unit", "docs contract"].filter((suite) => suites.has(suite)).join(" + ")} (web)`;
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
		reporters: process.env.GITHUB_ACTIONS ? ["default", jobSummary(suitesRun)] : ["default"],
		include: [...configDefaults.include, "../docs/**/*.test.ts"],
		exclude: [...configDefaults.exclude, "e2e/**/*.spec.ts"],
		testTimeout: 20_000,
		coverage: {
			provider: "istanbul",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts", "src/**/*.tsx"],
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
