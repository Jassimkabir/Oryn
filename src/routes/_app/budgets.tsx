import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { monthBudget, useBook, useFreshId } from "#/lib/book";
import { monthlyEntries } from "#/lib/groups";
import { summarizeMonth } from "#/lib/month";
import { cn } from "#/lib/utils";
import { Amount } from "#/ui/Amount";
import { CategoryRows } from "#/ui/CategoryRows";
import { Ring } from "#/ui/charts";
import { Card, Screen } from "#/ui/Screen";

export const Route = createFileRoute("/_app/budgets")({
	component: Budgets,
});

/** Every category against its budget. Budgets are edited in Settings, Categories. */
function Budgets() {
	const book = useBook();
	const entries = book.txns;
	const groups = book.groups;
	const freshId = useFreshId();
	const monthly = useMemo(
		() => monthlyEntries(entries, groups),
		[entries, groups],
	);
	const s = useMemo(
		() => summarizeMonth(monthly, book.categories),
		[monthly, book.categories],
	);
	const budget = monthBudget(book.categories);
	const left = budget - s.spent;
	const ratio = budget > 0 ? s.spent / budget : 0;
	const over = s.byCategory.filter(
		(c) => c.category.budget != null && c.spent > c.category.budget,
	).length;

	return (
		<Screen
			title="Budgets"
			trailing={
				<Link
					to="/settings/categories"
					className="text-sm font-medium text-stamp"
				>
					Edit
				</Link>
			}
		>
			<Card className="mt-3">
				<div className="flex items-center gap-5">
					<Ring ratio={ratio} size={112} thickness={11}>
						<span>
							<span
								className={cn(
									"num block text-[1.625rem] font-light tracking-[-0.03em]",
									ratio > 1 && "text-negative",
								)}
							>
								{Math.round(ratio * 100)}%
							</span>
							<span className="block text-2xs font-medium text-muted">
								used
							</span>
						</span>
					</Ring>
					<dl className="min-w-0 flex-1 space-y-2.5">
						<div>
							<dt className="text-xs text-muted">Spent</dt>
							<dd>
								<Amount value={s.spent} className="text-lg font-semibold" />
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted">
								{left >= 0 ? "Left of budget" : "Over budget"}
							</dt>
							<dd>
								<Amount
									value={Math.abs(left)}
									className={cn(
										"text-lg font-semibold",
										left < 0 && "text-negative",
									)}
								/>
							</dd>
						</div>
					</dl>
				</div>
				<p className="mt-4 border-t border-rule pt-3 text-sm text-muted">
					{over === 0
						? "Every category is within budget."
						: `${over} ${over === 1 ? "category is" : "categories are"} over budget.`}
				</p>
			</Card>

			<Card title="By category" id="cats">
				<CategoryRows rows={s.byCategory} entries={monthly} freshId={freshId} />
			</Card>
		</Screen>
	);
}
