import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

/**
 * A native screen: a large title in the page, and a compact glass bar whose title
 * fades in once the large title scrolls away.
 */
export function Screen({
	title,
	leading,
	trailing,
	sub,
	back,
	children,
}: {
	title: string;
	/** Sits before the large title (the logo on Overview). */
	leading?: ReactNode;
	/** Sits on the large title's baseline, right-aligned. */
	trailing?: ReactNode;
	/** One line under the large title. */
	sub?: ReactNode;
	back?: { to: string; label: string };
	children: ReactNode;
}) {
	const sentinel = useRef<HTMLDivElement>(null);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		const el = sentinel.current;
		if (!el) return;
		const io = new IntersectionObserver(
			([e]) => setCollapsed(!e?.isIntersecting),
			{ rootMargin: "-48px 0px 0px 0px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<>
			<header
				data-collapsed={collapsed}
				className="sticky top-0 z-20 pt-[var(--safe-top)]"
			>
				<div
					aria-hidden
					className="bar-glass glass glass-thick absolute inset-0 rounded-none border-x-0 border-t-0"
				/>
				<div className="relative mx-auto grid h-[var(--bar-h)] max-w-[480px] grid-cols-[1fr_auto_1fr] items-center px-3">
					<div>
						{back && (
							<Link
								to={back.to}
								className="pressable inline-flex h-11 items-center gap-0.5 pr-2 font-medium text-stamp"
							>
								<Icon icon={ArrowLeft01Icon} size={24} stroke={1.8} />
								<span className="text-base">{back.label}</span>
							</Link>
						)}
					</div>
					<p
						className="bar-title truncate text-[0.9375rem] font-semibold"
						aria-hidden
					>
						{title}
					</p>
					<div />
				</div>
			</header>
			<main className="mx-auto w-full max-w-[480px] px-4 pb-[calc(var(--tabbar-h)+var(--safe-bottom)+2.5rem)]">
				<div className="flex items-end justify-between gap-3 px-1 pt-1">
					<div className="flex min-w-0 items-center gap-2.5">
						{leading}
						<h1 className="truncate text-title font-bold tracking-[-0.03em]">
							{title}
						</h1>
					</div>
					{trailing ? (
						<div className="shrink-0 pb-1 text-sm font-medium text-muted">
							{trailing}
						</div>
					) : null}
				</div>
				{sub ? <div className="mt-1 px-1">{sub}</div> : null}
				<div ref={sentinel} aria-hidden className="h-px" />
				{children}
			</main>
		</>
	);
}

/** A glass card with an optional heading row. */
export function Card({
	title,
	id,
	action,
	className,
	children,
}: {
	title?: string;
	id?: string;
	action?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			aria-labelledby={title ? id : undefined}
			className={`glass liquid card mt-4 p-4 ${className ?? ""}`}
		>
			{title && (
				<div className="mb-2 flex items-baseline justify-between gap-3">
					<h2 id={id} className="text-base font-semibold">
						{title}
					</h2>
					{action}
				</div>
			)}
			{children}
		</section>
	);
}
