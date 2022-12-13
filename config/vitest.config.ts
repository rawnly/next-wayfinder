import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		setupFiles: 'setupTests.ts',
		coverage: {
			clean: true,
			reporter: ["text", "html"],
		},
	},
});
