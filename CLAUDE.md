# Oryn

Personal expense tracker. Mobile-first PWA. Read `PLAN.md` (roadmap, stack, skill usage) and `PRODUCT.md` (product truth, brand commitments) before planning work.

Before building or changing UI, read `DESIGN.md` (once it exists) and the surface brief in `.impeccable/surfaces/`.

## Commands
- `pnpm dev` — dev server on :3000 (also on the LAN IP, for testing on a phone)
- `pnpm build` · `pnpm typecheck` · `pnpm check` (Biome) · `pnpm test`
- `node scripts/shots.mjs` — phone screenshots of key screens into `.impeccable/review/shots/` (uses installed Chrome; `ONLY=name,name` to limit)
- `node scripts/icons.mjs` — rebuild every themed logo and app icon (after `node scripts/vectorize-mark.mjs` if the source logo changes)
- `node scripts/smoke.mjs` — quick-add flow smoke test (dev server must be running)
- Dev data: append `?data=demo|worst|empty|live` to any route (dev only)

## Rules that are easy to break
- Money is integer minor units (paise). Format only through `src/lib/money.ts` (`Intl`, en-IN lakh/crore). Never truncate amounts.
- Data lives in the book (`src/lib/book.ts`): accounts, categories, groups, transactions, recurring. Read it with `useBook()`. Change it only through its mutations (`addTxn`, `saveAccount`, ...) so every change reaches the sync outbox (`src/lib/sync.ts`). Ids are made on the phone.
- Transactions have a `kind` (expense, income, transfer). Spending numbers count expenses only; balances come from `balances()`.
- Supabase is optional: with no `VITE_SUPABASE_*` env the app runs on the phone alone and never asks to sign in. Schema and setup: `supabase/`.
- Recurring occurrences use the id `rec-<id>-<date>`, shared with the server job, so nothing posts twice.
- Groups (`src/lib/groups.ts`): anything that shows monthly numbers must run entries through `monthlyEntries(entries, groups)`; a group counts in the month only when its `inMonthly` is on. Open the add sheet with `openQuickAdd(groupId)`.
- Geist everywhere, tabular figures. The month figure (`.figure`) is Geist Light at display size.
- Glass: `.glass` on cards, the floating tab bar, the header bar and sheets; sheets add `.glass-thick`. Never nest glass inside glass, never animate blur. The theme's ambient light (`.ambient`) sits behind everything. Glass level and glow are prefs (`data-glass`, `data-glow`).
- Glass/button classes live in `@layer components` so Tailwind utilities (`fixed`, `rounded-*`) override them. Keep it that way.
- Stamp accent (`text-stamp`, `.btn-stamp`) has one job: the primary action and the active state. Category colours (`--c-<id>`) are for charts and category tiles only.
- Icons: Hugeicons stroke-rounded via `src/ui/Icon.tsx`. No other icon set.
- Bottom sheet: drags from anywhere and doesn't scroll unless its content can't fit; mark sideways scrollers and fields `data-no-drag`.
- Animate only transform/opacity/clip-path. Tab switches are instant. Charts draw without animating. Honor reduced motion (`prefersReducedMotion()`).
- Hover styles only via Tailwind `hover:` (it is redefined to require a fine pointer).
- Theme/mode live on `<html data-theme data-palette data-amoled data-glass data-glow>`; change them only through `setPrefs`.
- Copy: sentence case, second person, plain words, no em dashes.
