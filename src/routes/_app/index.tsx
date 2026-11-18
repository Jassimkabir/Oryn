import { ArrowRight01Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { balances, monthBudget, useBook, useFreshId } from "#/lib/book";
import { monthlyEntries, openEdit, summarizeGroups } from "#/lib/groups";
import { formatMoney } from "#/lib/money";
import { summarizeMonth } from "#/lib/month";
import { pendingDue, postOccurrence, skipOccurrence } from "#/lib/recurring";
import { cn } from "#/lib/utils";
import { Amount, Figure, useMoneyFormat } from "#/ui/Amount";
import { CategoryRows } from "#/ui/CategoryRows";
import { Donut, SpendCurve } from "#/ui/charts";
import { GroupRow } from "#/ui/GroupRow";
import {
	AccountBadge,
	CategoryBadge,
	categoryColor,
	Icon,
	TransferBadge,
} from "#/ui/Icon";
import { Logo } from "#/ui/Logo";
import { Card, Screen } from "#/ui/Screen";
import { SlipRow } from "#/ui/SlipRow";

export const Route = createFileRoute("/_app/")({
	component: Overview,
});

function SeeAll({ to, children }: { to: string; children: string }) {
	return (
		<Link
			to={to}
			className="-my-2 inline-flex h-10 items-center gap-0.5 text-sm font-medium text-stamp"
		>
			{children}
			<Icon icon={ArrowRight01Icon} size={16} stroke={2} />
		</Link>
	);
}

function Overview() {
	const book = useBook();
	const entries = book.txns;
	const groups = book.groups;
	const freshId = useFreshId();
	const f = useMoneyFormat();
	const monthly = useMemo(
		() => monthlyEntries(entries, groups),
		[entries, groups],
	);
	const s = useMemo(
		() => summarizeMonth(monthly, book.categories),
		[monthly, book.categories],
	);
	const all = useMemo(
		() => summarizeMonth(entries, book.categories),
		[entries, book.categories],
	);
	/** Group spending this month that sits outside the monthly budget. */
	const setAside = all.spent - s.spent;
	const activeGroups = useMemo(
		() =>
			summarizeGroups(entries, groups)
				.filter((g) => !g.group.finished)
				.sort((a, b) =>
					(b.last ?? b.group.createdAt).localeCompare(
						a.last ?? a.group.createdAt,
					),
				),
		[entries, groups],
	);
	const budget = monthBudget(book.categories);
	const bal = useMemo(() => balances(book), [book]);
	const accounts = book.accounts.filter(
		(a) => !a.archived || (bal.get(a.id) ?? 0) !== 0,
	);
	const netWorth = accounts.reduce((t, a) => t + (bal.get(a.id) ?? 0), 0);
	const due = pendingDue(book.recurring);
	const catOf = new Map(book.categories.map((c) => [c.id, c]));
	const left = budget - s.spent;
	const perDay = left > 0 ? Math.floor(left / s.daysLeft / 100) * 100 : 0;
	const used = budget > 0 ? s.spent / budget : 0;
	const spending = s.byCategory.filter((c) => c.spent > 0);
	const top = spending.slice(0, 4);
	const recent = entries.slice(0, 5);

	return (
		<Screen
			title={s.monthName}
			leading={<Logo size={32} />}
			trailing={`Day ${s.today} of ${s.daysInMonth}`}
		>
			<Card className="mt-3 pt-5">
				<h2 className="text-sm font-medium text-muted">Spent this month</h2>
				<Figure value={s.spent} className="mt-2 text-[3.25rem]" />
				<p className="mt-2 text-sm text-muted">
					of <Amount value={budget} /> ·{" "}
					<span className={cn(used > 1 && "font-medium text-negative")}>
						{Math.round(used * 100)}% used
					</span>
				</p>
				<div className="mt-5">
					<SpendCurve
						daily={s.daily}
						today={s.today}
						budget={budget}
						label={`Spending so far against an even pace to ${formatMoney(budget, f)} by month end.`}
					/>
				</div>
				<div className="mt-4 grid grid-cols-2 gap-2">
					<div className="rounded-[var(--radius-row)] bg-well px-3 py-2.5">
						<p className="text-xs text-muted">
							{left > 0 ? "You can spend" : "Over budget by"}
						</p>
						<p
							className={cn(
								"mt-0.5 text-lg font-semibold",
								left <= 0 && "text-negative",
							)}
						>
							<Amount value={left > 0 ? perDay : -left} />
							{left > 0 && (
								<span className="text-sm font-medium text-muted"> a day</span>
							)}
						</p>
					</div>
					<div className="rounded-[var(--radius-row)] bg-well px-3 py-2.5">
						<p className="text-xs text-muted">Left this month</p>
						<p className="mt-0.5 text-lg font-semibold">
							{left > 0 ? <Amount value={left} /> : "Nothing"}
						</p>
					</div>
				</div>
				<p className="mt-3 text-xs text-muted">
					{s.daysLeft} {s.daysLeft === 1 ? "day" : "days"} to go · {s.count}{" "}
					{s.count === 1 ? "expense" : "expenses"} so far
				</p>
				{s.income > 0 && (
					<p className="mt-1 text-xs text-muted">
						Money in this month:{" "}
						<Amount value={s.income} className="font-medium text-positive" />
					</p>
				)}
				{setAside > 0 && (
					<p className="mt-1 text-xs text-muted">
						Not counted: <Amount value={setAside} /> in groups this month.
					</p>
				)}
			</Card>

			{due.length > 0 && (
				<Card title="Due to confirm" id="due">
					<ul>
						{due.map(({ recurring: r, date }) => (
							<li
								key={r.id}
								className="flex items-center gap-3 border-b border-rule py-2.5 last:border-0"
							>
								{r.kind === "transfer" ? (
									<TransferBadge />
								) : (
									<CategoryBadge
										category={r.category ? catOf.get(r.category) : undefined}
									/>
								)}
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium">
										{r.payee || "Recurring payment"}
									</span>
									<span className="block text-xs text-muted">
										<Amount value={r.amount} /> · due {dueLabel(date)}
									</span>
								</span>
								<button
									type="button"
									onClick={() => skipOccurrence(r, date)}
									className="pressable h-9 rounded-full bg-well px-3 text-sm font-medium"
								>
									Skip
								</button>
								<button
									type="button"
									onClick={() => postOccurrence(r, date)}
									className="btn-stamp pressable h-9 rounded-full px-3 text-sm font-semibold"
								>
									Add
								</button>
							</li>
						))}
					</ul>
				</Card>
			)}

			{accounts.length > 0 && (
				<Card
					title="Accounts"
					id="accounts"
					action={<SeeAll to="/settings/accounts">Manage</SeeAll>}
				>
					<p className="text-xs text-muted">Net worth</p>
					<p
						className={cn(
							"mt-0.5 text-2xl font-semibold",
							netWorth < 0 && "text-negative",
						)}
					>
						<Amount value={netWorth} />
					</p>
					<ul className="mt-2">
						{accounts.map((a) => {
							const v = bal.get(a.id) ?? 0;
							return (
								<li
									key={a.id}
									className="flex items-center gap-3 border-b border-rule py-2 last:border-0"
								>
									<AccountBadge kind={a.kind} size={36} />
									<span className="min-w-0 flex-1 truncate font-medium">
										{a.name}
									</span>
									<Amount
										value={v}
										className={cn("font-semibold", v < 0 && "text-negative")}
									/>
								</li>
							);
						})}
					</ul>
				</Card>
			)}

			<Card
				title="Groups"
				id="groups"
				action={
					activeGroups.length > 0 ? (
						<SeeAll to="/groups">All groups</SeeAll>
					) : null
				}
			>
				{activeGroups.length > 0 ? (
					<ul>
						{activeGroups.slice(0, 3).map((g) => (
							<GroupRow key={g.group.id} summary={g} />
						))}
					</ul>
				) : (
					<Link
						to="/groups"
						search={{ new: true }}
						className="flex items-center gap-3 py-2"
					>
						<span className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] bg-well text-stamp">
							<Icon icon={FolderAddIcon} size={22} />
						</span>
						<span className="min-w-0">
							<span className="block font-medium">Start a group</span>
							<span className="block text-sm text-muted">
								Track a wedding, a renovation or a trip on its own.
							</span>
						</span>
					</Link>
				)}
			</Card>

			{spending.length > 0 && (
				<Card
					title="Where it went"
					id="where"
					action={<SeeAll to="/budgets">Budgets</SeeAll>}
				>
					<div className="flex items-center gap-4 py-2">
						<Donut
							slices={spending.map((c) => ({
								id: c.category.id,
								value: c.spent,
								color: categoryColor(c.category),
							}))}
						>
							<span>
								<span className="block text-2xs font-medium text-muted">
									Top
								</span>
								<span className="block max-w-[5.5rem] truncate text-sm font-semibold">
									{spending[0]?.category.name}
								</span>
							</span>
						</Donut>
						<ul className="min-w-0 flex-1 space-y-2">
							{spending.slice(0, 5).map((c) => (
								<li
									key={c.category.id}
									className="flex items-center gap-2 text-sm"
								>
									<span
										aria-hidden
										className="size-2.5 shrink-0 rounded-full"
										style={{ background: categoryColor(c.category) }}
									/>
									<span className="min-w-0 flex-1 truncate">
										{c.category.name}
									</span>
									<span className="num shrink-0 font-medium text-muted">
										{Math.round((c.spent / (s.spent || 1)) * 100)}%
									</span>
								</li>
							))}
						</ul>
					</div>
					<div className="mt-1 border-t border-rule pt-1">
						<CategoryRows rows={top} entries={monthly} freshId={freshId} />
					</div>
				</Card>
			)}

			<Card
				title="Recent"
				id="recent"
				action={
					recent.length > 0 ? <SeeAll to="/activity">See all</SeeAll> : null
				}
			>
				{recent.length > 0 ? (
					<ul>
						{recent.map((e) => (
							<SlipRow
								key={e.id}
								entry={e}
								fresh={e.id === freshId}
								onOpen={openEdit}
							/>
						))}
					</ul>
				) : (
					<div className="py-3">
						<p className="font-semibold">Your first expense goes here</p>
						<p className="mt-1 max-w-[34ch] text-sm text-muted">
							Tap <span className="font-semibold text-stamp">+</span> below,
							type the amount, pick a category and save. It takes about three
							seconds.
						</p>
					</div>
				)}
			</Card>
		</Screen>
	);
}

const dueFmt = new Intl.DateTimeFormat("en-IN", {
	day: "numeric",
	month: "short",
});
function dueLabel(d: string) {
	const [y, m, day] = d.split("-").map(Number) as [number, number, number];
	const date = new Date(y, m - 1, day);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return date.getTime() === today.getTime() ? "today" : dueFmt.format(date);
}
