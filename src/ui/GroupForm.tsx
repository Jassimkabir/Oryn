import { useEffect, useState } from "react";
import {
	createGroup,
	GROUP_ICONS,
	type Group,
	type GroupIcon,
	updateGroup,
} from "#/lib/groups";
import { evaluateEntry, toMajor } from "#/lib/money";
import { cn, haptic } from "#/lib/utils";
import { useMoneyFormat } from "./Amount";
import { GROUP_ICON, GROUP_ICON_LABEL, groupColor, Icon } from "./Icon";
import { Sheet } from "./Sheet";

/** Create a group, or edit one when `group` is given. */
export function GroupForm({
	open,
	onOpenChange,
	group,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	group?: Group;
	onSaved?: (g: Group) => void;
}) {
	const f = useMoneyFormat();
	const [name, setName] = useState("");
	const [icon, setIcon] = useState<GroupIcon>("wedding");
	const [budget, setBudget] = useState("");
	const [inMonthly, setInMonthly] = useState(false);

	useEffect(() => {
		if (!open) return;
		setName(group?.name ?? "");
		setIcon(group?.icon ?? "wedding");
		setBudget(group?.budget ? String(toMajor(group.budget, f.currency)) : "");
		setInMonthly(group?.inMonthly ?? false);
	}, [open, group, f.currency]);

	const cleanBudget = budget.replace(/[,\s]/g, "");
	const parsedBudget = cleanBudget
		? evaluateEntry(cleanBudget, f.currency)
		: null;
	const budgetInvalid = cleanBudget !== "" && !parsedBudget;
	const canSave = name.trim().length > 0 && !budgetInvalid;

	function save() {
		if (!canSave) {
			haptic("error");
			return;
		}
		const data = {
			name: name.trim(),
			icon,
			budget: parsedBudget ?? null,
			inMonthly,
		};
		let saved: Group;
		if (group) {
			updateGroup(group.id, data);
			saved = { ...group, ...data };
		} else {
			saved = createGroup(data);
		}
		haptic("success");
		onOpenChange(false);
		onSaved?.(saved);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			title={group ? "Edit group" : "New group"}
		>
			<form
				className="px-5 pt-1"
				onSubmit={(e) => {
					e.preventDefault();
					save();
				}}
			>
				<p className="text-lg font-semibold">
					{group ? "Edit group" : "New group"}
				</p>
				<p className="mt-0.5 text-sm text-muted">
					Track a wedding, a renovation or a trip on its own.
				</p>

				<label className="mt-4 block">
					<span className="mb-1.5 block text-sm font-medium text-muted">
						Name
					</span>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Ananya's wedding"
						autoComplete="off"
						enterKeyHint="next"
						maxLength={60}
						className="h-12 w-full rounded-[var(--radius-row)] bg-well px-4 text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--stamp)]"
					/>
				</label>

				<fieldset className="mt-4 min-w-0 border-0 p-0">
					<legend className="mb-1.5 text-sm font-medium text-muted">
						Icon
					</legend>
					<div className="grid grid-cols-6 gap-1.5">
						{GROUP_ICONS.map((id) => {
							const on = icon === id;
							const color = groupColor(id);
							return (
								<label
									key={id}
									className={cn(
										"pressable grid aspect-square cursor-pointer place-items-center rounded-[0.9rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
										on ? "shadow-[inset_0_0_0_2px_currentColor]" : "bg-well",
									)}
									style={{
										color: on ? color : undefined,
										background: on
											? `color-mix(in oklch, ${color} 18%, transparent)`
											: undefined,
									}}
								>
									<input
										type="radio"
										name="group-icon"
										value={id}
										checked={on}
										onChange={() => {
											haptic("tap");
											setIcon(id);
										}}
										className="sr-only"
										aria-label={GROUP_ICON_LABEL[id]}
									/>
									<Icon
										icon={GROUP_ICON[id]}
										size={22}
										className={on ? undefined : "text-muted"}
									/>
								</label>
							);
						})}
					</div>
				</fieldset>

				<label className="mt-4 block">
					<span className="mb-1.5 block text-sm font-medium text-muted">
						Budget for the whole group{" "}
						<span className="font-normal">(optional)</span>
					</span>
					<input
						value={budget}
						onChange={(e) => setBudget(e.target.value)}
						placeholder="3,00,000"
						inputMode="decimal"
						autoComplete="off"
						enterKeyHint="done"
						aria-invalid={budgetInvalid || undefined}
						className="num h-12 w-full rounded-[var(--radius-row)] bg-well px-4 text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--stamp)] aria-[invalid]:shadow-[inset_0_0_0_2px_var(--negative)]"
					/>
					{budgetInvalid && (
						<span className="mt-1 block text-xs text-negative">
							Use digits only, like 300000.
						</span>
					)}
				</label>

				<label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-row)] bg-well px-4 py-3">
					<span>
						<span className="block text-base">Count in monthly budget</span>
						<span className="mt-0.5 block text-xs text-muted">
							Off keeps big one-off spending out of your month.
						</span>
					</span>
					<span className="relative inline-flex shrink-0">
						<input
							type="checkbox"
							role="switch"
							aria-checked={inMonthly}
							checked={inMonthly}
							onChange={(e) => setInMonthly(e.target.checked)}
							className="peer sr-only"
						/>
						<span className="h-[1.875rem] w-[3.125rem] rounded-full bg-[var(--rule)] transition-colors duration-200 peer-checked:bg-stamp peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--stamp)]" />
						<span className="absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_2px_5px_oklch(0_0_0/0.22)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] peer-checked:translate-x-5" />
					</span>
				</label>

				<button
					type="submit"
					disabled={!canSave}
					className="btn-stamp pressable mt-5 h-13 w-full rounded-[var(--radius-row)] py-3.5 text-base font-semibold disabled:opacity-45 disabled:shadow-none"
				>
					{group ? "Save changes" : "Create group"}
				</button>
			</form>
		</Sheet>
	);
}
