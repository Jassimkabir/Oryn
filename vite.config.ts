import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		devtools(),
		nitro(),
		tailwindcss(),
		// SPA-first: a prerendered shell, then everything runs on the phone.
		// Server functions stay available for the few things that need a server.
		tanstackStart({ spa: { enabled: true } }),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
	],
});
