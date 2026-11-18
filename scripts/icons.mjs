// Builds every logo and app icon from the vector mark (scripts/vectorize-mark.mjs).
// Provenance: brand/README.md.
//
// The logo always wears the current theme's colour: for each theme and each mode the
// mark is re-tinted to that theme's stamp ink (its form kept) and set on that
// theme's sheet. Mint is the brand's own artwork, untouched.
// Colours are read from src/styles.css so icons never drift from the app.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { markSvg, texture } from "./mark-svg.mjs";

const geometry = JSON.parse(await readFile("brand/mark/geometry.json", "utf8"));
const FACE = await readFile("brand/mark/face.png");
const BAND = await readFile("brand/mark/band.png");
const { width: MW, height: MH } = geometry;

/* ── theme tokens from styles.css ── */
const css = await readFile("src/styles.css", "utf8");
function block(selector) {
	const i = css.indexOf(`${selector} {`);
	if (i < 0) return {};
	const body = css.slice(i, css.indexOf("}", i));
	return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
function oklchHex(value) {
	const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
	if (!m) throw new Error(`not oklch: ${value}`);
	const [L, C, h] = m.slice(1).map(Number);
	const a = C * Math.cos((h * Math.PI) / 180);
	const b = C * Math.sin((h * Math.PI) / 180);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const lin = [
		4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
	];
	const enc = (v) => {
		const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
		return Math.round(Math.min(1, Math.max(0, c)) * 255);
	};
	return `#${lin.map((v) => enc(v).toString(16).padStart(2, "0")).join("")}`;
}
const PALETTES = [...css.matchAll(/\[data-theme="dark"\]\[data-palette="(\w+)"\]/g)].map((m) => m[1]);
function tokens(palette, mode) {
	const t = { ...block(`[data-theme="${mode}"]`), ...block(`[data-theme="${mode}"][data-palette="${palette}"]`) };
	return { ground: oklchHex(t.sheet), groundHi: oklchHex(t.sheet), metal: oklchHex(t.stamp) };
}

/* ── the mark in a theme's metal ── */
async function tint(png, metal) {
	if (!metal) return png;
	const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
	const rgb = [1, 3, 5].map((i) => Number.parseInt(metal.slice(i, i + 2), 16));
	const out = Buffer.alloc(data.length);
	for (let i = 0; i < data.length; i += info.channels) {
		// Luminance carries the ribbon's form; the mint highlight (~0.93) maps to full metal.
		const y = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
		const t = Math.min(1, y / 0.93) ** 1.15;
		for (let k = 0; k < 3; k++) out[i + k] = Math.round(rgb[k] * t);
	}
	return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
}
async function themedMark(metal) {
	return markSvg(geometry, await texture(await tint(FACE, metal), MW, MH), await texture(await tint(BAND, metal), MW, MH));
}

/* ── rasterising (librsvg at the exact output size, so edges stay crisp) ── */
const renderMark = (svg, width) =>
	sharp(Buffer.from(svg), { density: (72 * width) / MW })
		.resize({ width })
		.png()
		.toBuffer();

const tile = (size, { groundHi, ground }) =>
	Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
	<defs><radialGradient id="g" cx="30%" cy="22%" r="95%">
		<stop offset="0" stop-color="${groundHi}"/><stop offset="1" stop-color="${ground}"/>
	</radialGradient></defs>
	<rect width="${size}" height="${size}" fill="url(#g)"/></svg>`);

async function appIcon(file, size, scale, svg, colours) {
	const mark = await renderMark(svg, Math.round(size * scale));
	await sharp(tile(size, colours)).composite([{ input: mark, gravity: "center" }]).png().toFile(file);
}
async function favicon(file, size, svg) {
	const pad = Math.max(1, Math.round(size * 0.04));
	const mark = await renderMark(svg, size - pad * 2);
	await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.composite([{ input: mark, gravity: "center" }])
		.png()
		.toFile(file);
}

await rm("public/icons", { recursive: true, force: true });
for (const palette of PALETTES) {
	for (const mode of ["dark", "light"]) {
		const colours = tokens(palette, mode);
		// Mint is the brand artwork itself; every other theme wears its own metal.
		const svg = await themedMark(palette === "mint" ? null : colours.metal);
		const dir = `public/icons/${palette}/${mode}`;
		await mkdir(dir, { recursive: true });
		await writeFile(`${dir}/mark.svg`, svg);
		await appIcon(`${dir}/apple-touch-icon.png`, 180, 0.62, svg, colours);
		await appIcon(`${dir}/icon-512.png`, 512, 0.62, svg, colours);
		await favicon(`${dir}/favicon-32.png`, 32, svg);
		await favicon(`${dir}/favicon-64.png`, 64, svg);
	}
	console.log(palette);
}

// Install defaults (manifest, first paint): the brand's own mint on deep teal.
const mint = tokens("mint", "dark");
const mintSvg = await themedMark(null);
await appIcon("public/apple-touch-icon.png", 180, 0.62, mintSvg, mint);
await appIcon("public/icon-192.png", 192, 0.62, mintSvg, mint);
await appIcon("public/icon-512.png", 512, 0.62, mintSvg, mint);
await appIcon("public/icon-maskable-512.png", 512, 0.5, mintSvg, mint); // inside the safe zone
await favicon("public/favicon-32.png", 32, mintSvg);
await favicon("public/favicon-64.png", 64, mintSvg);
await writeFile("public/favicon.svg", mintSvg);
console.log("defaults (mint)");
