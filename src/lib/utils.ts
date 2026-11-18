import { type ClassValue, clsx } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/** Android only (iOS Safari has no Vibration API); fire on the same frame as the visual. */
export function haptic(kind: "tap" | "success" | "error" = "tap") {
	if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
	const pattern = { tap: 8, success: [12, 40, 18], error: [30, 50, 30] }[kind];
	try {
		navigator.vibrate(pattern);
	} catch {
		/* ignored */
	}
}

export function prefersReducedMotion() {
	if (typeof window === "undefined") return false;
	return (
		document.documentElement.dataset.reduceMotion === "true" ||
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}
