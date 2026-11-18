import type { Minor } from "./money";

/*
 * Oryn's data model. The same shapes live on the phone (lib/book) and in
 * Supabase (supabase/migrations). Ids are made on the phone, so a row can be
 * created offline and synced later without changing its id.
 */

export type Kind = "expense" | "income" | "transfer";

export const ACCOUNT_KINDS = ["cash", "bank", "upi", "card", "wallet"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export type Account = {
	id: string;
	name: string;
	kind: AccountKind;
	/** Balance on the day you started tracking it. */
	opening: Minor;
	archived: boolean;
	sort: number;
};

export const CATEGORY_ICONS = [
	"basket",
	"dining",
	"coffee",
	"fuel",
	"transport",
	"bills",
	"phone",
	"rent",
	"shopping",
	"clothes",
	"travel",
	"health",
	"fitness",
	"education",
	"entertainment",
	"gift",
	"baby",
	"emi",
	"salary",
	"interest",
	"refund",
	"other",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const COLOR_KEYS = [
	"green",
	"orange",
	"blue",
	"violet",
	"pink",
	"teal",
	"amber",
	"slate",
	"red",
	"lime",
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export type Category = {
	id: string;
	name: string;
	kind: "expense" | "income";
	icon: CategoryIcon;
	color: ColorKey;
	/** Monthly budget in paise; null means no budget. Expense categories only. */
	budget: Minor | null;
	archived: boolean;
	sort: number;
};

export type Txn = {
	id: string;
	kind: Kind;
	/** Always positive, in paise. Kind says which way it moved. */
	amount: Minor;
	account: string;
	/** Transfers only: where the money went. */
	toAccount?: string | null;
	/** Expense and income only. */
	category?: string | null;
	group?: string | null;
	payee: string;
	note?: string | null;
	at: string; // ISO
	/** Set when a recurring payment created it. */
	recurring?: string | null;
};

/** Kept for older call sites: an expense row is a Txn. */
export type Entry = Txn;

export const FREQS = ["weekly", "monthly", "yearly"] as const;
export type Freq = (typeof FREQS)[number];

export type Recurring = {
	id: string;
	kind: Kind;
	amount: Minor;
	account: string;
	toAccount?: string | null;
	category?: string | null;
	group?: string | null;
	payee: string;
	freq: Freq;
	/** Every N weeks/months/years. */
	every: number;
	/** First occurrence; later ones are counted from it. YYYY-MM-DD. */
	startOn: string;
	/** Next due date, YYYY-MM-DD in your time zone. */
	nextOn: string;
	/** Post it automatically when due; otherwise ask first. */
	autoPost: boolean;
	active: boolean;
};

export type GroupIcon =
	| "wedding"
	| "renovation"
	| "home"
	| "travel"
	| "party"
	| "baby"
	| "study"
	| "car"
	| "health"
	| "gift"
	| "work"
	| "other";

export type Group = {
	id: string;
	name: string;
	icon: GroupIcon;
	budget: Minor | null;
	/** Count this group's spending in the monthly budget too. Off by default. */
	inMonthly: boolean;
	finished: boolean;
	createdAt: string;
};

export type Book = {
	accounts: Account[];
	categories: Category[];
	groups: Group[];
	txns: Txn[];
	recurring: Recurring[];
};

/* ── Defaults for a new book ─────────────────────────────────────── */

const cat = (
	id: string,
	name: string,
	icon: CategoryIcon,
	color: ColorKey,
	budget: Minor | null,
	sort: number,
	kind: "expense" | "income" = "expense",
): Category => ({ id, name, icon, color, budget, kind, archived: false, sort });

export const DEFAULT_CATEGORIES: Category[] = [
	cat("groceries", "Groceries", "basket", "green", 15_000_00, 0),
	cat("dining", "Dining", "dining", "orange", 6_000_00, 1),
	cat("fuel", "Fuel", "fuel", "blue", 8_000_00, 2),
	cat("bills", "Bills & recharge", "bills", "violet", 5_000_00, 3),
	cat("shopping", "Shopping", "shopping", "pink", 8_000_00, 4),
	cat("travel", "Travel", "travel", "teal", 6_000_00, 5),
	cat("health", "Health", "health", "amber", 3_000_00, 6),
	cat("rent", "Rent", "rent", "slate", 9_000_00, 7),
	cat("salary", "Salary", "salary", "green", null, 100, "income"),
	cat("interest", "Interest", "interest", "teal", null, 101, "income"),
	cat("refund", "Refunds", "refund", "blue", null, 102, "income"),
	cat("other-in", "Other income", "other", "slate", null, 103, "income"),
];

export const DEFAULT_ACCOUNTS: Account[] = [
	{ id: "upi", name: "UPI", kind: "upi", opening: 0, archived: false, sort: 0 },
	{
		id: "bank",
		name: "Bank",
		kind: "bank",
		opening: 0,
		archived: false,
		sort: 1,
	},
	{
		id: "cash",
		name: "Cash",
		kind: "cash",
		opening: 0,
		archived: false,
		sort: 2,
	},
];

export const newId = () => crypto.randomUUID();

/** Local calendar date as YYYY-MM-DD. */
export function ymd(d: Date) {
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}-${m}-${day}`;
}
