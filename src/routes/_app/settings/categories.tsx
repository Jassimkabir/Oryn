import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { monthBudget, saveCategory, useBook } from "#/lib/book";
import type { Category } from "#/lib/model";
import { Amount } from "#/ui/Amount";
import { CategoryForm } from "#/ui/BookForms";
import { CategoryBadge } from "#/ui/Icon";
import { Screen } from "#/ui/Screen";
import { AddRow, Group, ItemRow } from "#/ui/SettingsList";

export const Route = createFileRoute("/_app/settings/categories")({
	component: Categories,
});

function Categories() {
	const book = useBook();
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Category | undefined>();
	const [newKind, setNewKind] = useState<"expense" | "income">("expense");
	const sorted = [...book.categories].sort((a, b) => a.sort - b.sort);
	const expense = sorted.filter((c) => c.kind === "expense" && !c.archived);
	const income = sorted.filter((c) => c.kind === "income" && !c.archived);
	const hidden = sorted.filter((c) => c.archived);

	function edit(c?: Category, kind: "expense" | "income" = "expense") {
		setEditing(c);
		setNewKind(kind);
		setOpen(true);
	}

	function unhide(c: Category) {
		saveCategory({ ...c, archived: false });
		toast(`${c.name} is back`);
	}

	const row = (c: Category) => (
		<ItemRow
			key={c.id}
			leading={<CategoryBadge category={c} size={36} />}
			label={c.name}
			sub={c.archived ? "Tap to bring it back" : undefined}
			value={
				c.kind === "expense" && !c.archived ? (
					c.budget ? (
						<Amount value={c.budget} />
					) : (
						<span className="text-sm">No budget</span>
					)
				) : undefined
			}
			onClick={() => (c.archived ? unhide(c) : edit(c))}
			dim={c.archived}
		/>
	);

	return (
		<Screen title="Categories" back={{ to: "/settings", label: "Settings" }}>
			<Group
				title="Spending"
				note={
					<>
						Monthly budget in total:{" "}
						<Amount
							value={monthBudget(book.categories)}
							className="font-medium"
						/>
					</>
				}
			>
				{expense.map(row)}
				<AddRow
					label="Add a category"
					onClick={() => edit(undefined, "expense")}
				/>
			</Group>
			<Group title="Income">
				{income.map(row)}
				<AddRow
					label="Add an income category"
					onClick={() => edit(undefined, "income")}
				/>
			</Group>
			{hidden.length > 0 && (
				<Group title="Hidden" note="Past entries keep these categories.">
					{hidden.map(row)}
				</Group>
			)}
			<CategoryForm
				open={open}
				onOpenChange={setOpen}
				category={editing}
				kind={newKind}
			/>
		</Screen>
	);
}
