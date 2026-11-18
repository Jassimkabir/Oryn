import NumberFlow from "@number-flow/react";
import { useStore } from "@tanstack/react-store";
import {
	formatMoney,
	localeFor,
	type Minor,
	moneyParts,
	toMajor,
} from "#/lib/money";
import { prefsStore } from "#/lib/prefs";
import { cn, prefersReducedMotion } from "#/lib/utils";

export function useMoneyFormat() {
	const currency = useStore(prefsStore, (s) => s.currency);
	const locale = useStore(prefsStore, (s) => s.numberLocale);
	return { currency, locale };
}

/** Inline amount: tabular figures, never truncated. Privacy mode blurs it. */
export function Amount({
	value,
	className,
	sign,
}: {
	value: Minor;
	className?: string;
	sign?: boolean;
}) {
	const f = useMoneyFormat();
	return (
		<span className={cn("num whitespace-nowrap privacy-blur", className)}>
			{sign && value > 0 ? "+" : ""}
			{formatMoney(value, f)}
		</span>
	);
}

/**
 * The month figure: Geist at display size, the currency symbol small in printed ink.
 * Digits roll old → new only when the value really changes (never on mount).
 */
export function Figure({
	value,
	className,
}: {
	value: Minor;
	className?: string;
}) {
	const f = useMoneyFormat();
	const reduce = useStore(prefsStore, (s) => s.reduceMotion);
	const { symbol } = moneyParts(value, f);
	return (
		<p className={cn("figure privacy-blur", className)}>
			<span className="sr-only">{formatMoney(value, f)}</span>
			<span className="figure-currency" aria-hidden>
				{symbol}
			</span>
			<NumberFlow
				aria-hidden
				value={toMajor(value, f.currency)}
				locales={localeFor(f.currency, f.locale)}
				format={{ maximumFractionDigits: 0 }}
				animated={!reduce && !prefersReducedMotion()}
				willChange={false}
				transformTiming={{
					duration: 450,
					easing: "cubic-bezier(0.22, 1, 0.36, 1)",
				}}
				spinTiming={{ duration: 450, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
				opacityTiming={{ duration: 250, easing: "ease-out" }}
			/>
		</p>
	);
}
