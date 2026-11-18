import { Store } from "@tanstack/react-store";
import { useBook } from "./book";
import type { Group, Txn } from "./model";
import type { Minor } from "./money";

/**
 * Groups: a project or event you spend on over time (a wedding, a renovation, a
 * trip), tracked on its own. They live in the book (lib/book) with everything else.
 */

export {
	createGroup,
	deleteGroup,
	restoreGroup,
	updateGroup,
} from "./book";
export type { Group, GroupIcon } from "./model";

export const GROUP_ICONS = [
	"wedding",
	"renovation",
	"home",
	"travel",
	"party",
	"baby",
	"study",
	"car",
	"health",
	"gift",
	"work",
	"other",
] as const;

export function useGroups(): Group[] {
	return useBook().groups;
}

/** Entries that belong in monthly numbers: ungrouped, or in a group that counts. */
export function monthlyEntries(entries: Txn[], groups: Group[]) {
	const outside = new Set(groups.filter((g) => !g.inMonthly).map((g) => g.id));
	return entries.filter((e) => !e.group || !outside.has(e.group));
}

export type GroupSummary = {
	group: Group;
	spent: Minor;
	count: number;
	last: string | null;
};

/** A group's spending: its expenses, less any refunds (income) filed in it. */
export function summarizeGroups(
	entries: Txn[],
	groups: Group[],
): GroupSummary[] {
	return groups.map((group) => {
		let spent = 0;
		let count = 0;
		let last: string | null = null;
		for (const e of entries) {
			if (e.group !== group.id || e.kind === "transfer") continue;
			spent += e.kind === "income" ? -e.amount : e.amount;
			count++;
			if (!last || e.at > last) last = e.at;
		}
		return { group, spent, count, last };
	});
}

/* ── Opening quick add with a group already chosen ─────────────── */

export const quickAddStore = new Store<{
	open: boolean;
	group: string | null;
	/** Editing an existing transaction instead of adding one. */
	edit: Txn | null;
}>({ open: false, group: null, edit: null });

export function openQuickAdd(group: string | null = null) {
	quickAddStore.setState(() => ({ open: true, group, edit: null }));
}

/** Opens the add sheet on an existing transaction, to change or delete it. */
export function openEdit(txn: Txn) {
	quickAddStore.setState(() => ({
		open: true,
		group: txn.group ?? null,
		edit: txn,
	}));
}

export function closeQuickAdd() {
	quickAddStore.setState((s) => ({ ...s, open: false }));
}
