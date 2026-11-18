import { Dialog } from "@base-ui/react/dialog";
import {
	AnimatePresence,
	animate,
	motion,
	type PanInfo,
	useDragControls,
	useMotionValue,
	useTransform,
} from "motion/react";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { prefersReducedMotion } from "#/lib/utils";

const DRAWER_EASE = [0.32, 0.72, 0, 1] as const;
const EXIT_EASE = [0.22, 1, 0.36, 1] as const;
const offscreen = () =>
	typeof window === "undefined" ? 1000 : window.innerHeight;

/**
 * Bottom sheet (gestures + apple-design):
 * - Base UI Dialog owns focus, aria and Escape.
 * - One motion value (y, in px) drives everything: the panel position and the
 *   backdrop's opacity, so open, close and drag all dim in step.
 * - Drag starts only from the grab area, tracks the finger 1:1, rubber-bands upward,
 *   and dismisses past ~40% of its height or on a flick > 500 px/s.
 */
export function Sheet({
	open,
	onOpenChange,
	title,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
}) {
	const y = useMotionValue(offscreen());
	const heightRef = useRef(600);
	const panelRef = useRef<HTMLDivElement>(null);
	const controls = useDragControls();
	const backdropOpacity = useTransform(y, (v) =>
		Math.min(1, Math.max(0, 1 - v / heightRef.current)),
	);
	const reduce = prefersReducedMotion();
	const bodyRef = useRef<HTMLDivElement | null>(null);
	const [scrollable, setScrollable] = useState(false);

	useEffect(() => {
		if (!open) return;
		const el = bodyRef.current;
		if (!el) return;
		const check = () => setScrollable(el.scrollHeight > el.clientHeight + 1);
		check();
		const ro = new ResizeObserver(check);
		ro.observe(el);
		return () => ro.disconnect();
	}, [open]);

	function startDrag(e: ReactPointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest("[data-no-drag], input, textarea, select")) return;
		controls.start(e);
	}

	function measure() {
		heightRef.current = panelRef.current?.offsetHeight ?? heightRef.current;
	}

	function onDragEnd(_: unknown, info: PanInfo) {
		measure();
		if (info.offset.y > heightRef.current * 0.4 || info.velocity.y > 500) {
			onOpenChange(false);
		} else {
			animate(y, 0, {
				type: "spring",
				duration: 0.45,
				bounce: 0.2,
				velocity: info.velocity.y,
			});
		}
	}

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<AnimatePresence>
				{open && (
					<Dialog.Portal keepMounted>
						<Dialog.Backdrop
							render={
								<motion.div
									className="fixed inset-0 z-40 bg-[oklch(0.15_0.04_270/0.32)]"
									style={{ opacity: backdropOpacity }}
								/>
							}
						/>
						<Dialog.Popup
							render={
								<motion.div
									ref={panelRef}
									className="glass glass-thick liquid fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[var(--radius-sheet)] border-b-0 pb-[calc(var(--safe-bottom)+12px)] outline-none"
									style={{ y }}
									drag="y"
									dragControls={controls}
									dragListener={false}
									dragConstraints={{ top: 0, bottom: 0 }}
									dragElastic={{ top: 0.08, bottom: 1 }}
									dragMomentum={false}
									onDragStart={measure}
									onDragEnd={onDragEnd}
									initial={reduce ? { opacity: 0, y: 0 } : { y: offscreen() }}
									animate={
										reduce
											? { opacity: 1, y: 0, transition: { duration: 0.2 } }
											: {
													y: 0,
													transition: { duration: 0.5, ease: DRAWER_EASE },
												}
									}
									exit={
										reduce
											? { opacity: 0, transition: { duration: 0.15 } }
											: {
													y: heightRef.current + 40,
													transition: { duration: 0.32, ease: EXIT_EASE },
												}
									}
									onAnimationStart={measure}
								/>
							}
						>
							<div
								className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 pb-1 active:cursor-grabbing"
								onPointerDown={(e) => controls.start(e)}
							>
								<span className="h-1.5 w-10 rounded-full bg-[color-mix(in_oklch,var(--muted)_45%,transparent)]" />
								<Dialog.Title className="sr-only">{title}</Dialog.Title>
							</div>
							<div
								ref={(el) => {
									bodyRef.current = el;
								}}
								onPointerDown={scrollable ? undefined : startDrag}
								className={
									scrollable
										? "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
										: "min-h-0 flex-1 touch-none overflow-hidden"
								}
							>
								{children}
							</div>
						</Dialog.Popup>
					</Dialog.Portal>
				)}
			</AnimatePresence>
		</Dialog.Root>
	);
}
