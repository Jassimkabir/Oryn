import {
	CheckmarkCircle02Icon,
	Delete02Icon,
	PencilEdit02Icon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useBook, useFreshId } from "#/lib/book";
import {
	deleteGroup,
	openEdit,
	openQuickAdd,
	restoreGroup,
	updateGroup,
} from "#/lib/groups";
import { cn, haptic } from "#/lib/utils";
import { Amount, Figure } from "#/ui/Amount";
import { Donut, Ring } from "#/ui/charts";
import { GroupForm } from "#/ui/GroupForm";
import { categoryColor, GroupBadge, Icon } from "#/ui/Icon";
import { Card, Screen } from "#/ui/Screen";
import { SlipRow } from "#/ui/SlipRow";

export const Route = createFileRoute("/_app/groups/$groupId")({
	component: GroupDetail,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
	day: "numeric",
	month: "short",
});
const sinceFmt = new Intl.DateTimeFormat("en-IN", {
	month: "short",
	year: "numeric",
});

function GroupDetail() {
	const { groupId } = Route.useParams();
	const navigate = useNavigate();
	const book = useBook();
	const groups = book.groups;
	const entries = book.txns;
	const freshId = useFreshId();
	const [editing, setEditing] = useState(false);
	const group = groups.find((g) => g.id === groupId);

	const mine = useMemo(
		() => entries.filter((e) => e.group === groupId),
		[entries, groupId],
	);
	const byCategory = useMemo(() => {
		const m = new Map<string, number>();
		for (const e of mine)
			if (e.kind === "expense" && e.category)
				m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
		return book.categories
			.map((c) => ({ category: c, spent: m.get(c.id) ?? 0 }))
			.filter((c) => c.spent > 0)
			.sort((a, b) => b.spent - a.spent);
	}, [mine, book.categories]);

	if (!group) {
		return (
			<Screen title="Group" back={{ to: "/groups", label: "Groups" }}>
				<Card className="mt-3">
					<p className="font-semibold">This group isn't here any more</p>
					<p className="mt-1 text-sm text-muted">
						It may have been deleted.{" "}
						<Link to="/groups" className="font-medium text-stamp">
							See all groups
						</Link>
					</p>
				</Card>
			</Screen>
		);
	}

	const spent = mine.reduce((s, e) => s + e.amount, 0);
	const ratio = group.budget ? spent / group.budget : 0;
	const left = group.budget ? group.budget - spent : 0;
	const first = mine.at(-1)?.at ?? group.createdAt;

	function remove() {
		if (!group) return;
		const removed = deleteGroup(group.id);
		haptic("success");
		navigate({ to: "/groups" });
		toast(`${group.name} deleted. Its expenses are kept.`, {
			action: removed
				? { label: "Undo", onClick: () => restoreGroup(removed) }
				: undefined,
		});
	}

	return (
		<Screen
			title={group.name}
			leading={<GroupBadge icon={group.icon} size={36} />}
			back={{ to: "/groups", label: "Groups" }}
		>
			<p className="mt-1 px-1 text-sm text-muted">
				Since {sinceFmt.format(new Date(first))} · {mine.length}{" "}
				{mine.length === 1 ? "expense" : "expenses"}
				{group.finished ? " · Finished" : ""}
				{group.inMonthly ? " · Counts in your month" : ""}
			</p>

			<Card className="mt-3 pt-5">
				<div className="flex items-center justify-between gap-4">
					<div className="min-w-0">
						<h2 className="text-sm font-medium text-muted">Spent so far</h2>
						<Figure value={spent} className="mt-2 text-[2.75rem]" />
						{group.budget ? (
							<p
								className={cn(
									"mt-2 text-sm",
									left < 0 ? "font-medium text-negative" : "text-muted",
								)}
							>
								{left >= 0 ? (
									<>
										<Amount value={left} /> left of{" "}
										<Amount value={group.budget} />
									</>
								) : (
									<>
										Over by <Amount value={-left} />
									</>
								)}
							</p>
						) : (
							<p className="mt-2 text-sm text-muted">No budget set</p>
						)}
					</div>
					{group.budget ? (
						<Ring ratio={ratio} size={92} thickness={9}>
							<span
								className={cn(
									"num text-lg font-light",
									ratio > 1 && "text-negative",
								)}
							>
								{Math.round(ratio * 100)}%
							</span>
						</Ring>
					) : null}
				</div>
				<div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2">
					<button
						type="button"
						onClick={() => openQuickAdd(group.id)}
						className="btn-stamp pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold"
					>
						<Icon icon={PlusSignIcon} size={18} stroke={2} />
						Add expense
					</button>
					<button
						type="button"
						onClick={() => setEditing(true)}
						aria-label="Edit group"
						className="pressable grid size-11 place-items-center rounded-full bg-well text-ink"
					>
						<Icon icon={PencilEdit02Icon} size={20} />
					</button>
					<button
						type="button"
						onClick={() => {
							haptic("tap");
							updateGroup(group.id, { finished: !group.finished });
							toast(
								group.finished
									? `${group.name} is going on again`
									: `${group.name} marked finished`,
							);
						}}
						aria-label={group.finished ? "Reopen group" : "Mark as finished"}
						className={cn(
							"pressable grid size-11 place-items-center rounded-full",
							group.finished ? "bg-well text-stamp" : "bg-well text-ink",
						)}
					>
						<Icon icon={CheckmarkCircle02Icon} size={20} />
					</button>
				</div>
			</Card>

			{byCategory.length > 0 && (
				<Card title="By category" id="g-cats">
					<div className="flex items-center gap-4 py-2">
						<Donut
							size={112}
							thickness={12}
							slices={byCategory.map((c) => ({
								id: c.category.id,
								value: c.spent,
								color: categoryColor(c.category),
							}))}
						/>
						<ul className="min-w-0 flex-1 space-y-2">
							{byCategory.slice(0, 5).map((c) => (
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
									<Amount value={c.spent} className="font-medium text-muted" />
								</li>
							))}
						</ul>
					</div>
				</Card>
			)}

			<Card title="Expenses" id="g-list">
				{mine.length > 0 ? (
					<ul>
						{mine.map((e) => (
							<SlipRow
								key={e.id}
								entry={e}
								fresh={e.id === freshId}
								meta={dateFmt.format(new Date(e.at))}
								hideGroup
								onOpen={openEdit}
							/>
						))}
					</ul>
				) : (
					<p className="py-2 text-sm text-muted">
						Nothing yet. Tap Add expense to log the first one here.
					</p>
				)}
			</Card>

			<div className="mt-6 flex justify-center">
				<button
					type="button"
					onClick={remove}
					className="pressable inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-negative"
				>
					<Icon icon={Delete02Icon} size={18} />
					Delete group
				</button>
			</div>

			<GroupForm open={editing} onOpenChange={setEditing} group={group} />
		</Screen>
	);
}
