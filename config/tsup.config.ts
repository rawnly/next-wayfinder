import pkg from "../package.json";
import { defineConfig } from "tsup";

export default defineConfig({
	name: pkg.name,
	sourcemap: false,
	minify: true,
	dts: true,
	clean: true,
	replaceNodeEnv: true,
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
