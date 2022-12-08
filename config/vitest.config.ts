import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		setupFiles: 'setupTests.js',
		coverage: {
			clean: true,
			reporter: ["text", "html"],
		},
	},
});
