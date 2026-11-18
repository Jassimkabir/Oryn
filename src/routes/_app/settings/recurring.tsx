import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useBook } from "#/lib/book";
import type { Recurring } from "#/lib/model";
import { Amount } from "#/ui/Amount";
import { freqLabel, RecurringForm } from "#/ui/BookForms";
import { CategoryBadge, TransferBadge } from "#/ui/Icon";
import { Screen } from "#/ui/Screen";
import { AddRow, Group, ItemRow } from "#/ui/SettingsList";

export const Route = createFileRoute("/_app/settings/recurring")({
	component: RecurringList,
});

const dateFmt = new Intl.DateTimeFormat("en-IN", {
	day: "numeric",
	month: "short",
});
function nextLabel(d: string) {
	const [y, m, day] = d.split("-").map(Number) as [number, number, number];
	return dateFmt.format(new Date(y, m - 1, day));
}

function RecurringList() {
	const book = useBook();
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Recurring | undefined>();
	const cats = new Map(book.categories.map((c) => [c.id, c]));
	const list = [...book.recurring].sort(
		(a, b) =>
			Number(b.active) - Number(a.active) || a.nextOn.localeCompare(b.nextOn),
	);

	function edit(r?: Recurring) {
		setEditing(r);
		setOpen(true);
	}

	return (
		<Screen title="Recurring" back={{ to: "/settings", label: "Settings" }}>
			<Group note="Automatic ones are added on the day they are due. The rest wait on Overview for you to confirm.">
				{list.map((r) => (
					<ItemRow
						key={r.id}
						leading={
							r.kind === "transfer" ? (
								<TransferBadge size={36} />
							) : (
								<CategoryBadge
									category={r.category ? cats.get(r.category) : undefined}
									size={36}
								/>
							)
						}
						label={r.payee}
						sub={
							r.active
								? `${freqLabel(r.freq, r.every)} · next ${nextLabel(r.nextOn)}${r.autoPost ? "" : " · asks first"}`
								: "Paused"
						}
						value={
							<Amount
								value={r.amount}
								sign={r.kind === "income"}
								className={r.kind === "income" ? "text-positive" : "text-ink"}
							/>
						}
						onClick={() => edit(r)}
						dim={!r.active}
					/>
				))}
				<AddRow label="Add a recurring payment" onClick={() => edit()} />
			</Group>
			<RecurringForm open={open} onOpenChange={setOpen} recurring={editing} />
		</Screen>
	);
}
