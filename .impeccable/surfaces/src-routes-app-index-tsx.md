---
version: 1
slug: "src-routes-app-index-tsx"
primary_target: "src/routes/_app/index.tsx"
related_targets: ["src/routes/_app/route.tsx","src/routes/_app/activity.tsx","src/routes/_app/budgets.tsx","src/routes/_app/settings/index.tsx"]
---

## Scope

The whole Oryn app, redesigned: shell (large titles, bottom tab bar, add sheet), Overview, Activity, Budgets, Settings (Appearance, Currency and format). Visitor mode: Operate. Replaces the earlier Jeweller's Showcase world; the old look is evidence only.

## Audience and task

The owner, on a phone, right after paying (log in ~3 seconds) or catching up (how is the month going, what is over). The home screen answers "how is the month going" first. Constraints in PRODUCT.md. Kept from before: the colour themes in light and dark, and the logo wearing each theme.

## Direction contract

THESIS: Your month as your own bill book: every spend is a numbered slip, and saving one stamps it PAID. It refuses the category default of a gradient balance card, donut and generic list, and the cream-journal opposite.

OWN-WORLD: Kirana carbon-copy cash memo. Each theme is a duplicate-sheet colour (white original, pink, canary, green, sky, plus the brand mint) with its own stamp ink; dark mode is the carbon copy, a lifted navy-carbon ground, never near-black. Printed-ink blue carries labels and structure, red carries serial numbers and over-budget, the stamp ink has one job: the add action and the active state. Solid sheets, hairline rules, no glass. Geist for everything, Geist Mono for serials; money in tabular figures, right-aligned on one column.

STORY: Open, see the themed Oryn mark and "November, Day 18 of 30", read spent of budget and what you can spend per day, see pace, spot the red category, tap + and log a slip in about three seconds; it lands stamped.

FIRST VIEWPORT: Themed logo mark beside the large native title "November", "Day 18 of 30" right, "Sheet No. 11 · 24 slips" in red mono. "Spent this month", ~56px tabular figure, one sentence with the per-day allowance. Pace strip: spent fill, red even-pace tick. "Where it went" rows with thin bars (over in red). "Recent" slips with serial, payee, meta, amount. Solid tab bar: Overview, Activity, violet add, Budgets, Settings; compact title bar fades in on scroll.

FORM: The Cash Memo, candidate 7 of 7 on the ordered list. seed:9e80bf1ee0699a90. Signature interaction: the PAID stamp: a saved slip's amount gets a stamp-ink PAID mark that lands with a short rotated press. Raises: one strict cell grid (Crouwel); tabular money aligned on the last digit (Datamatics); categories rerank in place and hold a highlight until seen (gate board); a category row expands in place to show its detail (streaming wall).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

Exact sheet and ink values per theme, checked for AA in both modes. Whether dark mode needs per-theme carbon tints or one carbon with theme inks.
