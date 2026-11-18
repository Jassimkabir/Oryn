import { addTxn, bookStore, saveRecurring } from "./book";
import type { Freq, Recurring, Txn } from "./model";
import { ymd } from "./model";

/*
 * Recurring payments. Each occurrence is counted from the start date, so a
 * payment on the 31st lands on the last day of shorter months and comes back to
 * the 31st, instead of drifting. A posted occurrence has a fixed id
 * (rec-<id>-<date>), so the phone and the server's daily job can both post it
 * and it still appears once.
 */

const parse = (s: string) => {
	const [y, m, d] = s.split("-").map(Number) as [number, number, number];
	return { y, m: m - 1, d };
};

/** The k-th occurrence after the start date. */
export function occurrence(
	start: string,
	freq: Freq,
	every: number,
	k: number,
) {
	const { y, m, d } = parse(start);
	if (freq === "weekly") return ymd(new Date(y, m, d + 7 * every * k));
	const months = freq === "monthly" ? every * k : 12 * every * k;
	const target = new Date(y, m + months, 1);
	const last = new Date(
		target.getFullYear(),
		target.getMonth() + 1,
		0,
	).getDate();
	return ymd(
		new Date(target.getFullYear(), target.getMonth(), Math.min(d, last)),
	);
}

/** The first occurrence strictly after `after`. */
export function nextAfter(
	r: Pick<Recurring, "freq" | "every" | "startOn">,
	after: string,
) {
	for (let k = 0; k < 5000; k++) {
		const o = occurrence(r.startOn, r.freq, Math.max(1, r.every), k);
		if (o > after) return o;
	}
	return after;
}

/** Due dates up to and including today (at most a year's worth). */
export function dueDates(r: Recurring, today = ymd(new Date())) {
	const out: string[] = [];
	let d = r.nextOn;
	while (d <= today && out.length < 60) {
		out.push(d);
		d = nextAfter(r, d);
	}
	return out;
}

export const recurringTxnId = (r: Recurring, date: string) =>
	`rec-${r.id}-${date}`;

function txnFor(r: Recurring, date: string): Omit<Txn, "id"> & { id: string } {
	const { y, m, d } = parse(date);
	return {
		id: recurringTxnId(r, date),
		kind: r.kind,
		amount: r.amount,
		account: r.account,
		toAccount: r.kind === "transfer" ? (r.toAccount ?? null) : null,
		category: r.kind === "transfer" ? null : (r.category ?? null),
		group: r.group ?? null,
		payee: r.payee,
		at: new Date(y, m, d, 9, 0).toISOString(),
		recurring: r.id,
	};
}

/** Post one occurrence and move the schedule on. */
export function postOccurrence(r: Recurring, date: string) {
	const id = recurringTxnId(r, date);
	if (!bookStore.state.txns.some((t) => t.id === id)) addTxn(txnFor(r, date));
	saveRecurring({ ...r, nextOn: nextAfter(r, date) });
}

/** Skip one occurrence without posting it. */
export function skipOccurrence(r: Recurring, date: string) {
	saveRecurring({ ...r, nextOn: nextAfter(r, date) });
}

/** Post everything due that is set to post itself. Run on open and hourly. */
export function postDueRecurring() {
	for (const r of bookStore.state.recurring) {
		if (!r.active || !r.autoPost) continue;
		for (const date of dueDates(r)) postOccurrence(r, date);
	}
}

/** Due payments waiting for you to confirm. */
export function pendingDue(list: Recurring[], today = ymd(new Date())) {
	return list
		.filter((r) => r.active && !r.autoPost && r.nextOn <= today)
		.map((r) => ({ recurring: r, date: r.nextOn }));
}
