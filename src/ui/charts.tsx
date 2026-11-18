import { useId } from "react";
import type { Minor } from "#/lib/money";
import { cn } from "#/lib/utils";

/* Charts are plain SVG. They draw at their real values on mount and do not
   animate in; they're data, read at a glance. */

type Pt = [number, number];

/** Monotone cubic path (no overshoot), so a running total never dips. */
function smoothPath(pts: Pt[]) {
	if (pts.length < 2) return "";
	const n = pts.length;
	const dx: number[] = [];
	const m: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = pts[i] as Pt;
		const [x1, y1] = pts[i + 1] as Pt;
		dx.push(x1 - x0);
		m.push((y1 - y0) / (x1 - x0 || 1));
	}
	const t: number[] = [m[0] ?? 0];
	for (let i = 1; i < n - 1; i++) {
		const a = m[i - 1] ?? 0;
		const b = m[i] ?? 0;
		t.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b));
	}
	t.push(m[n - 2] ?? 0);
	let d = `M${pts[0]?.[0]},${pts[0]?.[1]}`;
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = pts[i] as Pt;
		const [x1, y1] = pts[i + 1] as Pt;
		const h = (dx[i] ?? 0) / 3;
		d += ` C${x0 + h},${y0 + (t[i] ?? 0) * h} ${x1 - h},${y1 - (t[i + 1] ?? 0) * h} ${x1},${y1}`;
	}
	return d;
}

/**
 * The month so far: running total as a soft area, an even-pace line to the budget,
 * and today's point. Ahead of pace turns the line's end red.
 */
export function SpendCurve({
	daily,
	today,
	budget,
	label,
}: {
	daily: Minor[];
	today: number;
	budget: Minor;
	label: string;
}) {
	const gid = useId();
	const W = 320;
	const H = 112;
	const days = daily.length;
	const cum: number[] = [];
	daily.slice(0, today).reduce((s, v, i) => {
		cum[i] = s + v;
		return cum[i] as number;
	}, 0);
	const spent = cum[today - 1] ?? 0;
	const max = Math.max(budget, spent) * 1.08 || 1;
	const x = (day: number) => (day / days) * W;
	const y = (v: number) => H - (v / max) * H;
	const pts: Pt[] = [[0, H], ...cum.map((v, i) => [x(i + 1), y(v)] as Pt)];
	const line = smoothPath(pts);
	const area = `${line} L${x(today)},${H} L0,${H} Z`;
	const ahead = spent > (budget * today) / days;
	const dotX = (today / days) * 100;
	const dotY = (y(spent) / H) * 100;

	return (
		<figure className="relative">
			<figcaption className="sr-only">{label}</figcaption>
			<div className="relative" aria-hidden>
				<svg
					aria-hidden="true"
					viewBox={`0 0 ${W} ${H}`}
					preserveAspectRatio="none"
					className="block h-28 w-full overflow-visible"
				>
					<defs>
						<linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
							<stop offset="0" stopColor="var(--stamp)" stopOpacity="0.32" />
							<stop offset="1" stopColor="var(--stamp)" stopOpacity="0" />
						</linearGradient>
					</defs>
					<line
						x1="0"
						y1={y(budget)}
						x2={W}
						y2={y(budget)}
						stroke="var(--rule)"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
					/>
					<line
						x1="0"
						y1={H}
						x2={W}
						y2={y(budget)}
						stroke="var(--muted)"
						strokeOpacity="0.55"
						strokeWidth="1.25"
						strokeDasharray="3 4"
						vectorEffect="non-scaling-stroke"
					/>
					<path d={area} fill={`url(#${gid})`} />
					<path
						d={line}
						fill="none"
						stroke="var(--stamp)"
						strokeWidth="2.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
				<span
					className={cn(
						"absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--raised)] shadow-[0_0_0_4px_color-mix(in_oklch,var(--stamp)_20%,transparent)]",
						ahead ? "bg-negative" : "bg-stamp",
					)}
					style={{ left: `${dotX}%`, top: `${dotY}%` }}
				/>
			</div>
			<div
				aria-hidden
				className="mt-2 flex justify-between text-2xs font-medium text-muted"
			>
				<span>1st</span>
				<span>Budget pace</span>
				<span>{days}th</span>
			</div>
		</figure>
	);
}

export type Slice = { id: string; value: number; color: string };

/** Donut of shares. Gaps between slices, rounded ends. */
export function Donut({
	slices,
	size = 132,
	thickness = 14,
	children,
}: {
	slices: Slice[];
	size?: number;
	thickness?: number;
	children?: React.ReactNode;
}) {
	const r = (size - thickness) / 2;
	const c = 2 * Math.PI * r;
	const total = slices.reduce((s, x) => s + x.value, 0) || 1;
	const gap = slices.length > 1 ? 5 : 0;
	let offset = 0;
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${size} ${size}`}
				className="block -rotate-90"
				width={size}
				height={size}
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--well)"
					strokeWidth={thickness}
				/>
				{slices.map((s) => {
					const len = (s.value / total) * c;
					const dash = Math.max(0.01, len - gap);
					const el = (
						<circle
							key={s.id}
							cx={size / 2}
							cy={size / 2}
							r={r}
							fill="none"
							stroke={s.color}
							strokeWidth={thickness}
							strokeLinecap={len > thickness ? "round" : "butt"}
							strokeDasharray={`${dash} ${c - dash}`}
							strokeDashoffset={-offset - gap / 2}
						/>
					);
					offset += len;
					return el;
				})}
			</svg>
			<div className="absolute inset-0 grid place-items-center text-center">
				{children}
			</div>
		</div>
	);
}

/** A ring showing one share of a whole (budget used). Red past 100%. */
export function Ring({
	ratio,
	size = 96,
	thickness = 10,
	children,
}: {
	ratio: number;
	size?: number;
	thickness?: number;
	children?: React.ReactNode;
}) {
	const r = (size - thickness) / 2;
	const c = 2 * Math.PI * r;
	const len = Math.min(1, Math.max(0, ratio)) * c;
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${size} ${size}`}
				className="block -rotate-90"
				width={size}
				height={size}
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--well)"
					strokeWidth={thickness}
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke={ratio > 1 ? "var(--negative)" : "var(--stamp)"}
					strokeWidth={thickness}
					strokeLinecap="round"
					strokeDasharray={`${len} ${c}`}
				/>
			</svg>
			<div className="absolute inset-0 grid place-items-center text-center">
				{children}
			</div>
		</div>
	);
}

/** Daily bars for the last N days; today's bar in stamp ink. */
export function DayBars({
	values,
	labels,
	label,
}: {
	values: Minor[];
	labels: string[];
	label: string;
}) {
	const max = Math.max(...values, 1);
	return (
		<figure>
			<figcaption className="sr-only">{label}</figcaption>
			<div aria-hidden className="flex h-24 items-end gap-[5px]">
				{values.map((v, i) => {
					const last = i === values.length - 1;
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length day series
							key={i}
							className="flex-1 rounded-[5px]"
							style={{
								height: `${Math.max(4, (v / max) * 100)}%`,
								background: last
									? "var(--stamp)"
									: v > 0
										? "color-mix(in oklch, var(--stamp) 34%, transparent)"
										: "var(--well)",
							}}
						/>
					);
				})}
			</div>
			<div
				aria-hidden
				className="mt-2 flex justify-between text-2xs font-medium text-muted"
			>
				{labels.map((l) => (
					<span key={l}>{l}</span>
				))}
			</div>
		</figure>
	);
}
