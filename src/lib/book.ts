import { useSearch } from "@tanstack/react-router";
import { Store, useStore } from "@tanstack/react-store";
import { useMemo } from "react";
import {
	DEMO,
	DEMO_ACCOUNTS,
	DEMO_FLOWS,
	DEMO_GROUPED,
	DEMO_GROUPS,
	WORST,
	WORST_ACCOUNTS,
} from "./fixtures";
import {
	type Account,
	type Book,
	type Category,
	DEFAULT_ACCOUNTS,
	DEFAULT_CATEGORIES,
	type Group,
	newId,
	type Recurring,
	type Txn,
} from "./model";
import type { Minor } from "./money";

/*
 * The book: every account, category, group, transaction and recurring payment,
 * kept on the phone so the app opens instantly and works offline. Every change
 * is applied here first, then handed to the sync engine (lib/sync), which sends
 * it to Supabase when one is connected and the person is signed in.
 */

export type Table = keyof Book;
export type Change =
	| { table: Table; op: "upsert"; row: Book[Table][number] }
	| { table: Table; op: "delete"; id: string };

const KEY = "oryn:book";

export const emptyBook = (): Book => ({
	accounts: DEFAULT_ACCOUNTS.map((a) => ({ ...a })),
	categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
	groups: [],
	txns: [],
	recurring: [],
});

/** Moves data saved by earlier versions (expenses + groups) into the book. */
function fromLegacy(): Book | null {
	try {
		const rawEntries = window.localStorage.getItem("oryn:local-ledger");
		const rawGroups = window.localStorage.getItem("oryn:groups");
		if (!rawEntries && !rawGroups) return null;
		const book = emptyBook();
		const entries = JSON.parse(rawEntries ?? "[]") as {
			id: string;
			amount: number;
			category: string;
			payee: string;
			account: string;
			at: string;
			group?: string;
		}[];
		for (const e of entries) {
			let acct = book.accounts.find(
				(a) => a.name.toLowerCase() === String(e.account).toLowerCase(),
			);
			if (!acct) {
				acct = {
					id: newId(),
					name: e.account || "Account",
					kind: "bank",
					opening: 0,
					archived: false,
					sort: book.accounts.length,
				};
				book.accounts.push(acct);
			}
			book.txns.push({
				id: e.id,
				kind: "expense",
				amount: e.amount,
				account: acct.id,
				category: e.category,
				group: e.group ?? null,
				payee: e.payee,
				at: e.at,
			});
		}
		book.groups = JSON.parse(rawGroups ?? "[]");
		return book;
	} catch {
		return null;
	}
}

function load(): Book {
	if (typeof window === "undefined") return emptyBook();
	try {
		const raw = window.localStorage.getItem(KEY);
		if (raw) return { ...emptyBook(), ...JSON.parse(raw) };
	} catch {
		/* fall through */
	}
	const legacy = fromLegacy();
	if (legacy) {
		persist(legacy);
		try {
			window.localStorage.removeItem("oryn:local-ledger");
			window.localStorage.removeItem("oryn:groups");
		} catch {
			/* ignored */
		}
		return legacy;
	}
	return emptyBook();
}

function persist(book: Book) {
	try {
		window.localStorage.setItem(KEY, JSON.stringify(book));
	} catch {
		/* storage full or unavailable: the in-memory book still works */
	}
}

export const bookStore = new Store<Book>(load());
/** The row just saved, so lists can mark it. */
export const freshStore = new Store<string | null>(null);

type Pusher = (changes: Change[]) => void;
let pusher: Pusher | null = null;
/** The sync engine registers here; with no Supabase it stays null. */
export function setPusher(fn: Pusher | null) {
	pusher = fn;
}

function commit(update: (b: Book) => Book, changes: Change[]) {
	bookStore.setState(update);
	persist(bookStore.state);
	if (changes.length) pusher?.(changes);
}

/** Replace the whole book (sign-in pull, sign-out reset). Not synced. */
export function replaceBook(book: Book) {
	bookStore.setState(() => book);
	persist(book);
}

function upsertIn<T extends { id: string }>(list: T[], row: T): T[] {
	const i = list.findIndex((x) => x.id === row.id);
	if (i === -1) return [row, ...list];
	const next = list.slice();
	next[i] = row;
	return next;
}

function save<K extends Table>(table: K, row: Book[K][number]) {
	commit(
		(b) => ({
			...b,
			[table]: upsertIn(b[table] as { id: string }[], row as { id: string }),
		}),
		[{ table, op: "upsert", row }],
	);
}

function remove(table: Table, id: string) {
	commit(
		(b) => ({
			...b,
			[table]: (b[table] as { id: string }[]).filter((x) => x.id !== id),
		}),
		[{ table, op: "delete", id }],
	);
}

/* ── Transactions ─────────────────────────────────────────────── */

export function addTxn(t: Omit<Txn, "id"> & { id?: string }) {
	const txn: Txn = { ...t, id: t.id ?? newId() };
	save("txns", txn);
	freshStore.setState(() => txn.id);
	return txn;
}
export const updateTxn = (t: Txn) => save("txns", t);
export const removeTxn = (id: string) => remove("txns", id);

/* ── Accounts ─────────────────────────────────────────────────── */

export const saveAccount = (a: Account) => save("accounts", a);
/** Accounts with transactions are hidden instead, so history stays whole. */
export function removeAccount(id: string) {
	const used = bookStore.state.txns.some(
		(t) => t.account === id || t.toAccount === id,
	);
	const acct = bookStore.state.accounts.find((a) => a.id === id);
	if (!acct) return "gone" as const;
	if (used) {
		save("accounts", { ...acct, archived: true });
		return "archived" as const;
	}
	remove("accounts", id);
	return "deleted" as const;
}

/* ── Categories ───────────────────────────────────────────────── */

export const saveCategory = (c: Category) => save("categories", c);
export function removeCategory(id: string) {
	const used = bookStore.state.txns.some((t) => t.category === id);
	const c = bookStore.state.categories.find((x) => x.id === id);
	if (!c) return "gone" as const;
	if (used) {
		save("categories", { ...c, archived: true });
		return "archived" as const;
	}
	remove("categories", id);
	return "deleted" as const;
}

/* ── Groups ───────────────────────────────────────────────────── */

export function createGroup(g: Omit<Group, "id" | "createdAt" | "finished">) {
	const group: Group = {
		...g,
		id: newId(),
		finished: false,
		createdAt: new Date().toISOString(),
	};
	save("groups", group);
	return group;
}
export function updateGroup(id: string, patch: Partial<Omit<Group, "id">>) {
	const g = bookStore.state.groups.find((x) => x.id === id);
	if (g) save("groups", { ...g, ...patch });
}
/** Removes the group. Its expenses stay, just without a group. */
export function deleteGroup(id: string) {
	const g = bookStore.state.groups.find((x) => x.id === id);
	const tagged = bookStore.state.txns.filter((t) => t.group === id);
	commit(
		(b) => ({
			...b,
			groups: b.groups.filter((x) => x.id !== id),
			txns: b.txns.map((t) => (t.group === id ? { ...t, group: null } : t)),
		}),
		[
			...tagged.map(
				(t) =>
					({
						table: "txns",
						op: "upsert",
						row: { ...t, group: null },
					}) as Change,
			),
			{ table: "groups", op: "delete", id },
		],
	);
	return g ? { group: g, tagged } : undefined;
}
export function restoreGroup(saved: { group: Group; tagged: Txn[] }) {
	commit(
		(b) => ({
			...b,
			groups: upsertIn(b.groups, saved.group),
			txns: b.txns.map((t) => saved.tagged.find((x) => x.id === t.id) ?? t),
		}),
		[
			{ table: "groups", op: "upsert", row: saved.group },
			...saved.tagged.map(
				(t) => ({ table: "txns", op: "upsert", row: t }) as Change,
			),
		],
	);
}

/* ── Recurring ────────────────────────────────────────────────── */

export const saveRecurring = (r: Recurring) => save("recurring", r);
export const removeRecurring = (id: string) => remove("recurring", id);

/* ── Reading ──────────────────────────────────────────────────── */

export type DataMode = "live" | "demo" | "worst" | "empty";

function withIds(
	list: (Omit<Txn, "id" | "kind"> & { kind?: Txn["kind"] })[],
	prefix: string,
): Txn[] {
	return list.map((e, i) => ({ kind: "expense", ...e, id: `${prefix}-${i}` }));
}

const byNewest = (a: Txn, b: Txn) => b.at.localeCompare(a.at);

/** The book for the current data mode (dev fixtures with ?data=demo|worst). */
export function useBook(): Book & { mode: DataMode } {
	const search = useSearch({ strict: false }) as { data?: string };
	const live = useStore(bookStore, (s) => s);
	const mode = (
		import.meta.env.DEV ? (search.data ?? "demo") : "live"
	) as DataMode;
	return useMemo(() => {
		if (mode === "empty") return { ...emptyBook(), mode, txns: [], groups: [] };
		if (mode === "live")
			return { ...live, txns: [...live.txns].sort(byNewest), mode };
		const demo = mode === "demo";
		const extraAccounts = demo ? DEMO_ACCOUNTS : WORST_ACCOUNTS;
		const accounts = [
			...live.accounts.filter((a) => !extraAccounts.some((x) => x.id === a.id)),
			...extraAccounts,
		];
		const fixtures = demo
			? withIds([...DEMO, ...DEMO_GROUPED, ...DEMO_FLOWS], "demo")
			: withIds(WORST, "worst");
		return {
			...live,
			accounts,
			groups: demo ? [...live.groups, ...DEMO_GROUPS] : live.groups,
			txns: [...live.txns, ...fixtures].sort(byNewest),
			mode,
		};
	}, [mode, live]);
}

export function useFreshId() {
	return useStore(freshStore, (s) => s);
}

/** Lookup maps for rows. */
export function useLookups() {
	const book = useBook();
	return useMemo(
		() => ({
			category: new Map(book.categories.map((c) => [c.id, c])),
			account: new Map(book.accounts.map((a) => [a.id, a])),
			group: new Map(book.groups.map((g) => [g.id, g])),
		}),
		[book],
	);
}

/** Sum of every active expense category's monthly budget. */
export function monthBudget(categories: Category[]): Minor {
	return categories
		.filter((c) => c.kind === "expense" && !c.archived)
		.reduce((s, c) => s + (c.budget ?? 0), 0);
}

/** Balance of each account: opening + in − out (cards go negative as you spend). */
export function balances(book: Pick<Book, "accounts" | "txns">) {
	const m = new Map<string, Minor>(book.accounts.map((a) => [a.id, a.opening]));
	for (const t of book.txns) {
		const add = (id: string | null | undefined, v: number) => {
			if (id && m.has(id)) m.set(id, (m.get(id) ?? 0) + v);
		};
		if (t.kind === "expense") add(t.account, -t.amount);
		else if (t.kind === "income") add(t.account, t.amount);
		else {
			add(t.account, -t.amount);
			add(t.toAccount, t.amount);
		}
	}
	return m;
}
