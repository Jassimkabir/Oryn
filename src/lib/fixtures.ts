import type { Account, Group, Txn } from "./model";

/* Dev fixtures (plausible, fixed, never random). Used only with ?data=demo|worst. */

type Fixture = Omit<Txn, "id" | "kind"> & { kind?: Txn["kind"] };

function at(day: number, hh: number, mm: number) {
	const now = new Date();
	const d = new Date(
		now.getFullYear(),
		now.getMonth(),
		Math.min(day, now.getDate()),
		hh,
		mm,
	);
	return d.toISOString();
}

export const DEMO: Fixture[] = [
	{
		amount: 380_00,
		category: "dining",
		payee: "Blue Tokai",
		account: "upi",
		at: at(31, 9, 12),
	},
	{
		amount: 2_146_00,
		category: "groceries",
		payee: "Nature's Basket",
		account: "hdfc",
		at: at(30, 19, 40),
	},
	{
		amount: 1_250_00,
		category: "fuel",
		payee: "Indian Oil",
		account: "upi",
		at: at(17, 8, 5),
	},
	{
		amount: 599_00,
		category: "bills",
		payee: "Airtel",
		account: "upi",
		at: at(16, 11, 30),
	},
	{
		amount: 1_840_00,
		category: "dining",
		payee: "Toit",
		account: "hdfc",
		at: at(15, 21, 15),
	},
	{
		amount: 3_412_00,
		category: "groceries",
		payee: "BigBasket",
		account: "upi",
		at: at(14, 10, 2),
	},
	{
		amount: 9_000_00,
		category: "rent",
		payee: "Rent · Koramangala",
		account: "bank",
		at: at(5, 9, 0),
	},
	{
		amount: 2_350_00,
		category: "fuel",
		payee: "HP Petrol",
		account: "upi",
		at: at(12, 18, 20),
	},
	{
		amount: 1_499_00,
		category: "shopping",
		payee: "Uniqlo",
		account: "hdfc",
		at: at(11, 17, 45),
	},
	{
		amount: 2_995_00,
		category: "dining",
		payee: "Bombay Canteen",
		account: "hdfc",
		at: at(9, 20, 30),
	},
	{
		amount: 2_310_00,
		category: "groceries",
		payee: "Zepto",
		account: "upi",
		at: at(8, 22, 5),
	},
	{
		amount: 1_030_00,
		category: "bills",
		payee: "BESCOM",
		account: "upi",
		at: at(7, 9, 40),
	},
	{
		amount: 640_00,
		category: "health",
		payee: "Apollo Pharmacy",
		account: "upi",
		at: at(6, 13, 10),
	},
	{
		amount: 4_200_00,
		category: "travel",
		payee: "IndiGo",
		account: "hdfc",
		at: at(4, 23, 0),
	},
	{
		amount: 1_972_00,
		category: "groceries",
		payee: "DMart",
		account: "cash",
		at: at(3, 12, 30),
	},
	{
		amount: 2_000_00,
		category: "bills",
		payee: "ACT Fibernet",
		account: "upi",
		at: at(2, 10, 0),
	},
	{
		amount: 500_00,
		category: "fuel",
		payee: "Shell",
		account: "cash",
		at: at(1, 8, 45),
	},
];

function monthsAgo(months: number, day: number) {
	const now = new Date();
	return new Date(
		now.getFullYear(),
		now.getMonth() - months,
		day,
		12,
		0,
	).toISOString();
}

/** Group spending for the demo: some this month, some earlier. */
export const DEMO_GROUPED: Fixture[] = [
	{
		amount: 85_000_00,
		category: "shopping",
		payee: "Tanishq",
		account: "hdfc",
		at: at(16, 13, 20),
		group: "demo-wedding",
	},
	{
		amount: 60_000_00,
		category: "dining",
		payee: "Caterer advance",
		account: "bank",
		at: monthsAgo(1, 22),
		group: "demo-wedding",
	},
	{
		amount: 25_000_00,
		category: "shopping",
		payee: "Floral decor",
		account: "upi",
		at: at(12, 11, 0),
		group: "demo-wedding",
	},
	{
		amount: 18_400_00,
		category: "shopping",
		payee: "Sabyasachi trial",
		account: "hdfc",
		at: monthsAgo(2, 9),
		group: "demo-wedding",
	},
	{
		amount: 42_000_00,
		category: "bills",
		payee: "Carpenter, first stage",
		account: "bank",
		at: monthsAgo(1, 4),
		group: "demo-reno",
	},
	{
		amount: 18_500_00,
		category: "shopping",
		payee: "Kajaria tiles",
		account: "upi",
		at: at(9, 16, 40),
		group: "demo-reno",
	},
	{
		amount: 6_200_00,
		category: "bills",
		payee: "Plumber",
		account: "cash",
		at: at(14, 10, 15),
		group: "demo-reno",
	},
	{
		amount: 14_000_00,
		category: "travel",
		payee: "W Goa",
		account: "hdfc",
		at: monthsAgo(3, 12),
		group: "demo-goa",
	},
	{
		amount: 9_800_00,
		category: "travel",
		payee: "IndiGo",
		account: "upi",
		at: monthsAgo(3, 2),
		group: "demo-goa",
	},
	{
		amount: 4_350_00,
		category: "dining",
		payee: "Thalassa",
		account: "upi",
		at: monthsAgo(3, 13),
		group: "demo-goa",
	},
];

export const WORST: Fixture[] = [
	{
		amount: 1_00_00_000_00,
		category: "rent",
		payee: "Down payment · Prestige Lakeside Habitat Phase III Tower 7",
		account: "bank",
		at: at(31, 9, 0),
	},
	{
		amount: 1,
		category: "dining",
		payee: "Ō",
		account: "upi",
		at: at(30, 23, 59),
	},
	{
		amount: 99_999_99,
		category: "shopping",
		payee: "श्री गणेश ज्वेलर्स एंड संस प्राइवेट लिमिटेड",
		account: "worst-card",
		at: at(29, 0, 1),
	},
	{
		amount: 12_34_567_89,
		category: "travel",
		payee: "Emirates",
		account: "upi",
		at: at(20, 12, 0),
	},
	{
		amount: 8_540_00,
		category: "dining",
		payee: "x".repeat(60),
		account: "cash",
		at: at(10, 18, 0),
	},
];

export const DEMO_GROUPS: Group[] = [
	{
		id: "demo-wedding",
		name: "Ananya's wedding",
		icon: "wedding",
		budget: 3_00_000_00,
		inMonthly: false,
		finished: false,
		createdAt: "2026-09-02T09:00:00.000Z",
	},
	{
		id: "demo-reno",
		name: "Kitchen renovation",
		icon: "renovation",
		budget: 1_50_000_00,
		inMonthly: false,
		finished: false,
		createdAt: "2026-10-12T09:00:00.000Z",
	},
	{
		id: "demo-goa",
		name: "Goa trip",
		icon: "travel",
		budget: null,
		inMonthly: true,
		finished: true,
		createdAt: "2026-08-01T09:00:00.000Z",
	},
];

export const DEMO_ACCOUNTS: Account[] = [
	{
		id: "bank",
		name: "HDFC savings",
		kind: "bank",
		opening: 2_92_500_00,
		archived: false,
		sort: 0,
	},
	{
		id: "upi",
		name: "UPI",
		kind: "upi",
		opening: 62_000_00,
		archived: false,
		sort: 1,
	},
	{
		id: "hdfc",
		name: "HDFC card",
		kind: "card",
		opening: 0,
		archived: false,
		sort: 2,
	},
	{
		id: "cash",
		name: "Cash",
		kind: "cash",
		opening: 11_500_00,
		archived: false,
		sort: 3,
	},
];

/** Money in and money moved, so balances and income read true in the demo. */
export const DEMO_FLOWS: Fixture[] = [
	{
		kind: "income",
		amount: 1_10_000_00,
		category: "salary",
		payee: "Acme Labs salary",
		account: "bank",
		at: at(1, 9, 30),
	},
	{
		kind: "transfer",
		amount: 20_000_00,
		payee: "Top up UPI",
		account: "bank",
		toAccount: "upi",
		at: at(2, 10, 0),
	},
	{
		kind: "income",
		amount: 1_284_00,
		category: "interest",
		payee: "Savings interest",
		account: "bank",
		at: at(3, 6, 0),
	},
	{
		kind: "transfer",
		amount: 1_00_000_00,
		payee: "Card bill",
		account: "bank",
		toAccount: "hdfc",
		at: at(4, 11, 0),
	},
];

export const WORST_ACCOUNTS: Account[] = [
	{
		id: "worst-card",
		name: "HDFC Regalia Gold Credit Card ••4821",
		kind: "card",
		opening: 0,
		archived: false,
		sort: 9,
	},
];
