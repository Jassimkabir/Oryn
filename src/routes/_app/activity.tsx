import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useBook, useFreshId } from "#/lib/book";
import { openEdit } from "#/lib/groups";
import type { Txn } from "#/lib/model";
import { Amount } from "#/ui/Amount";
import { DayBars } from "#/ui/charts";
import { Card, Screen } from "#/ui/Screen";
import { SlipRow } from "#/ui/SlipRow";

export const Route = createFileRoute("/_app/activity")({
	component: Activity,
});

const dayFmt = new Intl.DateTimeFormat("en-IN", {
	weekday: "short",
	day: "numeric",
	month: "short",
});
const shortFmt = new Intl.DateTimeFormat("en-IN", {
	day: "numeric",
	month: "short",
});

function dayLabel(d: Date) {
	const today = new Date();
	const y = new Date(today);
	y.setDate(today.getDate() - 1);
	if (d.toDateString() === today.toDateString()) return "Today";
	if (d.toDateString() === y.toDateString()) return "Yesterday";
	return dayFmt.format(d);
}

const SPAN = 14;

/** Every transaction, newest first, grouped by day. Day totals count spending only. */
function Activity() {
	const entries = useBook().txns;
	const freshId = useFreshId();
	const days = useMemo(() => {
		const map = new Map<string, Txn[]>();
		for (const e of entries) {
			const key = new Date(e.at).toDateString();
			map.set(key, [...(map.get(key) ?? []), e]);
		}
		return [...map.entries()].map(([key, list]) => ({
			key,
			label: dayLabel(new Date(key)),
			total: list.reduce(
				(s, e) => s + (e.kind === "expense" ? e.amount : 0),
				0,
			),
			list,
		}));
	}, [entries]);

	const recent = useMemo(() => {
		const totals = new Map(days.map((d) => [d.key, d.total]));
		const now = new Date();
		const values: number[] = [];
		for (let i = SPAN - 1; i >= 0; i--) {
			const d = new Date(now);
			d.setDate(now.getDate() - i);
			values.push(totals.get(d.toDateString()) ?? 0);
		}
		const start = new Date(now);
		start.setDate(now.getDate() - (SPAN - 1));
		return {
			values,
			total: values.reduce((a, b) => a + b, 0),
			labels: [shortFmt.format(start), "Today"],
		};
	}, [days]);

	return (
		<Screen
			title="Activity"
			trailing={
				entries.length > 0
					? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
					: undefined
			}
		>
			{days.length === 0 ? (
				<Card className="mt-3">
					<p className="font-semibold">Nothing here yet</p>
					<p className="mt-1 max-w-[34ch] text-sm text-muted">
						Everything you add lands here, grouped by day.
					</p>
				</Card>
			) : (
				<>
					<Card className="mt-3">
						<div className="flex items-baseline justify-between gap-3">
							<h2 className="text-sm font-medium text-muted">Last 14 days</h2>
							<p className="text-sm text-muted">
								Avg{" "}
								<Amount value={Math.round(recent.total / SPAN / 100) * 100} /> a
								day
							</p>
						</div>
						<Amount
							value={recent.total}
							className="mt-1 block text-[1.75rem] font-light tracking-[-0.03em]"
						/>
						<div className="mt-4">
							<DayBars
								values={recent.values}
								labels={recent.labels}
								label="Spending per day over the last 14 days."
							/>
						</div>
					</Card>
					{days.map((d) => (
						<section
							key={d.key}
							aria-label={d.label}
							className="glass liquid card mt-4 px-4 pt-3 pb-1"
						>
							<div className="flex items-baseline justify-between">
								<h2 className="text-sm font-semibold">{d.label}</h2>
								<Amount
									value={d.total}
									className="text-sm font-medium text-muted"
								/>
							</div>
							<ul>
								{d.list.map((e) => (
									<SlipRow
										key={e.id}
										entry={e}
										fresh={e.id === freshId}
										onOpen={openEdit}
									/>
								))}
							</ul>
						</section>
					))}
				</>
			)}
		</Screen>
	);
}
