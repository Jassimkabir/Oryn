import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Link } from "@tanstack/react-router";
import type { GroupSummary } from "#/lib/groups";
import { Amount } from "./Amount";
import { GroupBadge, groupColor, Icon } from "./Icon";

/** One group: icon, name, total against its budget, and a link into it. */
export function GroupRow({ summary }: { summary: GroupSummary }) {
	const { group, spent, count } = summary;
	const ratio = group.budget ? spent / group.budget : 0;
	const over = group.budget !== null && spent > group.budget;
	return (
		<li className="relative after:absolute after:right-0 after:bottom-0 after:left-[3.75rem] after:h-px after:bg-rule last:after:hidden">
			<Link
				to="/groups/$groupId"
				params={{ groupId: group.id }}
				className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto_1rem] items-center gap-x-3 py-3"
			>
				<GroupBadge icon={group.icon} />
				<span className="min-w-0">
					<span className="block truncate text-base font-medium">
						{group.name}
					</span>
					{group.budget ? (
						<>
							<span
								aria-hidden
								className="relative mt-1.5 block h-1.5 overflow-hidden rounded-full bg-well"
							>
								<span
									className="absolute inset-y-0 left-0 rounded-full"
									style={{
										width: `${Math.min(100, ratio * 100)}%`,
										background: over
											? "var(--negative)"
											: groupColor(group.icon),
									}}
								/>
							</span>
							<span
								className={
									over
										? "mt-1 block text-xs font-medium text-negative"
										: "mt-1 block text-xs text-muted"
								}
							>
								{over ? (
									<>
										Over by <Amount value={spent - group.budget} />
									</>
								) : (
									<>
										{Math.round(ratio * 100)}% of{" "}
										<Amount value={group.budget} />
									</>
								)}
							</span>
						</>
					) : (
						<span className="mt-0.5 block text-xs text-muted">
							{count} {count === 1 ? "expense" : "expenses"}
							{group.finished ? " · Finished" : ""}
						</span>
					)}
				</span>
				<Amount
					value={spent}
					className="self-start pt-0.5 text-base font-semibold"
				/>
				<Icon
					icon={ArrowRight01Icon}
					size={16}
					stroke={2}
					className="mt-1 self-start text-muted"
				/>
			</Link>
		</li>
	);
}
