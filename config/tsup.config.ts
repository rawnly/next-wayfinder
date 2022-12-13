import { defineConfig } from "tsup";

import pkg from "../package.json";

export default defineConfig({
	name: pkg.name,
	sourcemap: false,
	minify: true,
	dts: true,
	clean: true,
	replaceNodeEnv: false,
	format: ["esm", "cjs"],
	outDir: "build",
	tsconfig: "./tsconfig.build.json",
	loader: {
		".js": "jsx",
	},
	env: {
		/** your env here */
	},
});
