/** Money is always integer minor units (paise for INR). Never floats. */
export type Minor = number;

/** Usual number locale per currency; the user can override it in Settings. */
const CURRENCY_LOCALE: Record<string, string> = {
	INR: "en-IN",
	USD: "en-US",
	EUR: "de-DE",
	GBP: "en-GB",
	AED: "en-AE",
	SGD: "en-SG",
	JPY: "ja-JP",
	AUD: "en-AU",
	CAD: "en-CA",
};

export const CURRENCIES = Object.keys(CURRENCY_LOCALE);

export function localeFor(currency: string, override?: string | null) {
	return override ?? CURRENCY_LOCALE[currency] ?? "en-IN";
}

const cache = new Map<string, Intl.NumberFormat>();
function fmt(locale: string, opts: Intl.NumberFormatOptions) {
	const key = locale + JSON.stringify(opts);
	let f = cache.get(key);
	if (!f) {
		f = new Intl.NumberFormat(locale, opts);
		cache.set(key, f);
	}
	return f;
}

function fractionDigits(currency: string) {
	return (
		fmt("en", { style: "currency", currency }).resolvedOptions()
			.maximumFractionDigits ?? 2
	);
}

export function toMajor(minor: Minor, currency: string) {
	return minor / 10 ** fractionDigits(currency);
}

export type MoneyFormat = {
	currency: string;
	locale?: string | null;
	showFraction?: boolean;
};

/** ₹1,00,00,000.00 style. Fractions hidden by default when they are zero. */
export function formatMoney(
	minor: Minor,
	{ currency, locale, showFraction }: MoneyFormat,
) {
	const value = toMajor(minor, currency);
	const digits = fractionDigits(currency);
	const hasFraction = Math.round(minor) % 10 ** digits !== 0;
	return fmt(localeFor(currency, locale), {
		style: "currency",
		currency,
		minimumFractionDigits: showFraction || hasFraction ? digits : 0,
		maximumFractionDigits: digits,
	}).format(value);
}

/** Split into symbol and number so the symbol can be set in Geist beside serif digits. */
export function moneyParts(minor: Minor, opts: MoneyFormat) {
	const value = toMajor(minor, opts.currency);
	const digits = fractionDigits(opts.currency);
	const hasFraction = Math.round(minor) % 10 ** digits !== 0;
	const parts = fmt(localeFor(opts.currency, opts.locale), {
		style: "currency",
		currency: opts.currency,
		minimumFractionDigits: opts.showFraction || hasFraction ? digits : 0,
		maximumFractionDigits: digits,
	}).formatToParts(value);
	const symbol = parts.find((p) => p.type === "currency")?.value ?? "";
	const sign = parts.some((p) => p.type === "minusSign") ? "−" : "";
	const number = parts
		.filter((p) => !["currency", "literal", "minusSign"].includes(p.type))
		.map((p) => p.value)
		.join("");
	return { symbol, sign, number };
}

/** Short form for charts: ₹1.2L, ₹3.4Cr in en-IN; ₹1.2K/M elsewhere. */
export function formatCompact(minor: Minor, { currency, locale }: MoneyFormat) {
	const value = toMajor(minor, currency);
	const loc = localeFor(currency, locale);
	if (loc === "en-IN") {
		const symbol = moneyParts(0, { currency, locale }).symbol;
		const abs = Math.abs(value);
		const sign = value < 0 ? "−" : "";
		const trim = (n: number) =>
			n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
		if (abs >= 1e7) return `${sign}${symbol}${trim(abs / 1e7)}Cr`;
		if (abs >= 1e5) return `${sign}${symbol}${trim(abs / 1e5)}L`;
		if (abs >= 1e3) return `${sign}${symbol}${trim(abs / 1e3)}K`;
		return `${sign}${symbol}${Math.round(abs)}`;
	}
	return fmt(loc, {
		style: "currency",
		currency,
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(value);
}

/** Parse a typed keypad expression like "120+45.5" into minor units. Returns null when invalid. */
export function evaluateEntry(expr: string, currency: string): Minor | null {
	const clean = expr.replace(/[^\d.+−-]/g, "").replace(/−/g, "-");
	if (!clean || !/^\d*\.?\d*([+-]\d*\.?\d*)*$/.test(clean)) return null;
	const terms = clean.match(/[+-]?[^+-]+/g) ?? [];
	let total = 0;
	for (const t of terms) {
		const n = Number(t);
		if (Number.isNaN(n)) return null;
		total += n;
	}
	const minor = Math.round(total * 10 ** fractionDigits(currency));
	return minor > 0 ? minor : null;
}
