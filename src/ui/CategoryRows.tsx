import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useStore } from "@tanstack/react-store";
import { useLayoutEffect, useRef, useState } from "react";
import type { Category, Txn } from "#/lib/model";
import type { Minor } from "#/lib/money";
import { prefsStore } from "#/lib/prefs";
import { cn, prefersReducedMotion } from "#/lib/utils";
import { Amount } from "./Amount";
import { CategoryBadge, categoryColor, Icon } from "./Icon";
import { SlipRow } from "./SlipRow";

type Row = { category: Category; spent: Minor };

/**
 * Category rows in spend order, each against its budget. When a save changes the
 * order, rows slide to their new place (FLIP, transform only). Tapping a row opens
 * its latest expenses in place.
 */
export function CategoryRows({
	rows,
	entries,
	freshId,
}: {
	rows: Row[];
	entries: Txn[];
	freshId?: string | null;
}) {
	const [open, setOpen] = useState<string | null>(null);
	const refs = useRef(new Map<string, HTMLLIElement>());
	const lastTops = useRef(new Map<string, number>());
	const reduce = useStore(prefsStore, (s) => s.reduceMotion);

	useLayoutEffect(() => {
		const animate = !reduce && !prefersReducedMotion();
		const tops = new Map<string, number>();
		for (const [id, el] of refs.current) {
			const top = el.offsetTop;
			tops.set(id, top);
			const before = lastTops.current.get(id);
			if (animate && before !== undefined && Math.abs(before - top) > 1) {
				el.animate(
					[
						{ transform: `translateY(${before - top}px)` },
						{ transform: "translateY(0)" },
					],
					{ duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
				);
			}
		}
		lastTops.current = tops;
	});

	return (
		<ul className="relative">
			{rows.map(({ category, spent }) => {
				const budget = category.budget ?? 0;
				const ratio = budget > 0 ? spent / budget : 0;
				const over = ratio > 1;
				const isOpen = open === category.id;
				const detailId = `cat-${category.id}`;
				const slips = isOpen
					? entries
							.filter((e) => e.kind === "expense" && e.category === category.id)
							.slice(0, 3)
					: [];
				return (
					<li
						key={category.id}
						ref={(el) => {
							if (el) refs.current.set(category.id, el);
							else refs.current.delete(category.id);
						}}
						className="relative after:absolute after:right-0 after:bottom-0 after:left-[3.25rem] after:h-px after:bg-rule last:after:hidden"
					>
						<button
							type="button"
							aria-expanded={isOpen}
							aria-controls={detailId}
							onClick={() => setOpen(isOpen ? null : category.id)}
							className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto_1rem] items-center gap-x-3 py-2.5 text-left"
						>
							<CategoryBadge category={category} />
							<span className="min-w-0">
								<span className="block truncate text-base font-medium">
									{category.name}
								</span>
								{budget > 0 && (
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
													: categoryColor(category),
											}}
										/>
									</span>
								)}
								<span
									className={cn(
										"mt-1 block text-xs",
										over ? "font-medium text-negative" : "text-muted",
									)}
								>
									{budget === 0 ? (
										"No budget"
									) : over ? (
										<>
											Over by <Amount value={spent - budget} />
										</>
									) : (
										<>
											<Amount value={budget - spent} /> left of{" "}
											<Amount value={budget} />
										</>
									)}
								</span>
							</span>
							<Amount
								value={spent}
								className="self-start pt-0.5 text-base font-semibold"
							/>
							<Icon
								icon={ArrowDown01Icon}
								size={16}
								stroke={2}
								className={cn(
									"mt-1 self-start text-muted transition-transform duration-200",
									isOpen && "rotate-180",
								)}
							/>
						</button>
						{isOpen && (
							<div id={detailId} className="detail-in pb-2 pl-[3.25rem]">
								{slips.length > 0 ? (
									<ul>
										{slips.map((e) => (
											<SlipRow key={e.id} entry={e} fresh={e.id === freshId} />
										))}
									</ul>
								) : (
									<p className="py-2 text-sm text-muted">
										Nothing in {category.name.toLowerCase()} this month.
									</p>
								)}
							</div>
						)}
					</li>
				);
			})}
		</ul>
	);
}
