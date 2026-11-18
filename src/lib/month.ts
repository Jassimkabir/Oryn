import type { Category, Txn } from "./model";
import type { Minor } from "./money";

export type MonthSummary = {
	monthName: string;
	today: number;
	daysInMonth: number;
	daysLeft: number;
	/** Expenses this month (income and transfers aren't spending). */
	spent: Minor;
	/** Money in this month. */
	income: Minor;
	/** Expenses logged this month. */
	count: number;
	daily: Minor[];
	/** Expense categories in spend order (archived ones only if used). */
	byCategory: { category: Category; spent: Minor }[];
};

export function summarizeMonth(
	txns: Txn[],
	categories: Category[],
	now = new Date(),
): MonthSummary {
	const y = now.getFullYear();
	const m = now.getMonth();
	const daysInMonth = new Date(y, m + 1, 0).getDate();
	const today = now.getDate();
	const daily = Array.from({ length: daysInMonth }, () => 0);
	const byCat = new Map<string, number>();
	let spent = 0;
	let income = 0;
	let count = 0;
	for (const e of txns) {
		const d = new Date(e.at);
		if (d.getFullYear() !== y || d.getMonth() !== m) continue;
		if (e.kind === "income") {
			income += e.amount;
			continue;
		}
		if (e.kind !== "expense") continue;
		spent += e.amount;
		count++;
		daily[d.getDate() - 1] = (daily[d.getDate() - 1] ?? 0) + e.amount;
		const key = e.category ?? "";
		byCat.set(key, (byCat.get(key) ?? 0) + e.amount);
	}
	return {
		monthName: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(now),
		today,
		daysInMonth,
		daysLeft: daysInMonth - today + 1,
		spent,
		income,
		count,
		daily,
		byCategory: categories
			.filter((c) => c.kind === "expense" && (!c.archived || byCat.has(c.id)))
			.map((c) => ({ category: c, spent: byCat.get(c.id) ?? 0 }))
			.sort((a, b) => b.spent - a.spent || a.category.sort - b.category.sort),
	};
}
