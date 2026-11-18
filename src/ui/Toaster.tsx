import { useStore } from "@tanstack/react-store";
import { Toaster as Sonner } from "sonner";
import { shownMode } from "#/lib/prefs";

/** One Toaster at the root, outside any transformed ancestor (ask-sonner). */
export function Toaster() {
	const theme = useStore(shownMode, (s) => s);
	return (
		<Sonner
			theme={theme}
			position="top-center"
			mobileOffset={{ top: "calc(var(--safe-top) + 8px)" }}
			offset={{ top: "calc(var(--safe-top) + 12px)" }}
			duration={4000}
			style={
				{
					"--normal-bg": "var(--glass-thick)",
					"--normal-text": "var(--ink)",
					"--normal-border": "var(--glass-line)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "glass glass-thick !rounded-[var(--radius-row)] !font-sans",
					description: "!text-muted",
					actionButton: "btn-stamp !rounded-full !font-semibold !px-3",
				},
			}}
		/>
	);
}
