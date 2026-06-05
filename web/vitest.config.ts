import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const resolvePath = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@shared": resolvePath("../shared"),
			"@domain": resolvePath("./src/domain"),
			"@application": resolvePath("./src/application"),
			"@infrastructure": resolvePath("./src/infrastructure"),
			"@ui": resolvePath("./src/ui"),
			"@assets": resolvePath("./src/assets"),
		},
	},
	test: {
		exclude: [...configDefaults.exclude, "e2e/**"],
		coverage: {
			provider: "istanbul",
			reporter: ["lcov"],
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.d.ts", "src/env.d.ts"],
		},
	},
});
