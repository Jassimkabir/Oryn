import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { balances, useBook } from "#/lib/book";
import type { Account } from "#/lib/model";
import { cn } from "#/lib/utils";
import { Amount } from "#/ui/Amount";
import { AccountForm } from "#/ui/BookForms";
import { ACCOUNT_LABEL, AccountBadge } from "#/ui/Icon";
import { Screen } from "#/ui/Screen";
import { AddRow, Group, ItemRow } from "#/ui/SettingsList";

export const Route = createFileRoute("/_app/settings/accounts")({
	component: Accounts,
});

function Accounts() {
	const book = useBook();
	const bal = useMemo(() => balances(book), [book]);
	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Account | undefined>();
	const sorted = [...book.accounts].sort((a, b) => a.sort - b.sort);
	const active = sorted.filter((a) => !a.archived);
	const hidden = sorted.filter((a) => a.archived);

	function edit(a?: Account) {
		setEditing(a);
		setOpen(true);
	}

	const row = (a: Account) => {
		const v = bal.get(a.id) ?? 0;
		return (
			<ItemRow
				key={a.id}
				leading={<AccountBadge kind={a.kind} size={36} />}
				label={a.name}
				sub={ACCOUNT_LABEL[a.kind]}
				value={
					<Amount
						value={v}
						className={cn("text-ink", v < 0 && "text-negative")}
					/>
				}
				onClick={() => edit(a)}
				dim={a.archived}
			/>
		);
	};

	return (
		<Screen title="Accounts" back={{ to: "/settings", label: "Settings" }}>
			<Group note="Each balance starts from the figure you set and moves with every entry.">
				{active.map(row)}
				<AddRow label="Add an account" onClick={() => edit()} />
			</Group>
			{hidden.length > 0 && (
				<Group
					title="Hidden"
					note="Hidden accounts keep their history. Open one and save it to bring it back."
				>
					{hidden.map(row)}
				</Group>
			)}
			<AccountForm open={open} onOpenChange={setOpen} account={editing} />
		</Screen>
	);
}
