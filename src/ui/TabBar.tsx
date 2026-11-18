import {
	Analytics01Icon,
	DashboardSquare02Icon,
	PieChart02Icon,
	PlusSignIcon,
	Settings02Icon,
} from "@hugeicons/core-free-icons";
import { Link, useLocation } from "@tanstack/react-router";
import { cn, haptic } from "#/lib/utils";
import { Icon } from "./Icon";

const TABS = [
	{ to: "/", label: "Overview", icon: DashboardSquare02Icon },
	{ to: "/activity", label: "Activity", icon: Analytics01Icon },
	{ to: "/budgets", label: "Budgets", icon: PieChart02Icon },
	{ to: "/settings", label: "Settings", icon: Settings02Icon },
] as const;

/**
 * A floating liquid-glass tab bar with the add button beside it. Tabs switch
 * instantly; the stamp ink marks only the active tab and the add button.
 */
export function TabBar({ onAdd }: { onAdd: () => void }) {
	const { pathname } = useLocation();
	const activeIndex = TABS.findIndex((t) =>
		t.to === "/" ? pathname === "/" : pathname.startsWith(t.to),
	);

	return (
		<nav
			aria-label="Main"
			className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[var(--tabbar-bottom)]"
		>
			<div className="mx-auto flex max-w-[480px] items-center gap-2.5 px-4">
				<div className="glass glass-thick liquid pointer-events-auto grid h-[var(--tabbar-h)] flex-1 grid-cols-4 rounded-full p-1">
					{TABS.map((t, i) => {
						const active = i === activeIndex;
						return (
							<Link
								key={t.to}
								to={t.to}
								onClick={() => haptic("tap")}
								aria-current={active ? "page" : undefined}
								className={cn(
									"pressable flex flex-col items-center justify-center gap-0.5 rounded-full text-2xs font-medium",
									active
										? "bg-[color-mix(in_oklch,var(--stamp)_14%,transparent)] font-semibold text-stamp"
										: "text-muted",
								)}
							>
								<Icon icon={t.icon} size={22} stroke={active ? 1.9 : 1.6} />
								{t.label}
							</Link>
						);
					})}
				</div>
				<button
					type="button"
					onClick={() => {
						haptic("tap");
						onAdd();
					}}
					aria-label="Add an expense"
					className="btn-stamp pressable pointer-events-auto grid size-[var(--tabbar-h)] shrink-0 place-items-center rounded-full"
				>
					<Icon icon={PlusSignIcon} size={26} stroke={2} />
				</button>
			</div>
		</nav>
	);
}
