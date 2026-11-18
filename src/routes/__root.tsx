import type { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { applyPrefs, prefsStore, THEME_BOOT_SCRIPT } from "#/lib/prefs";
import { queryPersister } from "#/lib/query";
import { startSync } from "#/lib/sync";
import { Toaster } from "#/ui/Toaster";
import appCss from "../styles.css?url";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content",
			},
			{ title: "Oryn" },
			{ name: "description", content: "Your money, laid out clearly." },
			{
				name: "theme-color",
				content: "#f5f6fb",
				media: "(prefers-color-scheme: light)",
			},
			{
				name: "theme-color",
				content: "#1c2233",
				media: "(prefers-color-scheme: dark)",
			},
			{ name: "apple-mobile-web-app-capable", content: "yes" },
			{ name: "mobile-web-app-capable", content: "yes" },
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{ name: "apple-mobile-web-app-title", content: "Oryn" },
			{ name: "format-detection", content: "telephone=no" },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/manifest.webmanifest" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{
				rel: "icon",
				href: "/favicon-32.png",
				type: "image/png",
				sizes: "32x32",
			},
			{
				rel: "icon",
				href: "/favicon-64.png",
				type: "image/png",
				sizes: "64x64",
			},
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
		],
		scripts: [{ children: THEME_BOOT_SCRIPT }],
	}),
	shellComponent: RootDocument,
	component: RootComponent,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en-IN" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function RootComponent() {
	const { queryClient } = Route.useRouteContext();

	// Sync listens for sign-in on every page, including /sign-in itself.
	useEffect(() => {
		startSync();
	}, []);

	useEffect(() => {
		applyPrefs(prefsStore.state);
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () =>
			prefsStore.state.mode === "system" && applyPrefs(prefsStore.state);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	const content = (
		<>
			<Outlet />
			<Toaster />
		</>
	);

	if (!queryPersister) return content;
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{ persister: queryPersister }}
		>
			{content}
		</PersistQueryClientProvider>
	);
}
