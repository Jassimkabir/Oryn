import { describe, expect, it } from "vitest";
import { balances } from "./book";
import type { Account, Recurring, Txn } from "./model";
import { dueDates, nextAfter, occurrence } from "./recurring";

describe("occurrence", () => {
	it("keeps the 31st, clamping to short months", () => {
		expect(occurrence("2026-01-31", "monthly", 1, 1)).toBe("2026-02-28");
		expect(occurrence("2026-01-31", "monthly", 1, 2)).toBe("2026-03-31");
		expect(occurrence("2026-01-31", "monthly", 1, 3)).toBe("2026-04-30");
	});
	it("handles leap years for yearly", () => {
		expect(occurrence("2024-02-29", "yearly", 1, 1)).toBe("2025-02-28");
		expect(occurrence("2024-02-29", "yearly", 1, 4)).toBe("2028-02-29");
	});
	it("steps weeks", () => {
		expect(occurrence("2026-11-02", "weekly", 2, 1)).toBe("2026-11-16");
	});
});

describe("nextAfter and dueDates", () => {
	const r: Recurring = {
		id: "r",
		kind: "expense",
		amount: 100,
		account: "a",
		payee: "Rent",
		freq: "monthly",
		every: 1,
		startOn: "2026-08-31",
		nextOn: "2026-09-30",
		autoPost: true,
		active: true,
	};
	it("finds the next date strictly after", () => {
		expect(nextAfter(r, "2026-09-30")).toBe("2026-10-31");
		expect(nextAfter(r, "2026-08-30")).toBe("2026-08-31");
	});
	it("lists everything due up to today", () => {
		expect(dueDates(r, "2026-11-18")).toEqual(["2026-09-30", "2026-10-31"]);
		expect(dueDates(r, "2026-09-29")).toEqual([]);
	});
});

describe("balances", () => {
	const accounts: Account[] = [
		{
			id: "bank",
			name: "Bank",
			kind: "bank",
			opening: 1000,
			archived: false,
			sort: 0,
		},
		{
			id: "card",
			name: "Card",
			kind: "card",
			opening: -200,
			archived: false,
			sort: 1,
		},
	];
	const t = (p: Partial<Txn>): Txn => ({
		id: Math.random().toString(),
		kind: "expense",
		amount: 0,
		account: "bank",
		payee: "",
		at: "2026-11-01T00:00:00Z",
		...p,
	});
	it("applies expenses, income and transfers", () => {
		const m = balances({
			accounts,
			txns: [
				t({ amount: 300 }),
				t({ kind: "income", amount: 500 }),
				t({ account: "card", amount: 50 }),
				t({
					kind: "transfer",
					amount: 250,
					account: "bank",
					toAccount: "card",
				}),
			],
		});
		expect(m.get("bank")).toBe(1000 - 300 + 500 - 250);
		expect(m.get("card")).toBe(-200 - 50 + 250);
	});
});
