import { flushSync } from "react-dom";
import { prefersReducedMotion } from "./utils";

/**
 * Theme change is rare, so it earns a moment: a circular reveal from the control
 * that was tapped (View Transitions API). Reduced motion or no support → instant.
 */
export function withThemeReveal(
	update: () => void,
	origin?: HTMLElement | null,
) {
	const doc = document as Document & {
		startViewTransition?: (cb: () => void) => { ready: Promise<void> };
	};
	if (!doc.startViewTransition || prefersReducedMotion()) {
		update();
		return;
	}
	const rect = origin?.getBoundingClientRect();
	const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
	const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
	const r = Math.hypot(
		Math.max(x, window.innerWidth - x),
		Math.max(y, window.innerHeight - y),
	);
	const t = doc.startViewTransition(() => flushSync(update));
	t.ready
		.then(() => {
			document.documentElement.animate(
				{
					clipPath: [
						`circle(0px at ${x}px ${y}px)`,
						`circle(${r}px at ${x}px ${y}px)`,
					],
				},
				{
					duration: 520,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
					pseudoElement: "::view-transition-new(root)",
				},
			);
		})
		.catch(() => {});
}
