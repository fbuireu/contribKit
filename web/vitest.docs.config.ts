import { defineConfig } from "vitest/config";
import { summaryLabel } from "./vitest.config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["../docs/**/*.test.ts"],
		testTimeout: 60_000,
		reporters: process.env.GITHUB_ACTIONS
			? ["default", summaryLabel("Contract suite (docs/docs-consistency.test.ts)"), "github-actions"]
			: ["default"],
	},
});
