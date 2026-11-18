// Dev screenshots at phone size using the locally installed Chrome (no browser download).
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE ?? "http://localhost:3000";
const out = process.argv[2] ?? ".impeccable/review/shots";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });

async function shot(name, { path = "/", prefs = {}, scheme = "dark", action } = {}) {
	const ctx = await browser.newContext({ ...devices["iPhone 15 Pro"], colorScheme: scheme });
	await ctx.addInitScript((p) => localStorage.setItem("oryn:prefs", JSON.stringify(p)), prefs);
	const page = await ctx.newPage();
	const errors = [];
	page.on("pageerror", (e) => errors.push(e.message));
	page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
	await page.goto(base + path, { waitUntil: "networkidle" });
	await page.waitForTimeout(400);
	if (action) await action(page);
	await page.screenshot({ path: `${out}/${name}.png` });
	if (errors.length) console.log(name, "ERRORS:", errors.slice(0, 3));
	await ctx.close();
	console.log("shot", name);
}

const only = process.env.ONLY?.split(",");
const all = {
	"overview-light": { scheme: "light" },
	"overview-dark": {},
	"overview-pink": { prefs: { palette: "pink", mode: "light" } },
	"overview-canary": { prefs: { palette: "canary", mode: "light" } },
	"overview-sky-dark": { prefs: { palette: "sky", mode: "dark" } },
	"overview-mint": { prefs: { palette: "mint", mode: "light" } },
	"overview-worst": { path: "/?data=worst", scheme: "light" },
	"overview-empty": { path: "/?data=empty", scheme: "light" },
	"overview-scrolled": {
		scheme: "light",
		action: async (p) => {
			await p.mouse.wheel(0, 700);
			await p.waitForTimeout(400);
		},
	},
	"category-open": {
		scheme: "light",
		action: async (p) => {
			await p.getByRole("button", { name: /Groceries/ }).first().click();
			await p.waitForTimeout(400);
		},
	},
	"quick-add": {
		scheme: "light",
		action: async (p) => {
			await p.getByRole("button", { name: "Add an expense" }).click();
			await p.waitForTimeout(700);
			for (const k of ["4", "5", "0"]) await p.getByRole("button", { name: k, exact: true }).click();
			await p.waitForTimeout(200);
		},
	},
	"quick-add-dark": {
		action: async (p) => {
			await p.getByRole("button", { name: "Add an expense" }).click();
			await p.waitForTimeout(700);
		},
	},
	activity: { path: "/activity", scheme: "light" },
	budgets: { path: "/budgets", scheme: "light" },
	settings: { path: "/settings", scheme: "light" },
	appearance: { path: "/settings/appearance", scheme: "light" },
	"appearance-glass": {
		path: "/settings/appearance",
		scheme: "light",
		action: async (p) => {
			await p.getByText("Material").scrollIntoViewIfNeeded();
			await p.waitForTimeout(300);
		},
	},
	"overview-clear": { scheme: "light", prefs: { glass: "clear" } },
	"overview-solid": { scheme: "light", prefs: { glass: "solid" } },
	"appearance-dark": { path: "/settings/appearance" },
	preferences: { path: "/settings/preferences", scheme: "light" },
};
for (const [name, o] of Object.entries(all)) if (!only || only.includes(name)) await shot(name, o);
await browser.close();
