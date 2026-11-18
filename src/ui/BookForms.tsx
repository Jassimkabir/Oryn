import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	removeAccount,
	removeCategory,
	removeRecurring,
	saveAccount,
	saveCategory,
	saveRecurring,
	useBook,
} from "#/lib/book";
import {
	ACCOUNT_KINDS,
	type Account,
	type AccountKind,
	CATEGORY_ICONS,
	type Category,
	type CategoryIcon,
	COLOR_KEYS,
	type ColorKey,
	FREQS,
	type Freq,
	type Kind,
	newId,
	type Recurring,
	ymd,
} from "#/lib/model";
import { toMajor } from "#/lib/money";
import { nextAfter } from "#/lib/recurring";
import { cn, haptic } from "#/lib/utils";
import { useMoneyFormat } from "./Amount";
import {
	Choices,
	Field,
	FormActions,
	FormHead,
	fieldClass,
	readMoney,
	SwitchField,
} from "./Form";
import {
	ACCOUNT_ICON,
	ACCOUNT_LABEL,
	CATEGORY_ICON,
	colorVar,
	Icon,
} from "./Icon";
import { Sheet } from "./Sheet";

const major = (v: number, currency: string) => String(toMajor(v, currency));

/* ── Accounts ─────────────────────────────────────────────────── */

export function AccountForm({
	open,
	onOpenChange,
	account,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	account?: Account;
}) {
	const f = useMoneyFormat();
	const book = useBook();
	const [name, setName] = useState("");
	const [kind, setKind] = useState<AccountKind>("bank");
	const [opening, setOpening] = useState("");

	useEffect(() => {
		if (!open) return;
		setName(account?.name ?? "");
		setKind(account?.kind ?? "bank");
		setOpening(
			account?.opening ? major(Math.abs(account.opening), f.currency) : "",
		);
	}, [open, account, f.currency]);

	const card = kind === "card";
	const money = readMoney(opening, f.currency);
	const canSave = name.trim().length > 0 && !money.invalid;

	function save() {
		if (!canSave) return haptic("error");
		const amount = money.value ?? 0;
		saveAccount({
			id: account?.id ?? newId(),
			name: name.trim(),
			kind,
			// A card's opening figure is what you owe, so it counts against you.
			opening: card ? -amount : amount,
			archived: false,
			sort: account?.sort ?? book.accounts.length,
		});
		haptic("success");
		onOpenChange(false);
	}

	function remove() {
		if (!account) return;
		const result = removeAccount(account.id);
		onOpenChange(false);
		toast(
			result === "archived"
				? `${account.name} hidden. Its history is kept.`
				: `${account.name} deleted`,
			{ action: { label: "Undo", onClick: () => saveAccount(account) } },
		);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={account ? "Edit account" : "New account"}
		>
			<form
				className="px-5 pt-1"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<FormHead
					title={account ? "Edit account" : "New account"}
					note="Where your money sits: a bank account, a card, cash or a wallet."
				/>
				<Field label="Name">
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="HDFC savings"
						autoComplete="off"
						maxLength={80}
						className={fieldClass}
					/>
				</Field>
				<Choices
					legend="Type"
					value={kind}
					onChange={setKind}
					options={ACCOUNT_KINDS.map((k) => ({
						value: k,
						label: ACCOUNT_LABEL[k],
						icon: ACCOUNT_ICON[k],
					}))}
				/>
				<Field
					label={card ? "Amount you owe on it now" : "Balance now"}
					hint="Everything you add from here on moves this figure."
					error={money.invalid ? "Use digits only, like 25000." : null}
				>
					<input
						value={opening}
						onChange={(e) => setOpening(e.target.value)}
						placeholder="0"
						inputMode="decimal"
						autoComplete="off"
						aria-invalid={money.invalid || undefined}
						className={cn(fieldClass, "num")}
					/>
				</Field>
				<FormActions
					canSave={canSave}
					label={account ? "Save changes" : "Add account"}
					onDelete={account ? remove : undefined}
				/>
			</form>
		</Sheet>
	);
}

/* ── Categories ───────────────────────────────────────────────── */

export function CategoryForm({
	open,
	onOpenChange,
	category,
	kind: newKind = "expense",
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	category?: Category;
	kind?: "expense" | "income";
}) {
	const f = useMoneyFormat();
	const book = useBook();
	const [name, setName] = useState("");
	const [icon, setIcon] = useState<CategoryIcon>("other");
	const [color, setColor] = useState<ColorKey>("green");
	const [budget, setBudget] = useState("");
	const kind = category?.kind ?? newKind;

	useEffect(() => {
		if (!open) return;
		setName(category?.name ?? "");
		setIcon(category?.icon ?? (newKind === "income" ? "salary" : "other"));
		setColor(category?.color ?? "green");
		setBudget(category?.budget ? major(category.budget, f.currency) : "");
	}, [open, category, newKind, f.currency]);

	const money = readMoney(budget, f.currency);
	const canSave = name.trim().length > 0 && !money.invalid;

	function save() {
		if (!canSave) return haptic("error");
		saveCategory({
			id: category?.id ?? newId(),
			name: name.trim(),
			kind,
			icon,
			color,
			budget: kind === "expense" && money.value ? money.value : null,
			archived: category?.archived ?? false,
			sort: category?.sort ?? book.categories.length,
		});
		haptic("success");
		onOpenChange(false);
	}

	function remove() {
		if (!category) return;
		const result = removeCategory(category.id);
		onOpenChange(false);
		toast(
			result === "archived"
				? `${category.name} hidden. Past entries keep it.`
				: `${category.name} deleted`,
			{ action: { label: "Undo", onClick: () => saveCategory(category) } },
		);
	}

	const title = category
		? "Edit category"
		: kind === "income"
			? "New income category"
			: "New category";

	return (
		<Sheet open={open} onOpenChange={onOpenChange} title={title}>
			<form
				className="px-5 pt-1"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<FormHead title={title} />
				<Field label="Name">
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={kind === "income" ? "Freelance" : "Pets"}
						autoComplete="off"
						maxLength={60}
						className={fieldClass}
					/>
				</Field>

				<fieldset className="mt-4 min-w-0 border-0 p-0">
					<legend className="mb-1.5 text-sm font-medium text-muted">
						Icon
					</legend>
					<div className="grid grid-cols-8 gap-1.5">
						{CATEGORY_ICONS.map((id) => {
							const on = icon === id;
							return (
								<label
									key={id}
									className={cn(
										"pressable grid aspect-square cursor-pointer place-items-center rounded-[0.75rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
										on
											? "shadow-[inset_0_0_0_2px_currentColor]"
											: "bg-well text-muted",
									)}
									style={
										on
											? {
													color: colorVar(color),
													background: `color-mix(in oklch, ${colorVar(color)} 18%, transparent)`,
												}
											: undefined
									}
								>
									<input
										type="radio"
										name="cat-icon"
										value={id}
										checked={on}
										onChange={() => {
											haptic("tap");
											setIcon(id);
										}}
										className="sr-only"
										aria-label={id}
									/>
									<Icon icon={CATEGORY_ICON[id]} size={19} />
								</label>
							);
						})}
					</div>
				</fieldset>

				<fieldset className="mt-4 min-w-0 border-0 p-0">
					<legend className="mb-1.5 text-sm font-medium text-muted">
						Colour
					</legend>
					<div className="flex flex-wrap gap-2.5">
						{COLOR_KEYS.map((c) => (
							<label
								key={c}
								className={cn(
									"pressable size-8 cursor-pointer rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
									color === c &&
										"shadow-[0_0_0_2px_var(--sheet),0_0_0_4px_currentColor]",
								)}
								style={{ background: colorVar(c), color: colorVar(c) }}
							>
								<input
									type="radio"
									name="cat-color"
									value={c}
									checked={color === c}
									onChange={() => setColor(c)}
									className="sr-only"
									aria-label={c}
								/>
							</label>
						))}
					</div>
				</fieldset>

				{kind === "expense" && (
					<Field
						label={
							<>
								Monthly budget <span className="font-normal">(optional)</span>
							</>
						}
						error={money.invalid ? "Use digits only, like 5000." : null}
					>
						<input
							value={budget}
							onChange={(e) => setBudget(e.target.value)}
							placeholder="5,000"
							inputMode="decimal"
							autoComplete="off"
							aria-invalid={money.invalid || undefined}
							className={cn(fieldClass, "num")}
						/>
					</Field>
				)}

				<FormActions
					canSave={canSave}
					label={category ? "Save changes" : "Add category"}
					onDelete={category ? remove : undefined}
				/>
			</form>
		</Sheet>
	);
}

/* ── Recurring payments ───────────────────────────────────────── */

const FREQ_LABEL: Record<Freq, string> = {
	weekly: "Weekly",
	monthly: "Monthly",
	yearly: "Yearly",
};
const UNIT: Record<Freq, [string, string]> = {
	weekly: ["week", "weeks"],
	monthly: ["month", "months"],
	yearly: ["year", "years"],
};

/** "Every month", "Every 3 months". */
export function freqLabel(freq: Freq, every: number) {
	return every === 1
		? `Every ${UNIT[freq][0]}`
		: `Every ${every} ${UNIT[freq][1]}`;
}

export function RecurringForm({
	open,
	onOpenChange,
	recurring,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	recurring?: Recurring;
}) {
	const f = useMoneyFormat();
	const book = useBook();
	const accounts = book.accounts.filter((a) => !a.archived);
	const [kind, setKind] = useState<Kind>("expense");
	const [payee, setPayee] = useState("");
	const [amount, setAmount] = useState("");
	const [category, setCategory] = useState<string | null>(null);
	const [account, setAccount] = useState("");
	const [toAccount, setToAccount] = useState("");
	const [freq, setFreq] = useState<Freq>("monthly");
	const [every, setEvery] = useState("1");
	const [startOn, setStartOn] = useState(ymd(new Date()));
	const [autoPost, setAutoPost] = useState(true);
	const [active, setActive] = useState(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on open only
	useEffect(() => {
		if (!open) return;
		const r = recurring;
		setKind(r?.kind ?? "expense");
		setPayee(r?.payee ?? "");
		setAmount(r ? major(r.amount, f.currency) : "");
		setCategory(r?.category ?? null);
		setAccount(r?.account ?? accounts[0]?.id ?? "");
		setToAccount(r?.toAccount ?? accounts[1]?.id ?? "");
		setFreq(r?.freq ?? "monthly");
		setEvery(String(r?.every ?? 1));
		setStartOn(r?.startOn ?? ymd(new Date()));
		setAutoPost(r?.autoPost ?? true);
		setActive(r?.active ?? true);
	}, [open, recurring]);

	const cats = book.categories.filter(
		(c) => c.kind === (kind === "income" ? "income" : "expense") && !c.archived,
	);
	const money = readMoney(amount, f.currency);
	const n = Math.min(52, Math.max(1, Number.parseInt(every, 10) || 1));
	const canSave =
		payee.trim().length > 0 &&
		Boolean(money.value) &&
		Boolean(account) &&
		(kind !== "transfer" || (toAccount !== "" && toAccount !== account));

	function save() {
		if (!canSave || !money.value) return haptic("error");
		const schedule = { freq, every: n, startOn };
		const scheduleChanged =
			!recurring ||
			recurring.freq !== freq ||
			recurring.every !== n ||
			recurring.startOn !== startOn;
		// From now on, never back-filling the past: the next date on or after today.
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const nextOn =
			scheduleChanged || !recurring
				? nextAfter(schedule, ymd(yesterday))
				: recurring.nextOn;
		saveRecurring({
			id: recurring?.id ?? newId(),
			kind,
			amount: money.value,
			account,
			toAccount: kind === "transfer" ? toAccount : null,
			category: kind === "transfer" ? null : category,
			group: recurring?.group ?? null,
			payee: payee.trim(),
			...schedule,
			nextOn,
			autoPost,
			active,
		});
		haptic("success");
		onOpenChange(false);
	}

	function remove() {
		if (!recurring) return;
		removeRecurring(recurring.id);
		onOpenChange(false);
		toast(`${recurring.payee} deleted. Past payments are kept.`, {
			action: { label: "Undo", onClick: () => saveRecurring(recurring) },
		});
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={recurring ? "Edit recurring payment" : "New recurring payment"}
		>
			<form
				className="px-5 pt-1"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<FormHead
					title={recurring ? "Edit recurring payment" : "New recurring payment"}
					note="Rent, a subscription, an EMI or your salary, added for you when it's due."
				/>
				<Choices
					legend="Kind"
					value={kind}
					onChange={(k) => {
						setKind(k);
						setCategory(null);
					}}
					options={[
						{ value: "expense", label: "Expense" },
						{ value: "income", label: "Income" },
						{ value: "transfer", label: "Transfer" },
					]}
				/>
				<div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
					<Field label="Name">
						<input
							value={payee}
							onChange={(e) => setPayee(e.target.value)}
							placeholder={kind === "income" ? "Salary" : "Netflix"}
							autoComplete="off"
							maxLength={200}
							className={fieldClass}
						/>
					</Field>
					<Field label="Amount">
						<input
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="649"
							inputMode="decimal"
							autoComplete="off"
							aria-invalid={money.invalid || undefined}
							className={cn(fieldClass, "num")}
						/>
					</Field>
				</div>
				{kind !== "transfer" && (
					<Choices
						legend="Category"
						value={category}
						onChange={setCategory}
						options={cats.map((c) => ({
							value: c.id,
							label: c.name,
							icon: CATEGORY_ICON[c.icon],
						}))}
					/>
				)}
				<Choices
					legend={kind === "income" ? "Into" : "From"}
					value={account}
					onChange={setAccount}
					options={accounts.map((a) => ({
						value: a.id,
						label: a.name,
						icon: ACCOUNT_ICON[a.kind],
					}))}
				/>
				{kind === "transfer" && (
					<Choices
						legend="To"
						value={toAccount}
						onChange={setToAccount}
						options={accounts
							.filter((a) => a.id !== account)
							.map((a) => ({
								value: a.id,
								label: a.name,
								icon: ACCOUNT_ICON[a.kind],
							}))}
					/>
				)}
				<Choices
					legend="Repeats"
					value={freq}
					onChange={setFreq}
					options={FREQS.map((x) => ({ value: x, label: FREQ_LABEL[x] }))}
				/>
				<div className="grid grid-cols-2 gap-2">
					<Field label={`Every how many ${UNIT[freq][1]}`}>
						<input
							value={every}
							onChange={(e) => setEvery(e.target.value.replace(/\D/g, ""))}
							inputMode="numeric"
							maxLength={2}
							className={cn(fieldClass, "num")}
						/>
					</Field>
					<Field label="Starting">
						<input
							type="date"
							value={startOn}
							onChange={(e) => e.target.value && setStartOn(e.target.value)}
							className={cn(fieldClass, "num")}
						/>
					</Field>
				</div>
				<SwitchField
					label="Add it automatically"
					note={
						autoPost
							? "Added on the day it's due."
							: "Shows on Overview for you to confirm."
					}
					checked={autoPost}
					onChange={setAutoPost}
				/>
				{recurring && (
					<SwitchField
						label="Active"
						note="Pause it without losing the details."
						checked={active}
						onChange={setActive}
					/>
				)}
				<FormActions
					canSave={canSave}
					label={recurring ? "Save changes" : "Add recurring payment"}
					onDelete={recurring ? remove : undefined}
				/>
			</form>
		</Sheet>
	);
}
