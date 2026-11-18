import {
	BankIcon,
	CloudIcon,
	Coins01Icon,
	LockPasswordIcon,
	Logout01Icon,
	PaintBoardIcon,
	RepeatIcon,
	Tag01Icon,
	ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { toast } from "sonner";
import { useBook } from "#/lib/book";
import { PALETTES, prefsStore, setPrefs } from "#/lib/prefs";
import {
	type SyncState,
	setPassword,
	signOut,
	syncEnabled,
	syncNow,
	syncStore,
} from "#/lib/sync";
import { haptic } from "#/lib/utils";
import { Field, FormActions, FormHead, fieldClass } from "#/ui/Form";
import { Logo } from "#/ui/Logo";
import { Screen } from "#/ui/Screen";
import { Group, IconTile, LinkRow, ToggleRow } from "#/ui/SettingsList";
import { Sheet } from "#/ui/Sheet";

export const Route = createFileRoute("/_app/settings/")({
	component: Settings,
});

const ago = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
function statusLine(s: SyncState) {
	switch (s.status) {
		case "off":
			return "Off. Everything stays on this phone.";
		case "loading":
		case "syncing":
			return s.pending > 0
				? `Sending ${s.pending} ${s.pending === 1 ? "change" : "changes"}`
				: "Syncing";
		case "offline":
			return s.pending > 0
				? `Offline. ${s.pending} ${s.pending === 1 ? "change waits" : "changes wait"} to send.`
				: "Offline. Changes send when you reconnect.";
		case "error":
			return `Couldn't sync: ${s.error ?? "unknown error"}`;
		case "synced": {
			if (!s.lastSync) return "Up to date";
			const mins = Math.round((s.lastSync - Date.now()) / 60_000);
			return `Up to date · ${mins === 0 ? "just now" : ago.format(mins, "minute")}`;
		}
		default:
			return "Signed out";
	}
}

function Settings() {
	const p = useStore(prefsStore, (s) => s);
	const sync = useStore(syncStore, (s) => s);
	const book = useBook();
	const [pwOpen, setPwOpen] = useState(false);
	const palette = PALETTES.find((x) => x.id === p.palette)?.name ?? "";
	const mode = { system: "System", light: "Light", dark: "Dark" }[p.mode];
	const accounts = book.accounts.filter((a) => !a.archived).length;
	const categories = book.categories.filter((c) => !c.archived).length;
	const recurring = book.recurring.filter((r) => r.active).length;

	async function out() {
		if (
			sync.pending > 0 &&
			!window.confirm(
				`${sync.pending} ${sync.pending === 1 ? "change hasn't" : "changes haven't"} reached your account yet and will be lost. Sign out anyway?`,
			)
		)
			return;
		await signOut();
	}

	return (
		<Screen title="Settings">
			<Group
				title="Account and sync"
				note={
					syncEnabled
						? "Every change saves on this phone first, then goes to your account."
						: "Connect the database to sign in and keep your data on every phone."
				}
			>
				<li className="flex min-h-14 items-center gap-3 px-4 py-2.5">
					<IconTile icon={CloudIcon} color="oklch(0.6 0.13 230)" />
					<span className="min-w-0 flex-1">
						<span className="block truncate text-base">
							{sync.email ??
								(syncEnabled ? "Not signed in" : "This phone only")}
						</span>
						<span
							className={
								sync.status === "error"
									? "mt-0.5 block text-xs text-negative"
									: "mt-0.5 block text-xs text-muted"
							}
						>
							{statusLine(sync)}
						</span>
					</span>
					{syncEnabled && sync.userId && sync.status !== "syncing" && (
						<button
							type="button"
							onClick={() => {
								haptic("tap");
								void syncNow();
							}}
							className="pressable h-9 shrink-0 rounded-full bg-well px-3 text-sm font-medium"
						>
							Sync now
						</button>
					)}
				</li>
				{sync.userId && (
					<>
						<ActionRow
							icon={LockPasswordIcon}
							color="oklch(0.55 0.08 260)"
							label="Set a password"
							onClick={() => setPwOpen(true)}
						/>
						<ActionRow
							icon={Logout01Icon}
							color="oklch(0.58 0.17 25)"
							label="Sign out"
							onClick={() => void out()}
						/>
					</>
				)}
			</Group>

			<Group title="Money">
				<LinkRow
					to="/settings/accounts"
					label="Accounts"
					icon={BankIcon}
					color="oklch(0.6 0.13 250)"
					value={String(accounts)}
				/>
				<LinkRow
					to="/settings/categories"
					label="Categories and budgets"
					icon={Tag01Icon}
					color="oklch(0.62 0.13 155)"
					value={String(categories)}
				/>
				<LinkRow
					to="/settings/recurring"
					label="Recurring payments"
					icon={RepeatIcon}
					color="oklch(0.64 0.15 40)"
					value={recurring ? String(recurring) : "None"}
				/>
				<LinkRow
					to="/settings/preferences"
					label="Currency and format"
					icon={Coins01Icon}
					color="oklch(0.6 0.13 70)"
					value={p.currency}
				/>
			</Group>

			<Group title="Look and feel">
				<LinkRow
					to="/settings/appearance"
					label="Appearance"
					icon={PaintBoardIcon}
					color="oklch(0.58 0.17 300)"
					value={`${palette} · ${mode}`}
				/>
			</Group>
			<Group
				title="Privacy"
				note="Blurs every amount until you turn it off. Handy in public."
			>
				<ToggleRow
					label="Hide amounts"
					icon={ViewOffSlashIcon}
					color="oklch(0.55 0.1 240)"
					checked={p.privacy}
					onChange={(v) => setPrefs({ privacy: v })}
				/>
			</Group>
			<div className="mt-12 flex flex-col items-center gap-2 pb-2">
				<Logo size={44} />
				<p className="text-sm font-semibold">Oryn</p>
			</div>
			<PasswordSheet open={pwOpen} onOpenChange={setPwOpen} />
		</Screen>
	);
}

function ActionRow({
	icon,
	color,
	label,
	onClick,
}: {
	icon: Parameters<typeof IconTile>[0]["icon"];
	color: string;
	label: string;
	onClick: () => void;
}) {
	return (
		<li className="relative after:absolute after:right-0 after:bottom-0 after:left-[3.75rem] after:h-px after:bg-rule last:after:hidden">
			<button
				type="button"
				onClick={onClick}
				className="flex min-h-14 w-full items-center gap-3 px-4 text-left active:bg-well"
			>
				<IconTile icon={icon} color={color} />
				<span className="text-base">{label}</span>
			</button>
		</li>
	);
}

function PasswordSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const [pw, setPw] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const ok = pw.length >= 8;

	async function save() {
		if (!ok || busy) return;
		setBusy(true);
		setError(null);
		try {
			await setPassword(pw);
			haptic("success");
			setPw("");
			onOpenChange(false);
			toast("Password set. You can sign in with it next time.");
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setBusy(false);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange} title="Set a password">
			<form
				className="px-5 pt-1"
				onSubmit={(e) => {
					e.preventDefault();
					void save();
				}}
			>
				<FormHead
					title="Set a password"
					note="Optional. You can always sign in with an emailed code instead."
				/>
				<Field label="New password" hint="At least 8 characters." error={error}>
					<input
						type="password"
						value={pw}
						onChange={(e) => setPw(e.target.value)}
						autoComplete="new-password"
						className={fieldClass}
					/>
				</Field>
				<FormActions canSave={ok && !busy} label="Save password" />
			</form>
		</Sheet>
	);
}
