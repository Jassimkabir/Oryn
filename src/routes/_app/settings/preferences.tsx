import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useState } from "react";
import { toast } from "sonner";
import { CURRENCIES, formatMoney, localeFor } from "#/lib/money";
import { prefsStore, setPrefs } from "#/lib/prefs";
import { Screen } from "#/ui/Screen";
import { Group } from "#/ui/SettingsList";

export const Route = createFileRoute("/_app/settings/preferences")({
	component: Preferences,
});

const names =
	typeof Intl.DisplayNames === "function"
		? new Intl.DisplayNames(["en-IN"], { type: "currency" })
		: null;

const LOCALES = [
	{ value: "", label: "Match currency" },
	{ value: "en-IN", label: "1,00,000.00 (Indian)" },
	{ value: "en-US", label: "100,000.00" },
	{ value: "de-DE", label: "100.000,00" },
	{ value: "fr-FR", label: "100 000,00" },
];

function Preferences() {
	const p = useStore(prefsStore, (s) => s);
	const [pending, setPending] = useState<string | null>(null);
	const sample = 1_23_45_678_90;

	return (
		<Screen title="Currency" back={{ to: "/settings", label: "Settings" }}>
			<Group
				title="Base currency"
				note="Changing the currency changes how amounts are shown. It doesn't convert amounts you've already logged."
			>
				<li className="px-4 py-3">
					<label className="block">
						<span className="sr-only">Base currency</span>
						<select
							value={pending ?? p.currency}
							onChange={(e) =>
								setPending(
									e.target.value === p.currency ? null : e.target.value,
								)
							}
							className="h-11 w-full rounded-lg bg-transparent text-base text-ink focus-visible:outline-2 focus-visible:outline-[color:var(--stamp)]"
						>
							{CURRENCIES.map((c) => (
								<option key={c} value={c}>
									{c} · {names?.of(c) ?? c}
								</option>
							))}
						</select>
					</label>
					{pending && (
						<div className="mt-2 flex items-center justify-between gap-3 border-t border-rule pt-3">
							<p className="text-sm text-muted">
								Show everything in {pending}?
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									className="pressable h-9 rounded-full px-3 text-sm font-medium text-stamp"
									onClick={() => setPending(null)}
								>
									Cancel
								</button>
								<button
									type="button"
									className="pressable h-9 rounded-full btn-stamp px-4 text-sm font-semibold"
									onClick={() => {
										const prev = p.currency;
										setPrefs({ currency: pending });
										setPending(null);
										toast(`Amounts now show in ${pending}`, {
											action: {
												label: "Undo",
												onClick: () => setPrefs({ currency: prev }),
											},
										});
									}}
								>
									Change
								</button>
							</div>
						</div>
					)}
				</li>
			</Group>

			<Group
				title="Number format"
				note={`Preview: ${formatMoney(sample, { currency: p.currency, locale: p.numberLocale })}`}
			>
				<li className="px-4 py-3">
					<label className="block">
						<span className="sr-only">Number format</span>
						<select
							value={p.numberLocale ?? ""}
							onChange={(e) =>
								setPrefs({ numberLocale: e.target.value || null })
							}
							className="h-11 w-full rounded-lg bg-transparent text-base text-ink focus-visible:outline-2 focus-visible:outline-[color:var(--stamp)]"
						>
							{LOCALES.map((l) => (
								<option key={l.value} value={l.value}>
									{l.value === ""
										? `${l.label} (${localeFor(p.currency)})`
										: l.label}
								</option>
							))}
						</select>
					</label>
				</li>
			</Group>
		</Screen>
	);
}
