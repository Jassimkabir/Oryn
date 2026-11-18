import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBook } from "#/lib/book";
import { summarizeGroups } from "#/lib/groups";
import { GroupForm } from "#/ui/GroupForm";
import { GroupRow } from "#/ui/GroupRow";
import { Icon } from "#/ui/Icon";
import { Card, Screen } from "#/ui/Screen";

export const Route = createFileRoute("/_app/groups/")({
	validateSearch: (s: Record<string, unknown>): { new?: boolean } =>
		s.new ? { new: true } : {},
	component: Groups,
});

/** Every group: the ones still going, then the finished ones. */
function Groups() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const { txns: entries, groups } = useBook();
	const [creating, setCreating] = useState(Boolean(search.new));
	const all = useMemo(
		() =>
			summarizeGroups(entries, groups).sort((a, b) =>
				(b.last ?? b.group.createdAt).localeCompare(
					a.last ?? a.group.createdAt,
				),
			),
		[entries, groups],
	);
	const active = all.filter((s) => !s.group.finished);
	const finished = all.filter((s) => s.group.finished);

	return (
		<Screen
			title="Groups"
			back={{ to: "/", label: "Overview" }}
			trailing={
				<button
					type="button"
					onClick={() => setCreating(true)}
					className="pressable -my-2 inline-flex h-10 items-center gap-1 font-semibold text-stamp"
				>
					<Icon icon={PlusSignIcon} size={18} stroke={2} />
					New group
				</button>
			}
		>
			{all.length === 0 ? (
				<Card className="mt-3">
					<p className="font-semibold">No groups yet</p>
					<p className="mt-1 max-w-[36ch] text-sm text-muted">
						A group keeps a wedding, a renovation or a trip together, with its
						own total and budget, apart from your month.
					</p>
					<button
						type="button"
						onClick={() => setCreating(true)}
						className="btn-stamp pressable mt-4 h-11 rounded-full px-5 text-sm font-semibold"
					>
						Start a group
					</button>
				</Card>
			) : (
				<>
					{active.length > 0 && (
						<Card title="Going on" id="active">
							<ul>
								{active.map((s) => (
									<GroupRow key={s.group.id} summary={s} />
								))}
							</ul>
						</Card>
					)}
					{finished.length > 0 && (
						<Card title="Finished" id="finished">
							<ul>
								{finished.map((s) => (
									<GroupRow key={s.group.id} summary={s} />
								))}
							</ul>
						</Card>
					)}
				</>
			)}
			<GroupForm
				open={creating}
				onOpenChange={(o) => {
					setCreating(o);
					if (!o && search.new) navigate({ to: "/groups", replace: true });
				}}
				onSaved={(g) =>
					navigate({ to: "/groups/$groupId", params: { groupId: g.id } })
				}
			/>
		</Screen>
	);
}
