// Rebuilds the owner-supplied ribbon mark as a resolution-independent SVG.
//
// The source art (brand/oryn-mark-source.png) holds the mark at only ~400 px, so
// edges go soft when scaled. Here every edge becomes vector geometry traced from it:
//   - outer silhouette and hole: radial trace of the alpha edge (sub-pixel), made
//     exactly 180° symmetric, smoothed, fitted with cubic Béziers
//   - the two fold lines where the ribbon twists: traced from the luminance step
// The shading stays the artist's: it is lifted into two smooth colour fields (front
// face, inner band) with every edge pixel removed and in-painted, so the fields hold no
// edges and upscale cleanly. The vector clips supply all the sharpness.
//
// Output: brand/mark/{face.png,band.png,geometry.json} and brand/oryn-mark.svg.
// Run once when the source art changes, then `node scripts/icons.mjs`.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SRC = "brand/oryn-mark-source.png";
const CROP = { left: 451, top: 305, width: 406, height: 375 }; // mark + 4px air

const { data, info } = await sharp(SRC)
	.extract(CROP)
	.ensureAlpha()
	.raw()
	.toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;

/* ── sampling (pixel centres at +0.5, matching SVG user space) ── */
const ch = (x, y, k) => {
	x = Math.min(W - 1, Math.max(0, x));
	y = Math.min(H - 1, Math.max(0, y));
	return data[(y * W + x) * 4 + k];
};
function bilinear(px, py, k) {
	const x = px - 0.5;
	const y = py - 0.5;
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const fx = x - x0;
	const fy = y - y0;
	return (
		ch(x0, y0, k) * (1 - fx) * (1 - fy) +
		ch(x0 + 1, y0, k) * fx * (1 - fy) +
		ch(x0, y0 + 1, k) * (1 - fx) * fy +
		ch(x0 + 1, y0 + 1, k) * fx * fy
	);
}
const alpha = (x, y) => bilinear(x, y, 3) / 255;
const lum = (x, y) =>
	0.2126 * bilinear(x, y, 0) + 0.7152 * bilinear(x, y, 1) + 0.0722 * bilinear(x, y, 2);

/* ── radial trace of outer edge and hole ── */
const N = 1440;
function trace(c) {
	const outer = new Float64Array(N);
	const hole = new Float64Array(N);
	for (let i = 0; i < N; i++) {
		const t = (i / N) * Math.PI * 2;
		const dx = Math.cos(t);
		const dy = Math.sin(t);
		let prev = alpha(c.x, c.y);
		let first = -1;
		let last = -1;
		for (let r = 0.25; r < 300; r += 0.25) {
			const a = alpha(c.x + dx * r, c.y + dy * r);
			if (prev < 0.5 && a >= 0.5 && first < 0) first = r - 0.25 + (0.25 * (0.5 - prev)) / (a - prev);
			if (prev >= 0.5 && a < 0.5) last = r - 0.25 + (0.25 * (prev - 0.5)) / (prev - a);
			prev = a;
		}
		hole[i] = first;
		outer[i] = last;
	}
	return { outer, hole };
}
const pt = (c, i, r) => {
	const t = (i / N) * Math.PI * 2;
	return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r };
};

// Find the symmetry centre: the centre of the outer edge's bounding box.
let c = { x: W / 2, y: H / 2 };
for (let k = 0; k < 3; k++) {
	const { outer } = trace(c);
	const xs = [];
	const ys = [];
	for (let i = 0; i < N; i++) {
		const p = pt(c, i, outer[i]);
		xs.push(p.x);
		ys.push(p.y);
	}
	c = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}
const raw = trace(c);
function symSmooth(arr) {
	const s = new Float64Array(N);
	for (let i = 0; i < N; i++) s[i] = (arr[i] + arr[(i + N / 2) % N]) / 2;
	const out = new Float64Array(N);
	const K = 6; // gaussian-ish window, ±6 samples (±1.5°)
	for (let i = 0; i < N; i++) {
		let sum = 0;
		let w = 0;
		for (let j = -K; j <= K; j++) {
			const wt = Math.exp(-(j * j) / (2 * 3 * 3));
			sum += s[(i + j + N) % N] * wt;
			w += wt;
		}
		out[i] = sum / w;
	}
	return out;
}
const rOuter = symSmooth(raw.outer);
const rHole = symSmooth(raw.hole);
const angIndex = (p) => {
	let t = Math.atan2(p.y - c.y, p.x - c.x);
	if (t < 0) t += Math.PI * 2;
	return (t / (Math.PI * 2)) * N;
};
const rAt = (arr, fi) => {
	const i0 = Math.floor(fi) % N;
	const f = fi - Math.floor(fi);
	return arr[i0] * (1 - f) + arr[(i0 + 1) % N] * f;
};

/* ── fold lines ── */
function foldSamples(x0, x1, y0, y1, dir) {
	const pts = [];
	for (let x = x0; x <= x1; x += 1) {
		let best = 0;
		let by = -1;
		const d = (y) => dir * (lum(x + 0.5, y - 1) - lum(x + 0.5, y + 1));
		for (let y = y0; y <= y1; y += 0.5) {
			if (alpha(x + 0.5, y - 2 * dir) < 0.95 || alpha(x + 0.5, y + 1.25 * dir) < 0.95) continue;
			const v = d(y);
			if (v > best) {
				best = v;
				by = y;
			}
		}
		if (best < 60) continue;
		const a = d(by - 0.5);
		const b = d(by);
		const e = d(by + 0.5);
		const off = (0.5 * (a - e)) / (2 * (a - 2 * b + e) || 1);
		pts.push({ x: x + 0.5, y: by + Math.max(-0.5, Math.min(0.5, off * 0.5)) });
	}
	return pts;
}
// The fold rises into the top of the hole, so sample the top-right one directly and the
// bottom-left one rotated by 180°, then fit one curve to both.
const ox = (CROP.left - 455) * -1; // offset from the earlier crop the probe used
const up = foldSamples(232 + ox, 352 + ox, 20 + ox, 90 + ox, 1);
const low = foldSamples(55 + ox, 178 + ox, 280 + ox, 350 + ox, -1).map((p) => ({
	x: 2 * c.x - p.x,
	y: 2 * c.y - p.y,
}));
const foldPts = [...up, ...low];
function polyfit(pts, deg) {
	const n = deg + 1;
	const A = Array.from({ length: n }, () => new Float64Array(n + 1));
	const sx = (v) => (v - c.x) / 100;
	for (const p of pts) {
		const xs = Array.from({ length: n }, (_, k) => sx(p.x) ** k);
		for (let r = 0; r < n; r++) {
			for (let q = 0; q < n; q++) A[r][q] += xs[r] * xs[q];
			A[r][n] += xs[r] * p.y;
		}
	}
	for (let i = 0; i < n; i++) {
		let m = i;
		for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
		[A[i], A[m]] = [A[m], A[i]];
		for (let r = 0; r < n; r++) {
			if (r === i) continue;
			const f = A[r][i] / A[i][i];
			for (let q = i; q <= n; q++) A[r][q] -= f * A[i][q];
		}
	}
	const coef = A.map((row, i) => row[n] / row[i]);
	return (x) => coef.reduce((s, k, i) => s + k * sx(x) ** i, 0);
}
const fold0 = polyfit(foldPts, 3);
const resid = Math.sqrt(foldPts.reduce((s, p) => s + (fold0(p.x) - p.y) ** 2, 0) / foldPts.length);
const inHole = (p) => Math.hypot(p.x - c.x, p.y - c.y) < rAt(rHole, angIndex(p));
const outside = (p) => Math.hypot(p.x - c.x, p.y - c.y) > rAt(rOuter, angIndex(p));
// The fold curls down into the top of the hole and meets it tangentially, where the
// polynomial cannot follow. Blend the fold onto the hole edge over its last TAPER px so
// it ends in a clean point, as in the source.
const TAPER = 8;
const j1 = up[0].x - 1;
const holeY = (x) => {
	let y = fold0(x);
	for (let g = 0; g < 400 && !inHole({ x, y }); g++) y += 0.05;
	return y;
};
const smooth = (t) => t * t * (3 - 2 * t);
const fold = (x) => {
	if (x >= j1 + TAPER) return fold0(x);
	const t = smooth(Math.min(1, Math.max(0, (j1 + TAPER - x) / TAPER)));
	return fold0(x) + (holeY(x) - fold0(x)) * t;
};
const holeGap = (x) => holeY(x) - fold(x);
let j2 = up[Math.floor(up.length / 2)].x;
for (let g = 0; g < 4000 && !outside({ x: j2, y: fold(j2) }); g++) j2 += 0.05;
console.log("fold", { j1, j2, n: foldPts.length, rms: resid, up: up.length, low: low.length, c });

/* ── regions ── */
const CUT = (70 / 360) * N; // the band has faded into the face well before this angle
function bandPolygon(offset) {
	const poly = [];
	const xa = j1;
	const xb = j2 + 6;
	for (let k = 0; k <= 80; k++) {
		const x = xa + ((xb - xa) * k) / 80;
		poly.push({ x, y: fold(x) });
	}
	const iJ2 = angIndex({ x: xb, y: fold(xb) });
	const iJ1 = angIndex({ x: xa, y: fold(xa) });
	for (let i = iJ2; i <= CUT + N; i += 2) {
		poly.push(pt(c, i % N, rAt(rOuter, i % N) + offset));
	}
	for (let i = CUT + N; i >= iJ1; i -= 2) poly.push(pt(c, i % N, rAt(rHole, i % N) - offset));
	return poly;
}
const rot = (p) => ({ x: 2 * c.x - p.x, y: 2 * c.y - p.y });
const bandA = bandPolygon(4);
const bandB = bandA.map(rot);
const bandTight = bandPolygon(0);
const bandTightB = bandTight.map(rot);
function inPoly(poly, p) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const a = poly[i];
		const b = poly[j];
		if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
			inside = !inside;
	}
	return inside;
}

/* ── colour fields ── */
// A pixel counts as clean shading only if nothing within MARGIN px is an edge:
// fully opaque all round (true perpendicular distance to the silhouette and hole),
// and clear of both fold lines.
const MARGIN = 2.5;
const minAlpha = new Float32Array(W * H).fill(1);
{
	const R = Math.ceil(MARGIN);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			let m = 1;
			for (let dy = -R; dy <= R && m > 0; dy++)
				for (let dx = -R; dx <= R; dx++) {
					if (dx * dx + dy * dy > MARGIN * MARGIN) continue;
					m = Math.min(m, ch(x + dx, y + dy, 3) / 255);
				}
			minAlpha[y * W + x] = m;
		}
}
const foldLine = [];
for (let x = j1 - 10; x <= j2 + 10; x += 0.25) foldLine.push({ x, y: fold(x) });
const nearFold = (p) =>
	[p, rot(p)].some((q) => foldLine.some((f) => (f.x - q.x) ** 2 + (f.y - q.y) ** 2 < (MARGIN + 0.5) ** 2));
const tip = { x: j1, y: fold(j1) };
const nearTip = (p) => [p, rot(p)].some((q) => (q.x - tip.x) ** 2 + (q.y - tip.y) ** 2 < 49);
function edgeDistOK(p) {
	if (nearTip(p)) return false;
	if (minAlpha[Math.floor(p.y) * W + Math.floor(p.x)] < 0.985) return false;
	return !nearFold(p);
}
function field(isBand) {
	const v = new Float32Array(W * H * 3);
	const m = new Uint8Array(W * H);
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const p = { x: x + 0.5, y: y + 0.5 };
			if (!edgeDistOK(p)) continue;
			const b = inPoly(bandTight, p) || inPoly(bandTightB, p);
			if (b !== isBand) continue;
			const i = y * W + x;
			m[i] = 1;
			for (let k = 0; k < 3; k++) v[i * 3 + k] = data[i * 4 + k];
		}
	blurKnown(v, m, 1.1);
	pushPull(v, m, W, H);
	symmetrise(v);
	return v;
}
function blurKnown(v, m, sigma) {
	const R = Math.ceil(sigma * 3);
	const ker = Array.from({ length: 2 * R + 1 }, (_, j) => Math.exp(-((j - R) ** 2) / (2 * sigma * sigma)));
	for (const horiz of [true, false]) {
		const src = v.slice();
		for (let y = 0; y < H; y++)
			for (let x = 0; x < W; x++) {
				const i = y * W + x;
				if (!m[i]) continue;
				let s0 = 0;
				let s1 = 0;
				let s2 = 0;
				let w = 0;
				for (let j = -R; j <= R; j++) {
					const xx = horiz ? x + j : x;
					const yy = horiz ? y : y + j;
					if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
					const q = yy * W + xx;
					if (!m[q]) continue;
					const wt = ker[j + R];
					s0 += src[q * 3] * wt;
					s1 += src[q * 3 + 1] * wt;
					s2 += src[q * 3 + 2] * wt;
					w += wt;
				}
				v[i * 3] = s0 / w;
				v[i * 3 + 1] = s1 / w;
				v[i * 3 + 2] = s2 / w;
			}
	}
}
function pushPull(v, m, w, h) {
	let all = true;
	for (let i = 0; i < w * h; i++) if (!m[i]) all = false;
	if (all || w <= 1 || h <= 1) return;
	const W2 = Math.ceil(w / 2);
	const H2 = Math.ceil(h / 2);
	const v2 = new Float32Array(W2 * H2 * 3);
	const m2 = new Uint8Array(W2 * H2);
	for (let y = 0; y < H2; y++)
		for (let x = 0; x < W2; x++) {
			let n = 0;
			const s = [0, 0, 0];
			for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
				const xx = 2 * x + dx;
				const yy = 2 * y + dy;
				if (xx >= w || yy >= h || !m[yy * w + xx]) continue;
				for (let k = 0; k < 3; k++) s[k] += v[(yy * w + xx) * 3 + k];
				n++;
			}
			if (n) {
				m2[y * W2 + x] = 1;
				for (let k = 0; k < 3; k++) v2[(y * W2 + x) * 3 + k] = s[k] / n;
			}
		}
	pushPull(v2, m2, W2, H2);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (m[i]) continue;
			const fx = Math.min(W2 - 1, Math.max(0, (x - 0.5) / 2));
			const fy = Math.min(H2 - 1, Math.max(0, (y - 0.5) / 2));
			const x0 = Math.floor(fx);
			const y0 = Math.floor(fy);
			const x1 = Math.min(W2 - 1, x0 + 1);
			const y1 = Math.min(H2 - 1, y0 + 1);
			const ax = fx - x0;
			const ay = fy - y0;
			for (let k = 0; k < 3; k++)
				v[i * 3 + k] =
					v2[(y0 * W2 + x0) * 3 + k] * (1 - ax) * (1 - ay) +
					v2[(y0 * W2 + x1) * 3 + k] * ax * (1 - ay) +
					v2[(y1 * W2 + x0) * 3 + k] * (1 - ax) * ay +
					v2[(y1 * W2 + x1) * 3 + k] * ax * ay;
		}
	// relax the filled pixels so the in-painting carries no blockiness
	for (let it = 0; it < 40; it++)
		for (let y = 1; y < h - 1; y++)
			for (let x = 1; x < w - 1; x++) {
				const i = y * w + x;
				if (m[i]) continue;
				for (let k = 0; k < 3; k++)
					v[i * 3 + k] =
						(v[(i - 1) * 3 + k] + v[(i + 1) * 3 + k] + v[(i - w) * 3 + k] + v[(i + w) * 3 + k]) / 4;
			}
}
function symmetrise(v) {
	const src = v.slice();
	const s = (px, py, k) => {
		const x = Math.min(W - 1, Math.max(0, Math.round(px - 0.5)));
		const y = Math.min(H - 1, Math.max(0, Math.round(py - 0.5)));
		return src[(y * W + x) * 3 + k];
	};
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const q = rot({ x: x + 0.5, y: y + 0.5 });
			for (let k = 0; k < 3; k++) v[(y * W + x) * 3 + k] = (src[(y * W + x) * 3 + k] + s(q.x, q.y, k)) / 2;
		}
}
const toPng = (v) =>
	sharp(Buffer.from(Uint8Array.from(v, (n) => Math.round(Math.min(255, Math.max(0, n))))), {
		raw: { width: W, height: H, channels: 3 },
	})
		.png({ compressionLevel: 9 })
		.toBuffer();

/* ── paths ── */
const f2 = (n) => Math.round(n * 100) / 100;
function closedBezier(points) {
	const n = points.length;
	let d = `M${f2(points[0].x)} ${f2(points[0].y)}`;
	for (let i = 0; i < n; i++) {
		const p0 = points[(i - 1 + n) % n];
		const p1 = points[i];
		const p2 = points[(i + 1) % n];
		const p3 = points[(i + 2) % n];
		d += `C${f2(p1.x + (p2.x - p0.x) / 6)} ${f2(p1.y + (p2.y - p0.y) / 6)} ${f2(p2.x - (p3.x - p1.x) / 6)} ${f2(p2.y - (p3.y - p1.y) / 6)} ${f2(p2.x)} ${f2(p2.y)}`;
	}
	return `${d}Z`;
}
const STEP = 8; // 180 knots per contour
const outerPts = [];
const holePts = [];
for (let i = 0; i < N; i += STEP) {
	outerPts.push(pt(c, i, rOuter[i]));
	holePts.push(pt(c, i, rHole[i]));
}
const ring = `${closedBezier(outerPts)}${closedBezier(holePts.reverse())}`;
// Band clip: the fold edge as a smooth open Bézier (it is the only visible edge of this
// path); the rest runs outside the ring, so coarse straight segments are fine there.
function bandD(poly) {
	const foldPts = poly.slice(0, 81).filter((_, k) => k % 4 === 0 || k === 80);
	const rest = poly.slice(81).filter((_, k) => k % 6 === 0);
	let d = `M${f2(foldPts[0].x)} ${f2(foldPts[0].y)}`;
	for (let i = 0; i < foldPts.length - 1; i++) {
		const p0 = foldPts[Math.max(0, i - 1)];
		const p1 = foldPts[i];
		const p2 = foldPts[i + 1];
		const p3 = foldPts[Math.min(foldPts.length - 1, i + 2)];
		d += `C${f2(p1.x + (p2.x - p0.x) / 6)} ${f2(p1.y + (p2.y - p0.y) / 6)} ${f2(p2.x - (p3.x - p1.x) / 6)} ${f2(p2.y - (p3.y - p1.y) / 6)} ${f2(p2.x)} ${f2(p2.y)}`;
	}
	return `${d}L${rest.map((p) => `${f2(p.x)} ${f2(p.y)}`).join("L")}Z`;
}
// The fold edge needs to be smooth; everything else of the band path lies outside the ring.
const band = `${bandD(bandA)}${bandD(bandB)}`;

await mkdir("brand/mark", { recursive: true });
console.time("fields");
const face = await toPng(field(false));
const bandTex = await toPng(field(true));
console.timeEnd("fields");
await writeFile("brand/mark/face.png", face);
await writeFile("brand/mark/band.png", bandTex);
await writeFile(
	"brand/mark/geometry.json",
	`${JSON.stringify({ width: W, height: H, ring, band }, null, "\t")}\n`,
);

const { markSvg, texture } = await import("./mark-svg.mjs");
await writeFile(
	"brand/oryn-mark.svg",
	markSvg({ width: W, height: H, ring, band }, await texture(face, W, H), await texture(bandTex, W, H)),
);
console.log({ centre: c, fold: { j1, j2, samples: foldPts.length, rmsPx: resid.toFixed(2) } });
