import type { Session } from "@supabase/supabase-js";
import { Store } from "@tanstack/react-store";
import {
	bookStore,
	type Change,
	emptyBook,
	replaceBook,
	setPusher,
	type Table,
} from "./book";
import {
	type Account,
	type Book,
	type Category,
	DEFAULT_ACCOUNTS,
	DEFAULT_CATEGORIES,
	type Group,
	type Recurring,
	type Txn,
} from "./model";
import { prefsStore, setPrefs } from "./prefs";
import { supabase } from "./supabase";

/*
 * Sync with Supabase. The phone is the source of truth for the screen: changes
 * apply locally at once, wait in an outbox (saved, so they survive a restart or
 * going offline) and go to Supabase in order. Opening the app, coming back to
 * it, or coming back online pulls the latest copy and lays any unsent changes
 * on top. With no Supabase configured, none of this runs and the book stays on
 * the phone.
 */

export const syncEnabled = supabase !== null;

export type SyncState = {
	/** off: no Supabase configured. */
	status:
		| "off"
		| "loading"
		| "signed-out"
		| "syncing"
		| "synced"
		| "offline"
		| "error";
	email: string | null;
	userId: string | null;
	pending: number;
	lastSync: number | null;
	error: string | null;
};

export const syncStore = new Store<SyncState>({
	status: syncEnabled ? "loading" : "off",
	email: null,
	userId: null,
	pending: 0,
	lastSync: null,
	error: null,
});

const set = (patch: Partial<SyncState>) =>
	syncStore.setState((s) => ({ ...s, ...patch }));

/* ── Row mapping (camelCase on the phone, snake_case in Postgres) ── */

const TABLE: Record<Table, string> = {
	accounts: "accounts",
	categories: "categories",
	groups: "groups",
	txns: "transactions",
	recurring: "recurring",
};
/** Parents first, so foreign keys are satisfied on upload. */
const ORDER: Table[] = [
	"accounts",
	"categories",
	"groups",
	"recurring",
	"txns",
];

type Row = Record<string, unknown>;

function toRow(table: Table, r: Book[Table][number], userId: string): Row {
	switch (table) {
		case "accounts": {
			const a = r as Account;
			return {
				user_id: userId,
				id: a.id,
				name: a.name,
				kind: a.kind,
				opening: a.opening,
				archived: a.archived,
				sort: a.sort,
			};
		}
		case "categories": {
			const c = r as Category;
			return {
				user_id: userId,
				id: c.id,
				name: c.name,
				kind: c.kind,
				icon: c.icon,
				color: c.color,
				budget: c.budget,
				archived: c.archived,
				sort: c.sort,
			};
		}
		case "groups": {
			const g = r as Group;
			return {
				user_id: userId,
				id: g.id,
				name: g.name,
				icon: g.icon,
				budget: g.budget,
				in_monthly: g.inMonthly,
				finished: g.finished,
				created_at: g.createdAt,
			};
		}
		case "txns": {
			const t = r as Txn;
			return {
				user_id: userId,
				id: t.id,
				kind: t.kind,
				amount: t.amount,
				account_id: t.account,
				to_account_id: t.toAccount ?? null,
				category_id: t.category ?? null,
				group_id: t.group ?? null,
				payee: t.payee,
				note: t.note ?? null,
				at: t.at,
				recurring_id: t.recurring ?? null,
				currency: prefsStore.state.currency,
			};
		}
		case "recurring": {
			const x = r as Recurring;
			return {
				user_id: userId,
				id: x.id,
				kind: x.kind,
				amount: x.amount,
				account_id: x.account,
				to_account_id: x.toAccount ?? null,
				category_id: x.category ?? null,
				group_id: x.group ?? null,
				payee: x.payee,
				freq: x.freq,
				every: x.every,
				start_on: x.startOn,
				next_on: x.nextOn,
				auto_post: x.autoPost,
				active: x.active,
			};
		}
	}
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function fromRow(table: Table, r: Row): Book[Table][number] {
	switch (table) {
		case "accounts":
			return {
				id: r.id,
				name: r.name,
				kind: r.kind,
				opening: Number(r.opening),
				archived: r.archived,
				sort: r.sort,
			} as Account;
		case "categories":
			return {
				id: r.id,
				name: r.name,
				kind: r.kind,
				icon: r.icon,
				color: r.color,
				budget: num(r.budget),
				archived: r.archived,
				sort: r.sort,
			} as Category;
		case "groups":
			return {
				id: r.id,
				name: r.name,
				icon: r.icon,
				budget: num(r.budget),
				inMonthly: r.in_monthly,
				finished: r.finished,
				createdAt: r.created_at,
			} as Group;
		case "txns":
			return {
				id: r.id,
				kind: r.kind,
				amount: Number(r.amount),
				account: r.account_id,
				toAccount: r.to_account_id,
				category: r.category_id,
				group: r.group_id,
				payee: r.payee,
				note: r.note,
				at: new Date(r.at as string).toISOString(),
				recurring: r.recurring_id,
			} as Txn;
		case "recurring":
			return {
				id: r.id,
				kind: r.kind,
				amount: Number(r.amount),
				account: r.account_id,
				toAccount: r.to_account_id,
				category: r.category_id,
				group: r.group_id,
				payee: r.payee,
				freq: r.freq,
				every: r.every,
				startOn: r.start_on,
				nextOn: r.next_on,
				autoPost: r.auto_post,
				active: r.active,
			} as Recurring;
	}
}

/* ── Outbox ───────────────────────────────────────────────────── */

const OUTBOX = "oryn:outbox";
const SYNCED_USER = "oryn:synced-user";

let outbox: (Change & { tries?: number })[] = (() => {
	if (typeof window === "undefined") return [];
	try {
		return JSON.parse(window.localStorage.getItem(OUTBOX) ?? "[]");
	} catch {
		return [];
	}
})();

function saveOutbox() {
	try {
		window.localStorage.setItem(OUTBOX, JSON.stringify(outbox));
	} catch {
		/* ignored */
	}
	set({ pending: outbox.length });
}

function enqueue(changes: Change[]) {
	outbox.push(...changes);
	saveOutbox();
	void flush();
}

const isNetwork = (e: { message?: string } | null) =>
	!navigator.onLine ||
	/fetch|network|Failed to fetch|timeout/i.test(e?.message ?? "");

let flushing = false;
async function flush() {
	const sb = supabase;
	const userId = syncStore.state.userId;
	if (!sb || !userId || flushing) return;
	flushing = true;
	try {
		while (outbox.length) {
			const c = outbox[0] as Change & { tries?: number };
			set({ status: "syncing" });
			const q = sb.from(TABLE[c.table]);
			const { error } =
				c.op === "upsert"
					? await q.upsert(toRow(c.table, c.row, userId), {
							onConflict: "user_id,id",
						})
					: await q.delete().eq("user_id", userId).eq("id", c.id);
			if (error) {
				if (isNetwork(error)) {
					set({ status: "offline" });
					return;
				}
				c.tries = (c.tries ?? 0) + 1;
				// A change the server keeps refusing is dropped after 3 tries so it
				// can't block everything behind it. The reason is shown in Settings.
				if (c.tries < 3) {
					saveOutbox();
					set({ status: "error", error: error.message });
					return;
				}
				set({ error: error.message });
			}
			outbox.shift();
			saveOutbox();
		}
		set({ status: "synced", lastSync: Date.now(), error: null });
	} finally {
		flushing = false;
	}
}

/* ── Pull ─────────────────────────────────────────────────────── */

async function fetchAll(table: Table, userId: string) {
	const sb = supabase;
	if (!sb) return [];
	const rows: Row[] = [];
	const page = 1000;
	for (let from = 0; ; from += page) {
		const { data, error } = await sb
			.from(TABLE[table])
			.select("*")
			.eq("user_id", userId)
			.range(from, from + page - 1);
		if (error) throw error;
		rows.push(...(data ?? []));
		if (!data || data.length < page) break;
	}
	return rows.map((r) => fromRow(table, r));
}

async function fetchBook(userId: string): Promise<Book> {
	const [accounts, categories, groups, recurring, txns] = await Promise.all(
		ORDER.map((t) => fetchAll(t, userId)),
	);
	return { accounts, categories, groups, recurring, txns } as Book;
}

/** Lays changes that haven't reached the server yet over a pulled copy. */
function withPending(book: Book): Book {
	const next = { ...book } as Record<Table, { id: string }[]>;
	for (const c of outbox) {
		const list = next[c.table];
		if (c.op === "delete") next[c.table] = list.filter((x) => x.id !== c.id);
		else {
			const row = c.row as { id: string };
			const i = list.findIndex((x) => x.id === row.id);
			next[c.table] =
				i === -1 ? [row, ...list] : list.map((x, j) => (j === i ? row : x));
		}
	}
	return next as unknown as Book;
}

let lastPull = 0;
async function pull() {
	const userId = syncStore.state.userId;
	if (!userId) return;
	try {
		set({ status: "syncing" });
		await flush();
		const server = await fetchBook(userId);
		replaceBook(withPending(server));
		await pullProfile(userId);
		lastPull = Date.now();
		set({
			status: outbox.length ? "syncing" : "synced",
			lastSync: Date.now(),
			error: null,
		});
	} catch (e) {
		set({
			status: isNetwork(e as Error) ? "offline" : "error",
			error: (e as Error).message,
		});
	}
}

/**
 * First sign-in on this phone: anything you logged before signing in is added to
 * your account. If the account already has data (another phone), only your own
 * entries go up, plus any default category or account they need.
 */
async function firstSync(userId: string) {
	const server = await fetchBook(userId);
	const local = bookStore.state;
	const serverEmpty =
		server.accounts.length === 0 && server.categories.length === 0;
	const defaultIds = new Set(
		[...DEFAULT_ACCOUNTS, ...DEFAULT_CATEGORIES].map((x) => x.id),
	);
	const has = (t: Table, id: string) =>
		(server[t] as { id: string }[]).some((x) => x.id === id);

	const needed = new Set<string>();
	for (const t of [...local.txns, ...local.recurring]) {
		needed.add(t.account);
		if (t.toAccount) needed.add(t.toAccount);
		if (t.category) needed.add(t.category);
	}

	const uploads: Change[] = [];
	for (const table of ORDER) {
		for (const row of local[table] as { id: string }[]) {
			if (has(table, row.id)) continue;
			const isDefault =
				(table === "accounts" || table === "categories") &&
				defaultIds.has(row.id);
			if (!serverEmpty && isDefault && !needed.has(row.id)) continue;
			uploads.push({ table, op: "upsert", row } as Change);
		}
	}
	outbox = [...uploads, ...outbox];
	saveOutbox();
	try {
		window.localStorage.setItem(SYNCED_USER, userId);
	} catch {
		/* ignored */
	}
	replaceBook(withPending(server));
	await flush();
}

/* ── Settings that follow you (currency, number format) ─────────── */

let applyingProfile = false;
async function pullProfile(userId: string) {
	const sb = supabase;
	if (!sb) return;
	const { data } = await sb
		.from("profiles")
		.select("settings")
		.eq("user_id", userId)
		.maybeSingle();
	const s = (data?.settings ?? null) as {
		currency?: string;
		numberLocale?: string | null;
	} | null;
	if (!s) return pushProfile();
	applyingProfile = true;
	setPrefs({
		...(s.currency ? { currency: s.currency } : {}),
		...(s.numberLocale !== undefined ? { numberLocale: s.numberLocale } : {}),
	});
	applyingProfile = false;
}

async function pushProfile() {
	const sb = supabase;
	const userId = syncStore.state.userId;
	if (!sb || !userId || applyingProfile) return;
	const { currency, numberLocale } = prefsStore.state;
	await sb
		.from("profiles")
		.upsert(
			{ user_id: userId, settings: { currency, numberLocale } },
			{ onConflict: "user_id" },
		);
}

/* ── Session ──────────────────────────────────────────────────── */

async function onSession(session: Session | null) {
	if (!session) {
		set({ status: "signed-out", email: null, userId: null });
		return;
	}
	const userId = session.user.id;
	const known = syncStore.state.userId === userId;
	set({ email: session.user.email ?? null, userId });
	if (known) return;
	let syncedUser: string | null = null;
	try {
		syncedUser = window.localStorage.getItem(SYNCED_USER);
	} catch {
		/* ignored */
	}
	try {
		set({ status: "syncing" });
		if (syncedUser === userId) await pull();
		else await firstSync(userId);
		await pullProfile(userId);
		set({ status: outbox.length ? "syncing" : "synced", lastSync: Date.now() });
	} catch (e) {
		set({
			status: isNetwork(e as Error) ? "offline" : "error",
			error: (e as Error).message,
		});
	}
}

let started = false;
/** Call once on app start (client only). */
export function startSync() {
	const sb = supabase;
	if (started || !sb || typeof window === "undefined") return;
	started = true;
	setPusher((changes) => {
		if (syncStore.state.userId) enqueue(changes);
	});
	set({ pending: outbox.length });
	sb.auth.getSession().then(({ data }) => onSession(data.session));
	sb.auth.onAuthStateChange((event, session) => {
		if (event === "SIGNED_OUT") return void onSignedOut();
		if (event === "SIGNED_IN" || event === "INITIAL_SESSION")
			void onSession(session);
	});
	window.addEventListener("online", () => void flush());
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return;
		if (Date.now() - lastPull > 60_000) void pull();
		else void flush();
	});
	let lastCurrency = `${prefsStore.state.currency}|${prefsStore.state.numberLocale}`;
	prefsStore.subscribe(() => {
		const now = `${prefsStore.state.currency}|${prefsStore.state.numberLocale}`;
		if (now !== lastCurrency) {
			lastCurrency = now;
			void pushProfile();
		}
	});
}

/** Retry now (from Settings). */
export const syncNow = () => pull();

function onSignedOut() {
	// Your data stays in your account; this phone forgets it.
	outbox = [];
	saveOutbox();
	try {
		window.localStorage.removeItem(SYNCED_USER);
	} catch {
		/* ignored */
	}
	replaceBook(emptyBook());
	set({
		status: "signed-out",
		email: null,
		userId: null,
		lastSync: null,
		error: null,
	});
}

/* ── Sign-in ──────────────────────────────────────────────────── */

const need = () => {
	if (!supabase) throw new Error("Sync isn't set up yet.");
	return supabase;
};

/**
 * Emails a sign-in link, plus a 6-digit code when the email template includes
 * {{ .Token }} (needs custom SMTP). Creates the account on first use.
 */
export async function sendCode(email: string) {
	const { error } = await need().auth.signInWithOtp({
		email,
		options: {
			shouldCreateUser: true,
			emailRedirectTo: window.location.origin,
		},
	});
	if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
	const { error } = await need().auth.verifyOtp({
		email,
		token,
		type: "email",
	});
	if (error) throw error;
}

export async function signInWithPassword(email: string, password: string) {
	const { error } = await need().auth.signInWithPassword({ email, password });
	if (error) throw error;
}

/**
 * Creates an account with a password. Returns true when signed in straight away;
 * false when Supabase wants the email confirmed first (it sends a link).
 */
export async function signUpWithPassword(email: string, password: string) {
	const { data, error } = await need().auth.signUp({
		email,
		password,
		options: { emailRedirectTo: window.location.origin },
	});
	if (error) throw error;
	// An existing address comes back with no identities instead of an error.
	if (data.user && data.user.identities?.length === 0)
		throw new Error("User already registered");
	return Boolean(data.session);
}

/** Sets or changes the password for the signed-in account. */
export async function setPassword(password: string) {
	const { error } = await need().auth.updateUser({ password });
	if (error) throw error;
}

/** Signs out. With unsent changes, the caller should warn first. */
export async function signOut() {
	await need().auth.signOut();
}
