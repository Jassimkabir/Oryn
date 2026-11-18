# Oryn brand assets

Supplied by the owner on 18 Nov 2026 (originals kept unmodified here):

| File | What it is |
|---|---|
| `oryn-mark-source.png` | Mint ribbon-loop mark, transparent background (from "Mint Green Ribbon Loop Logo.png") |
| `oryn-lockup-source.png` | Mark + "Oryn" wordmark (from "Oryn Minimal Green Loop Logo.png") |
| `oryn-brand-sheet.png` | Brand identity variations: colour, mono, app icons, favicon sizes (from "Oryn Brand Identity Variations.png") |

## The vector mark

`node scripts/vectorize-mark.mjs` rebuilds the mark from `oryn-mark-source.png` as a resolution-independent SVG, so it stays sharp at any size:

- Outer edge, hole and the two fold lines are vector curves traced from the source (sub-pixel, made exactly 180° symmetric as the design is).
- The shading is the artist's own, lifted into two smooth colour fields (front face, inner band) with every edge pixel removed, so they upscale cleanly. The vector clips carry all the sharpness.

Outputs: `brand/mark/geometry.json`, `brand/mark/face.png`, `brand/mark/band.png`, and the mint preview `brand/oryn-mark.svg`.

## Icons (all made by `node scripts/icons.mjs`, never edited by hand)

The logo always wears the current theme. For every theme and mode, `public/icons/<theme>/<light|dark>/` holds:

- `mark.svg`: the vector logo, shading re-tinted to the theme's metal (Mint keeps the original artwork)
- `apple-touch-icon.png`, `icon-512.png`: the logo on the theme's velvet (dark) or satin (light)
- `favicon-32.png`, `favicon-64.png`: transparent logo

Colours are read from `src/styles.css`, so icons follow any palette change after a rerun. The app swaps the tab icon and apple-touch-icon with the theme (`applyThemeIcons` in `src/lib/prefs.ts`).

Install defaults in `public/` (`icon-192/512`, `icon-maskable-512`, `apple-touch-icon`, `favicon.svg`, `favicon-32/64`) are the brand mint on deep teal, following the sheet's "App Icon (Dark)". The maskable icon keeps the mark inside the 80% safe zone.

Brand colours sampled from the sheet: mint `#c0fbd1` → `#73de9c`, deep teal `#0b3d3c`.
