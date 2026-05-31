import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "istanbul",
			reporter: ["lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/env.d.ts", "src/pages/**"],
		},
	},
});
