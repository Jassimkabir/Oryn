import {
	ArrowDown01Icon,
	Calendar03Icon,
	Delete02Icon,
	Folder01Icon,
	MinusSignIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { useStore } from "@tanstack/react-store";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { addTxn, bookStore, removeTxn, updateTxn, useBook } from "#/lib/book";
import { quickAddStore } from "#/lib/groups";
import { type Kind, type Txn, ymd } from "#/lib/model";
import { evaluateEntry, formatMoney, moneyParts, toMajor } from "#/lib/money";
import { cn, haptic } from "#/lib/utils";
import { useMoneyFormat } from "./Amount";
import {
	ACCOUNT_ICON,
	accountColor,
	CATEGORY_ICON,
	GROUP_ICON,
	groupColor,
	Icon,
} from "./Icon";
import { Sheet } from "./Sheet";

const LAST = "oryn:last-pick";

const KEYS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	".",
	"0",
	"back",
] as const;

const KINDS: { value: Kind; label: string }[] = [
	{ value: "expense", label: "Expense" },
	{ value: "income", label: "Income" },
	{ value: "transfer", label: "Transfer" },
];

type Last = Partial<
	Record<Kind, { category?: string; account?: string; to?: string }>
>;
const readLast = (): Last => {
	try {
		return JSON.parse(window.localStorage.getItem(LAST) ?? "{}");
	} catch {
		return {};
	}
};

const dayFmt = new Intl.DateTimeFormat("en-IN", {
	day: "numeric",
	month: "short",
});
function dateLabel(d: string) {
	const today = ymd(new Date());
	const y = new Date();
	y.setDate(y.getDate() - 1);
	if (d === today) return "Today";
	if (d === ymd(y)) return "Yesterday";
	const [yy, mm, dd] = d.split("-").map(Number) as [number, number, number];
	return dayFmt.format(new Date(yy, mm - 1, dd));
}

/** Quick add: opens straight onto the number pad. Target: an expense in ~3 seconds. */
export function QuickAdd({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const f = useMoneyFormat();
	const book = useBook();
	const { group: presetGroup, edit } = useStore(quickAddStore, (s) => s);

	const [kind, setKind] = useState<Kind>("expense");
	const [expr, setExpr] = useState("");
	const [category, setCategory] = useState<string | null>(null);
	const [account, setAccount] = useState<string>("");
	const [toAccount, setToAccount] = useState<string>("");
	const [group, setGroup] = useState<string | null>(null);
	const [payee, setPayee] = useState("");
	const [date, setDate] = useState(ymd(new Date()));
	const [picking, setPicking] = useState<null | "account" | "group">(null);

	const accounts = book.accounts
		.filter((a) => !a.archived)
		.sort((a, b) => a.sort - b.sort);
	const cats = book.categories
		.filter(
			(c) =>
				c.kind === (kind === "income" ? "income" : "expense") && !c.archived,
		)
		.sort((a, b) => a.sort - b.sort);
	const groups = book.groups.filter((g) => !g.finished || g.id === group);
	const currentGroup = groups.find((g) => g.id === group);
	const currentAccount = accounts.find((a) => a.id === account) ?? accounts[0];

	// Reset when opened: a fresh slip, or the transaction being edited.
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs on open only
	useEffect(() => {
		if (!open) return;
		setPicking(null);
		if (edit) {
			setKind(edit.kind);
			setExpr(String(toMajor(edit.amount, f.currency)));
			setCategory(edit.category ?? null);
			setAccount(edit.account);
			setToAccount(edit.toAccount ?? "");
			setGroup(edit.group ?? null);
			setPayee(edit.payee);
			setDate(ymd(new Date(edit.at)));
			return;
		}
		setKind("expense");
		setExpr("");
		setPayee("");
		setGroup(presetGroup);
		setDate(ymd(new Date()));
		applyDefaults("expense");
	}, [open, edit, presetGroup]);

	function applyDefaults(k: Kind) {
		const last = readLast()[k] ?? {};
		const live = bookStore.state;
		const okAcct = (id?: string) =>
			id && live.accounts.some((a) => a.id === id && !a.archived)
				? id
				: undefined;
		const first = accounts[0]?.id ?? "";
		setAccount(okAcct(last.account) ?? first);
		setToAccount(
			okAcct(last.to) ?? accounts.find((a) => a.id !== first)?.id ?? "",
		);
		const catKind = k === "income" ? "income" : "expense";
		const okCat =
			last.category &&
			live.categories.some(
				(c) => c.id === last.category && c.kind === catKind && !c.archived,
			)
				? last.category
				: live.categories.find((c) => c.kind === catKind && !c.archived)?.id;
		setCategory(k === "transfer" ? null : (okCat ?? null));
	}

	function switchKind(k: Kind) {
		if (k === kind) return;
		haptic("tap");
		setKind(k);
		setPicking(null);
		applyDefaults(k);
	}

	const total = evaluateEntry(expr, f.currency);
	const symbol = moneyParts(0, f).symbol;
	const fromId = currentAccount?.id ?? "";
	const transferInvalid =
		kind === "transfer" && (!toAccount || toAccount === fromId);
	const canSave = Boolean(total) && Boolean(fromId) && !transferInvalid;

	function press(k: string) {
		haptic("tap");
		setExpr((e) => {
			if (k === "back") return e.slice(0, -1);
			if (k === "+" || k === "−")
				return /[+−]$/.test(e) || e === "" ? e : e + k;
			if (k === ".") {
				const term = e.split(/[+−]/).pop() ?? "";
				return term.includes(".") ? e : `${e || "0"}.`;
			}
			const term = e.split(/[+−]/).pop() ?? "";
			const [, dec] = term.split(".");
			if (dec !== undefined && dec.length >= 2) return e;
			if (term.replace(".", "").length >= 10) return e;
			return e + k;
		});
	}

	useEffect(() => {
		if (!open) return;
		function onKey(ev: KeyboardEvent) {
			if (ev.target instanceof HTMLInputElement) return;
			if (/^[0-9.]$/.test(ev.key)) press(ev.key);
			else if (ev.key === "+") press("+");
			else if (ev.key === "-") press("−");
			else if (ev.key === "Backspace") press("back");
			else if (ev.key === "Enter") save();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	function save() {
		if (!canSave || !total) {
			haptic("error");
			return;
		}
		const cat = book.categories.find((c) => c.id === category);
		const to = book.accounts.find((a) => a.id === toAccount);
		// Keep the time of day for today; other days get midday.
		const [y, m, d] = date.split("-").map(Number) as [number, number, number];
		const now = new Date();
		const at =
			edit && ymd(new Date(edit.at)) === date
				? edit.at
				: date === ymd(now)
					? now.toISOString()
					: new Date(y, m - 1, d, 12, 0).toISOString();
		const data: Omit<Txn, "id"> = {
			kind,
			amount: total,
			account: fromId,
			toAccount: kind === "transfer" ? toAccount : null,
			category: kind === "transfer" ? null : category,
			group: kind === "transfer" ? null : (currentGroup?.id ?? null),
			payee:
				payee.trim() ||
				(kind === "transfer"
					? `To ${to?.name ?? "account"}`
					: (cat?.name ?? "Expense")),
			at,
			recurring: edit?.recurring ?? null,
			note: edit?.note ?? null,
		};
		try {
			const last = readLast();
			last[kind] = {
				category: category ?? undefined,
				account: fromId,
				to: toAccount || undefined,
			};
			window.localStorage.setItem(LAST, JSON.stringify(last));
		} catch {
			/* ignored */
		}
		haptic("success");
		onOpenChange(false);
		if (edit) {
			const before = edit;
			updateTxn({ ...data, id: edit.id });
			toast("Changes saved", {
				action: { label: "Undo", onClick: () => updateTxn(before) },
			});
			return;
		}
		const saved = addTxn(data);
		const amount = formatMoney(total, f);
		const msg =
			kind === "transfer"
				? `${amount} moved to ${to?.name ?? "account"}`
				: kind === "income"
					? `${amount} received${cat ? ` as ${cat.name}` : ""}`
					: `${amount} added to ${cat?.name ?? "expenses"}${currentGroup ? ` in ${currentGroup.name}` : ""}`;
		toast(msg, {
			action: { label: "Undo", onClick: () => removeTxn(saved.id) },
		});
	}

	function remove() {
		if (!edit) return;
		const before = edit;
		removeTxn(edit.id);
		haptic("success");
		onOpenChange(false);
		toast("Deleted", {
			action: { label: "Undo", onClick: () => addTxn(before) },
		});
	}

	const accountName = currentAccount?.name ?? "Add an account";

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={edit ? "Edit transaction" : "Add a transaction"}
		>
			<div className="px-5 pt-1">
				<div className="flex items-center gap-2">
					<fieldset className="grid min-w-0 flex-1 grid-cols-3 gap-0.5 rounded-full border-0 bg-well p-0.5">
						<legend className="sr-only">Kind</legend>
						{KINDS.map((k) => (
							<label
								key={k.value}
								className={cn(
									"grid h-8 cursor-pointer place-items-center rounded-full text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
									kind === k.value
										? "bg-[var(--glass-thick)] font-semibold text-ink shadow-[0_1px_4px_oklch(0_0_0/0.14)]"
										: "font-medium text-muted",
								)}
							>
								<input
									type="radio"
									name="txn-kind"
									value={k.value}
									checked={kind === k.value}
									onChange={() => switchKind(k.value)}
									className="sr-only"
								/>
								{k.label}
							</label>
						))}
					</fieldset>
					{edit && (
						<button
							type="button"
							onClick={remove}
							aria-label="Delete this transaction"
							className="pressable grid size-9 shrink-0 place-items-center rounded-full bg-well text-negative"
						>
							<Icon icon={Delete02Icon} size={18} />
						</button>
					)}
				</div>

				<div className="mt-2 flex min-h-[3.5rem] items-baseline justify-between gap-3">
					<output
						aria-live="polite"
						className={cn(
							"num block min-w-0 truncate text-[3rem] leading-tight font-light tracking-[-0.045em]",
							kind === "income" && expr && "text-positive",
						)}
					>
						<span className="mr-1 align-[0.6em] text-[0.42em] font-normal text-muted">
							{kind === "income" ? `+${symbol}` : symbol}
						</span>
						{expr || <span className="text-muted">0</span>}
					</output>
					{expr.match(/[+−]/) && total ? (
						<p className="num shrink-0 text-sm font-medium text-muted">
							= {formatMoney(total, f)}
						</p>
					) : null}
				</div>

				{kind === "transfer" ? (
					<ChipRow legend="To account">
						<span
							aria-hidden
							className="self-center pr-0.5 text-xs font-semibold text-muted"
						>
							To
						</span>
						{accounts
							.filter((a) => a.id !== fromId)
							.map((a) => (
								<Chip
									key={a.id}
									on={toAccount === a.id}
									onPick={() => setToAccount(a.id)}
									icon={ACCOUNT_ICON[a.kind]}
								>
									{a.name}
								</Chip>
							))}
						{accounts.length < 2 && (
							<p className="py-2 text-sm text-muted">
								Add a second account in Settings to move money between them.
							</p>
						)}
					</ChipRow>
				) : (
					<ChipRow legend="Category">
						{cats.map((c) => (
							<Chip
								key={c.id}
								on={category === c.id}
								onPick={() => setCategory(c.id)}
								icon={CATEGORY_ICON[c.icon]}
							>
								{c.name}
							</Chip>
						))}
					</ChipRow>
				)}

				{/* Account, group and date, one tap each. */}
				<div
					data-no-drag
					className="scroll-fade -mx-5 flex min-w-0 touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain px-5 py-1 [scrollbar-width:none]"
				>
					<Pill
						expanded={picking === "account"}
						onClick={() => setPicking(picking === "account" ? null : "account")}
						icon={
							currentAccount ? ACCOUNT_ICON[currentAccount.kind] : Folder01Icon
						}
						color={
							currentAccount ? accountColor(currentAccount.kind) : undefined
						}
					>
						{kind === "income" ? `Into ${accountName}` : `From ${accountName}`}
					</Pill>
					{kind !== "transfer" && book.groups.some((g) => !g.finished) && (
						<Pill
							expanded={picking === "group"}
							onClick={() => setPicking(picking === "group" ? null : "group")}
							icon={currentGroup ? GROUP_ICON[currentGroup.icon] : Folder01Icon}
							color={currentGroup ? groupColor(currentGroup.icon) : undefined}
						>
							{currentGroup ? currentGroup.name : "Add to a group"}
						</Pill>
					)}
					<label className="pressable relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-well px-2.5 text-xs font-semibold text-muted has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]">
						<Icon icon={Calendar03Icon} size={15} stroke={1.9} />
						{dateLabel(date)}
						<input
							type="date"
							value={date}
							max={ymd(new Date())}
							onChange={(e) => e.target.value && setDate(e.target.value)}
							aria-label="Date"
							className="absolute inset-0 cursor-pointer opacity-0"
						/>
					</label>
				</div>

				{picking === "account" && (
					<ChipRow legend="Account">
						{accounts.map((a) => (
							<Chip
								key={a.id}
								on={a.id === fromId}
								onPick={() => {
									setAccount(a.id);
									if (toAccount === a.id) setToAccount("");
									setPicking(null);
								}}
								icon={ACCOUNT_ICON[a.kind]}
							>
								{a.name}
							</Chip>
						))}
					</ChipRow>
				)}
				{picking === "group" && (
					<ChipRow legend="Group">
						<Chip
							on={!currentGroup}
							onPick={() => {
								setGroup(null);
								setPicking(null);
							}}
						>
							No group
						</Chip>
						{groups
							.filter((g) => !g.finished)
							.map((g) => (
								<Chip
									key={g.id}
									on={g.id === currentGroup?.id}
									onPick={() => {
										setGroup(g.id);
										setPicking(null);
									}}
									icon={GROUP_ICON[g.icon]}
								>
									{g.name}
								</Chip>
							))}
					</ChipRow>
				)}

				<label className="mt-1.5 block">
					<span className="sr-only">
						{kind === "income"
							? "From"
							: kind === "transfer"
								? "Note"
								: "Paid to"}
					</span>
					<input
						value={payee}
						onChange={(e) => setPayee(e.target.value)}
						placeholder={
							kind === "income"
								? "From"
								: kind === "transfer"
									? "Note"
									: "Paid to"
						}
						autoComplete="off"
						enterKeyHint="done"
						maxLength={200}
						className="h-12 w-full rounded-[var(--radius-row)] bg-well px-4 text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--stamp)]"
					/>
				</label>
			</div>

			<div className="mt-3 grid grid-cols-[1fr_1fr_1fr_4.5rem] gap-1.5 px-3">
				<div className="col-span-3 grid grid-cols-3 gap-1.5">
					{KEYS.map((k) => (
						<button
							type="button"
							key={k}
							onClick={() => press(k)}
							aria-label={
								k === "back" ? "Delete" : k === "." ? "Decimal point" : k
							}
							className="pressable num grid h-14 place-items-center rounded-[0.75rem] text-[1.625rem] font-light active:bg-well hover:bg-well"
						>
							{k === "back" ? <BackspaceGlyph /> : k}
						</button>
					))}
				</div>
				<div className="grid grid-rows-[3.5rem_3.5rem_1fr] gap-1.5">
					<button
						type="button"
						onClick={() => press("+")}
						aria-label="Add"
						className="pressable grid place-items-center rounded-[var(--radius-row)] bg-well text-ink"
					>
						<Icon icon={PlusSignIcon} size={22} stroke={1.8} />
					</button>
					<button
						type="button"
						onClick={() => press("−")}
						aria-label="Subtract"
						className="pressable grid place-items-center rounded-[var(--radius-row)] bg-well text-ink"
					>
						<Icon icon={MinusSignIcon} size={22} stroke={1.8} />
					</button>
					<button
						type="button"
						onClick={save}
						disabled={!canSave}
						className="btn-stamp pressable rounded-[var(--radius-row)] text-base font-semibold disabled:opacity-45 disabled:shadow-none"
					>
						Save
					</button>
				</div>
			</div>
		</Sheet>
	);
}

function ChipRow({
	legend,
	children,
}: {
	legend: string;
	children: ReactNode;
}) {
	return (
		<fieldset
			data-no-drag
			className="scroll-fade -mx-5 mt-1 flex min-w-0 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain border-0 px-5 py-2 [scrollbar-width:none]"
		>
			<legend className="sr-only">{legend}</legend>
			{children}
		</fieldset>
	);
}

function Chip({
	on,
	onPick,
	icon,
	children,
}: {
	on: boolean;
	onPick: () => void;
	icon?: Parameters<typeof Icon>[0]["icon"];
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={() => {
				haptic("tap");
				onPick();
			}}
			className={cn(
				"pressable inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full text-sm font-medium",
				icon ? "pr-3.5 pl-3" : "px-3.5",
				on
					? "btn-stamp shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]"
					: "bg-well text-ink",
			)}
		>
			{icon && <Icon icon={icon} size={17} stroke={1.8} />}
			{children}
		</button>
	);
}

function Pill({
	expanded,
	onClick,
	icon,
	color,
	children,
}: {
	expanded: boolean;
	onClick: () => void;
	icon: Parameters<typeof Icon>[0]["icon"];
	color?: string;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-expanded={expanded}
			onClick={() => {
				haptic("tap");
				onClick();
			}}
			className={cn(
				"pressable inline-flex h-8 max-w-[14rem] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
				!color && "bg-well text-muted",
			)}
			style={
				color
					? {
							color,
							background: `color-mix(in oklch, ${color} 16%, transparent)`,
						}
					: undefined
			}
		>
			<Icon icon={icon} size={15} stroke={1.9} />
			<span className="truncate">{children}</span>
			<Icon
				icon={ArrowDown01Icon}
				size={13}
				stroke={2.2}
				className={cn(
					"transition-transform duration-200",
					expanded && "rotate-180",
				)}
			/>
		</button>
	);
}

/** Backspace key, drawn to match Hugeicons stroke-rounded. */
function BackspaceGlyph() {
	return (
		<svg
			aria-hidden="true"
			width="26"
			height="26"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.6"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M8.6 5h9.4A3 3 0 0 1 21 8v8a3 3 0 0 1-3 3H8.6a3 3 0 0 1-2.2-1L2.6 13.4a2 2 0 0 1 0-2.8L6.4 6a3 3 0 0 1 2.2-1Z" />
			<path d="m11 9.5 5 5M16 9.5l-5 5" />
		</svg>
	);
}
