import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "#/lib/utils";
import { Icon } from "./Icon";

/** An inset grouped list, the platform's settings pattern, on a glass card. */
export function Group({
	title,
	children,
	note,
}: {
	title?: string;
	children: ReactNode;
	note?: ReactNode;
}) {
	return (
		<section className="mt-6">
			{title && (
				<h2 className="mb-1.5 px-4 text-xs font-semibold tracking-[0.06em] text-muted uppercase">
					{title}
				</h2>
			)}
			<ul className="glass liquid overflow-hidden rounded-[var(--radius-card)]">
				{children}
			</ul>
			{note && (
				<p className="mt-1.5 px-4 text-xs leading-relaxed text-muted">{note}</p>
			)}
		</section>
	);
}

/* Rows separate with a hairline inset from the label, as native lists do. */
const rowItem =
	"relative after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:bg-rule last:after:hidden";
const rowItemIcon =
	"relative after:absolute after:right-0 after:bottom-0 after:left-[3.75rem] after:h-px after:bg-rule last:after:hidden";
const rowBase =
	"flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left";

/** A coloured icon tile, like the platform's settings rows. */
export function IconTile({
	icon,
	color,
}: {
	icon: IconSvgElement;
	color: string;
}) {
	return (
		<span
			aria-hidden
			className="grid size-8 shrink-0 place-items-center rounded-[0.6rem] text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.3)]"
			style={{ background: color }}
		>
			<Icon icon={icon} size={18} stroke={1.8} />
		</span>
	);
}

export function LinkRow({
	to,
	label,
	value,
	icon,
	color,
}: {
	to: string;
	label: string;
	value?: string;
	icon?: IconSvgElement;
	color?: string;
}) {
	return (
		<li className={icon ? rowItemIcon : rowItem}>
			<Link to={to} className={cn(rowBase, "active:bg-well")}>
				<span className="flex min-w-0 items-center gap-3">
					{icon && <IconTile icon={icon} color={color ?? "var(--stamp)"} />}
					<span className="truncate text-base">{label}</span>
				</span>
				<span className="flex min-w-0 items-center gap-1 text-base text-muted">
					<span className="truncate">{value}</span>
					<Icon icon={ArrowRight01Icon} size={18} stroke={1.8} />
				</span>
			</Link>
		</li>
	);
}

export function ToggleRow({
	label,
	description,
	checked,
	onChange,
	icon,
	color,
}: {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (v: boolean) => void;
	icon?: IconSvgElement;
	color?: string;
}) {
	return (
		<li className={icon ? rowItemIcon : rowItem}>
			<label className={cn(rowBase, "cursor-pointer py-2.5")}>
				<span className="flex min-w-0 items-center gap-3">
					{icon && <IconTile icon={icon} color={color ?? "var(--stamp)"} />}
					<span>
						<span className="block text-base">{label}</span>
						{description && (
							<span className="mt-0.5 block text-xs text-muted">
								{description}
							</span>
						)}
					</span>
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
					<span className="h-[1.875rem] w-[3.125rem] rounded-full bg-well shadow-[inset_0_0_0_1px_var(--rule)] transition-colors duration-200 peer-checked:bg-stamp peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--stamp)]" />
					<span className="absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_2px_5px_oklch(0_0_0/0.22)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] peer-checked:translate-x-5" />
				</span>
			</label>
		</li>
	);
}

/** Segmented choice: a real radio group in the platform's segmented style. */
export function Segmented<T extends string>({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (v: T, el: HTMLElement) => void;
}) {
	return (
		<li className={cn(rowItem, "px-4 py-3")}>
			<fieldset>
				<legend className="mb-2 text-sm font-medium text-muted">{label}</legend>
				<div
					className="grid gap-0.5 rounded-[0.75rem] bg-well p-0.5"
					style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
				>
					{options.map((o) => (
						<label
							key={o.value}
							className={cn(
								"grid h-9 cursor-pointer place-items-center rounded-[0.6rem] text-sm transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--stamp)]",
								value === o.value
									? "bg-[var(--glass-thick)] font-semibold text-ink shadow-[0_1px_4px_oklch(0_0_0/0.14)]"
									: "font-medium text-muted",
							)}
						>
							<input
								type="radio"
								className="sr-only"
								name={label}
								value={o.value}
								checked={value === o.value}
								onChange={(e) =>
									onChange(
										o.value,
										e.currentTarget.parentElement as HTMLElement,
									)
								}
							/>
							{o.label}
						</label>
					))}
				</div>
			</fieldset>
		</li>
	);
}

/** A list row that opens something (a form sheet): leading tile, text, value. */
export function ItemRow({
	leading,
	label,
	sub,
	value,
	onClick,
	dim,
}: {
	leading: ReactNode;
	label: string;
	sub?: ReactNode;
	value?: ReactNode;
	onClick: () => void;
	dim?: boolean;
}) {
	return (
		<li className="relative after:absolute after:right-0 after:bottom-0 after:left-[4.25rem] after:h-px after:bg-rule last:after:hidden">
			<button
				type="button"
				onClick={onClick}
				className={cn(rowBase, "py-2.5 active:bg-well", dim && "opacity-60")}
			>
				<span className="flex min-w-0 items-center gap-3">
					{leading}
					<span className="min-w-0">
						<span className="block truncate text-base">{label}</span>
						{sub && (
							<span className="mt-0.5 block truncate text-xs text-muted">
								{sub}
							</span>
						)}
					</span>
				</span>
				<span className="flex shrink-0 items-center gap-1 text-base text-muted">
					{value}
					<Icon icon={ArrowRight01Icon} size={18} stroke={1.8} />
				</span>
			</button>
		</li>
	);
}

/** "Add …" row at the end of a list. */
export function AddRow({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<li>
			<button
				type="button"
				onClick={onClick}
				className={cn(rowBase, "font-medium text-stamp active:bg-well")}
			>
				{label}
			</button>
		</li>
	);
}
