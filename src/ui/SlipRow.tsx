import { useLookups } from "#/lib/book";
import type { Txn } from "#/lib/model";
import { cn } from "#/lib/utils";
import { Amount } from "./Amount";
import { CategoryBadge, TransferBadge } from "./Icon";

const time = new Intl.DateTimeFormat("en-IN", {
	hour: "numeric",
	minute: "2-digit",
});

/**
 * One transaction: icon, payee, what and how, amount. Income shows with a plus
 * in green, a transfer shows where the money moved. A just-saved one glows.
 */
export function SlipRow({
	entry,
	fresh,
	meta,
	hideGroup,
	onOpen,
}: {
	entry: Txn;
	fresh?: boolean;
	meta?: string;
	/** Inside a group's own screen the tag would repeat itself. */
	hideGroup?: boolean;
	/** Tapping the row opens it for editing. */
	onOpen?: (t: Txn) => void;
}) {
	const look = useLookups();
	const cat = entry.category ? look.category.get(entry.category) : undefined;
	const from = look.account.get(entry.account);
	const to = entry.toAccount ? look.account.get(entry.toAccount) : undefined;
	const group =
		!hideGroup && entry.group ? look.group.get(entry.group) : undefined;
	const when = meta ?? time.format(new Date(entry.at));
	const transfer = entry.kind === "transfer";
	const income = entry.kind === "income";

	const detail = transfer
		? `${from?.name ?? "Account"} to ${to?.name ?? "account"}`
		: [
				cat?.name ?? (income ? "Income" : "Uncategorised"),
				group?.name,
				from?.name,
			]
				.filter(Boolean)
				.join(" · ");

	const body = (
		<>
			{transfer ? <TransferBadge /> : <CategoryBadge category={cat} />}
			<span className="min-w-0">
				<span className="block truncate text-base font-medium">
					{entry.payee || (transfer ? "Transfer" : cat?.name)}
				</span>
				<span className="block truncate text-xs text-muted">
					{detail} · {when}
				</span>
			</span>
			<Amount
				value={entry.amount}
				sign={income}
				className={cn(
					"text-base font-semibold",
					income && "text-positive",
					transfer && "font-medium text-muted",
				)}
			/>
		</>
	);

	const grid =
		"grid min-h-[3.75rem] w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 text-left";

	return (
		<li
			data-fresh={fresh ? "true" : undefined}
			className="relative after:absolute after:right-0 after:bottom-0 after:left-[3.25rem] after:h-px after:bg-rule last:after:hidden"
		>
			{onOpen ? (
				<button
					type="button"
					onClick={() => onOpen(entry)}
					className={cn(grid, "active:opacity-70")}
				>
					{body}
				</button>
			) : (
				<div className={grid}>{body}</div>
			)}
		</li>
	);
}
