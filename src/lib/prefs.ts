import { Store } from "@tanstack/store";

/** Each theme is an ambient light of two hues behind the glass, with its own accent. */
export const PALETTES = [
	{ id: "original", name: "Original", note: "Lavender and sky" },
	{ id: "pink", name: "Pink", note: "Rose and peach" },
	{ id: "canary", name: "Canary", note: "Sunlight and leaf" },
	{ id: "green", name: "Green", note: "Sage and violet" },
	{ id: "sky", name: "Sky", note: "Ocean and lagoon" },
	{ id: "mint", name: "Mint", note: "The Oryn mint" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];
export type Mode = "system" | "light" | "dark";
export type TextSize = "standard" | "large" | "larger";
export type GlassLevel = "clear" | "frosted" | "solid";
const GLASS_LEVELS: GlassLevel[] = ["clear", "frosted", "solid"];

export type Prefs = {
	palette: PaletteId;
	mode: Mode;
	amoled: boolean;
	glass: GlassLevel;
	glow: boolean;
	textSize: TextSize;
	reduceMotion: boolean;
	privacy: boolean;
	currency: string;
	numberLocale: string | null;
};

export const DEFAULT_PREFS: Prefs = {
	palette: "original",
	mode: "system",
	amoled: false,
	glass: "frosted",
	glow: true,
	textSize: "standard",
	reduceMotion: false,
	privacy: false,
	currency: "INR",
	numberLocale: null,
};

export const PREFS_KEY = "oryn:prefs";

/** Themes from the earlier design, mapped onto the nearest sheet. */
const LEGACY_PALETTE: Record<string, PaletteId> = {
	onyx: "original",
	emerald: "green",
	sapphire: "sky",
	rose: "pink",
	peacock: "sky",
	champagne: "canary",
};

function normalise(raw: Partial<Prefs> & { palette?: string }): Prefs {
	const p = { ...DEFAULT_PREFS, ...raw } as Prefs;
	const legacy = LEGACY_PALETTE[p.palette as string];
	if (legacy) p.palette = legacy;
	if (!PALETTES.some((x) => x.id === p.palette))
		p.palette = DEFAULT_PREFS.palette;
	if (!GLASS_LEVELS.includes(p.glass)) p.glass = DEFAULT_PREFS.glass;
	return p;
}

function load(): Prefs {
	if (typeof window === "undefined") return DEFAULT_PREFS;
	try {
		const raw = window.localStorage.getItem(PREFS_KEY);
		return raw ? normalise(JSON.parse(raw)) : DEFAULT_PREFS;
	} catch {
		return DEFAULT_PREFS;
	}
}

export const prefsStore = new Store<Prefs>(load());

/** The mode actually showing (system resolved), for things that pick assets by mode. */
export const shownMode = new Store<"light" | "dark">("light");

export function setPrefs(patch: Partial<Prefs>) {
	prefsStore.setState((s) => ({ ...s, ...patch }));
	try {
		window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefsStore.state));
	} catch {
		/* storage unavailable: prefs still apply for this session */
	}
	applyPrefs(prefsStore.state);
}

const TEXT_SCALE: Record<TextSize, string> = {
	standard: "1",
	large: "1.125",
	larger: "1.25",
};

export function resolveMode(mode: Mode): "light" | "dark" {
	if (mode !== "system") return mode;
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

/** Writes prefs onto <html> and keeps the status bar (theme-color) in step. */
export function applyPrefs(p: Prefs) {
	const root = document.documentElement;
	const mode = resolveMode(p.mode);
	root.dataset.theme = mode;
	if (shownMode.state !== mode) shownMode.setState(() => mode);
	root.dataset.palette = p.palette;
	root.dataset.amoled = String(p.amoled);
	root.dataset.glass = p.glass;
	root.dataset.glow = String(p.glow);
	root.dataset.reduceMotion = String(p.reduceMotion);
	root.dataset.privacy = String(p.privacy);
	root.style.setProperty("--text-scale", TEXT_SCALE[p.textSize]);
	const sheet = getComputedStyle(root).getPropertyValue("--sheet").trim();
	for (const meta of document.querySelectorAll<HTMLMetaElement>(
		'meta[name="theme-color"]',
	)) {
		meta.content = sheet;
		meta.removeAttribute("media");
	}
	applyThemeIcons(p.palette, mode);
}

/**
 * The logo always wears the current theme: scripts/icons.mjs builds one set per
 * theme and mode. The tab icon changes at once; iOS takes the apple-touch-icon
 * present when "Add to Home Screen" is tapped. Android's installed icon comes
 * from the manifest and stays the brand mint.
 */
function applyThemeIcons(palette: PaletteId, mode: "light" | "dark") {
	const base = `/icons/${palette}/${mode}`;
	const set = (selector: string, href: string) => {
		const link = document.head.querySelector<HTMLLinkElement>(selector);
		if (link && link.getAttribute("href") !== href)
			link.setAttribute("href", href);
	};
	set('link[rel="icon"][type="image/svg+xml"]', `${base}/mark.svg`);
	set('link[rel="icon"][sizes="32x32"]', `${base}/favicon-32.png`);
	set('link[rel="icon"][sizes="64x64"]', `${base}/favicon-64.png`);
	set('link[rel="apple-touch-icon"]', `${base}/apple-touch-icon.png`);
}

/** The vector logo in a theme's colour, for use inside the app. */
export function logoFor(palette: PaletteId, mode: "light" | "dark") {
	return `/icons/${palette}/${mode}/mark.svg`;
}

/**
 * Inline, render-blocking script: applies saved prefs before first paint so the
 * wrong theme never flashes. Kept tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=${JSON.stringify(DEFAULT_PREFS)};var L=${JSON.stringify(LEGACY_PALETTE)};var p=d;try{p=Object.assign({},d,JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_KEY)})||"{}"))}catch(e){}if(L[p.palette])p.palette=L[p.palette];var r=document.documentElement;var m=p.mode==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p.mode;r.dataset.theme=m;r.dataset.palette=p.palette;r.dataset.amoled=String(p.amoled);r.dataset.glass=["clear","frosted","solid"].indexOf(p.glass)<0?"frosted":p.glass;r.dataset.glow=String(p.glow!==false);r.dataset.reduceMotion=String(p.reduceMotion);r.dataset.privacy=String(p.privacy);r.style.setProperty("--text-scale",{standard:"1",large:"1.125",larger:"1.25"}[p.textSize]||"1")}catch(e){}})();`;
