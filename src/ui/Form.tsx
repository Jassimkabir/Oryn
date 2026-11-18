import type { IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { evaluateEntry, type Minor } from "#/lib/money";
import { cn, haptic } from "#/lib/utils";
import { Icon } from "./Icon";

/* Shared pieces for the sheet forms (accounts, categories, recurring). */

export const fieldClass =
	"h-12 w-full rounded-[var(--radius-row)] bg-well px-4 text-ink focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--stamp)] aria-[invalid]:shadow-[inset_0_0_0_2px_var(--negative)]";

export function FormHead({ title, note }: { title: string; note?: string }) {
	return (
		<>
			<p className="text-lg font-semibold">{title}</p>
			{note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
		</>
	);
}

export function Field({
	label,
	hint,
	error,
	children,
}: {
	label: ReactNode;
	hint?: ReactNode;
	error?: string | null;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed in as children
		<label className="mt-4 block">
			<span className="mb-1.5 block text-sm font-medium text-muted">
				{label}
			</span>
			{children}
			{error ? (
				<span className="mt-1 block text-xs text-negative">{error}</span>
			) : hint ? (
				<span className="mt-1 block text-xs text-muted">{hint}</span>
			) : null}
		</label>
	);
}

/** Reads a typed amount. Empty is null; "0" is zero. */
export function readMoney(text: string, currency: string) {
	const clean = text.replace(/[,\s]/g, "");
	if (clean === "") return { value: null as Minor | null, invalid: false };
	if (/^0*(\.0*)?$/.test(clean)) return { value: 0, invalid: false };
	const v = evaluateEntry(clean, currency);
	return { value: v, invalid: v === null };
}

/** A row of choices shown as pills, one picked. Scrolls sideways if needed. */
export function Choices<T extends string>({
	legend,
	value,
	options,
	onChange,
	className,
}: {
	legend: string;
	value: T | null;
	options: { value: T; label: string; icon?: IconSvgElement }[];
	onChange: (v: T) => void;
	className?: string;
}) {
	return (
		<fieldset className={cn("mt-4 min-w-0 border-0 p-0", className)}>
			<legend className="mb-1.5 text-sm font-medium text-muted">
				{legend}
			</legend>
			<div
				data-no-drag
				className="scroll-fade -mx-5 flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-5 py-1 [scrollbar-width:none]"
			>
				{options.map((o) => {
					const on = value === o.value;
					return (
						<label
							key={o.value}
							className={cn(
								"pressable inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
								o.icon ? "pr-3.5 pl-3" : "px-3.5",
								on ? "btn-stamp" : "bg-well text-ink",
							)}
						>
							<input
								type="radio"
								name={legend}
								value={o.value}
								checked={on}
								onChange={() => {
									haptic("tap");
									onChange(o.value);
								}}
								className="sr-only"
							/>
							{o.icon && <Icon icon={o.icon} size={17} stroke={1.8} />}
							{o.label}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

/** A switch with a label and a line of explanation. */
export function SwitchField({
	label,
	note,
	checked,
	onChange,
}: {
	label: string;
	note?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-row)] bg-well px-4 py-3">
			<span>
				<span className="block text-base">{label}</span>
				{note && (
					<span className="mt-0.5 block text-xs text-muted">{note}</span>
				)}
			</span>
			<span className="relative inline-flex shrink-0">
				<input
					type="checkbox"
					role="switch"
					aria-checked={checked}
					checked={checked}
					onChange={(e) => onChange(e.target.checked)}
					className="peer sr-only"
				/>
				<span className="h-[1.875rem] w-[3.125rem] rounded-full bg-[var(--rule)] transition-colors duration-200 peer-checked:bg-stamp peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--stamp)]" />
				<span className="absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_2px_5px_oklch(0_0_0/0.22)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] peer-checked:translate-x-5" />
			</span>
		</label>
	);
}

/** Save, plus an optional quieter delete beside it. */
export function FormActions({
	canSave,
	label,
	onDelete,
	deleteLabel = "Delete",
}: {
	canSave: boolean;
	label: string;
	onDelete?: () => void;
	deleteLabel?: string;
}) {
	return (
		<div className="mt-5 flex gap-2">
			{onDelete && (
				<button
					type="button"
					onClick={onDelete}
					className="pressable h-13 rounded-[var(--radius-row)] bg-well px-5 py-3.5 text-base font-semibold text-negative"
				>
					{deleteLabel}
				</button>
			)}
			<button
				type="submit"
				disabled={!canSave}
				className="btn-stamp pressable h-13 flex-1 rounded-[var(--radius-row)] py-3.5 text-base font-semibold disabled:opacity-45 disabled:shadow-none"
			>
				{label}
			</button>
		</div>
	);
}
