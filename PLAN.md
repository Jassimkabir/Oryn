# Oryn — Product & Technical Plan (v2)

> A personal expense tracker. A web app built mobile-first so it looks and feels like a native app.
> Minimal, luxurious, frosted glass, fluid motion, very fast. Runs entirely on free plans (Vercel + Supabase).

**Decisions locked in**

| Topic | Decision |
|---|---|
| Framework | React 19 + **TanStack Start** (all TanStack) |
| Backend | **Supabase** (Free plan) |
| Hosting | **Vercel** (Hobby, free) |
| Sign-in | Email + 6-digit code, email + password. **No phone sign-in.** |
| Currency | **Indian Rupee (₹)** by default, `en-IN` formatting (lakh / crore grouping). **Base currency selectable in Settings.** |
| Fonts | **Geist** for the interface and all data, plus a **serif** for the large headline amounts |
| Design process | **Directly in code**, no Figma. Explore with the `prototype` skill and harden with `impeccable` |

---

## 1. Tech stack

All packages are installed at the **latest stable version** when the project is created. No betas.

### Core
| Layer | Choice |
|---|---|
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) |
| UI | React 19 + React Compiler |
| Framework | TanStack Start (on TanStack Router), Vite, Vercel preset |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions, pg_cron |
| Package manager | pnpm |

### TanStack
| Package | Used for |
|---|---|
| **Router / Start** | File routes, typed search params (filters and tabs live in the URL), preload on intent, server functions |
| **Query** | All server data: cache, optimistic updates, background refresh, saved to IndexedDB for instant start |
| **Form** | Transaction, budget, goal and settings forms, validated with Zod |
| **Table** | Headless filter / sort / group logic for transactions (drawn as mobile rows) |
| **Virtual** | Virtualized transaction list (anything over 50 rows) |
| **Store** | Small client state: preferences, quick-add draft, privacy mode |
| **Pacer** | Debounced search, throttled handlers |
| **Devtools** | Development panel |
| *DB (later, optional)* | Local-first offline writes, once it reaches a stable 1.0 |

### UI, motion and design
| Concern | Choice | Source |
|---|---|---|
| Styling | Tailwind CSS v4 (`@theme` tokens, OKLCH colors) | |
| Primitives | **Base UI** (dialog, select, switch, popover, tabs) | confirmed by `pick-ui-library` |
| Motion | **Motion** (`motion/react`) for gestures and springs; **CSS transitions** for everything simple | `animation-performance`, `transitions-dev` |
| Motion tokens | `transitions-dev` `_root.css` tokens, ported into Tailwind `@theme` | `transitions-dev` |
| Bottom sheets | **Custom sheet on Motion** following the `gestures` skill, with Base UI Dialog for focus and accessibility. (Vaul was checked: no release since Dec 2024, so not used.) | `gestures`, `apple-design` |
| Animated amounts | **NumberFlow** | `pick-ui-library` |
| Toasts | **Sonner** (set up following `ask-sonner`) | `pick-ui-library`, `ask-sonner` |
| Email code input | **input-otp** | `pick-ui-library` |
| Class helpers | clsx + cva | `pick-ui-library` |
| Charts | Custom SVG (d3-shape / d3-scale) for full design control | |
| Icons | Lucide or Phosphor (thin stroke). **Never emoji as icons.** | `impeccable` |
| Validation | Zod | |
| Dates | date-fns + `Intl` | |

`pick-ui-library` also suggests zustand, Virtuoso and next-themes. We keep TanStack Store and TanStack Virtual because you asked for all-TanStack. next-themes only works with Next.js, so we use a small inline theme script instead.

### Tooling
Biome (lint + format), Vitest, Playwright (iPhone + Pixel viewports), Supabase CLI (migrations + generated types), vite-plugin-pwa, GitHub Actions, Lighthouse CI.

---

## 2. Free-tier setup (Vercel + Supabase only)

| Service | Covers | Notes |
|---|---|---|
| **Vercel Hobby** | Hosting, CDN, functions, HTTPS, a preview link for every branch | For personal, non-commercial use, which fits Oryn. Most of the app is static and cached on the phone. |
| **Supabase Free** | Postgres (~500 MB), Auth, Storage (~1 GB), Edge Functions, pg_cron | 500 MB holds millions of transactions. Receipts are compressed on the phone to ~100–200 KB. |

- **Supabase pauses a free project after ~7 days of no use.** A free daily Vercel Cron job pings the database to keep it awake.
- **No restorable backups on the free plan.** Oryn writes a weekly export to Storage and has a "Download backup" button in Settings.
- **Auth emails are rate-limited** (a few per hour). Fine for one person. A free SMTP provider such as Resend can be added if it ever gets in the way.
- **Web Push is free.** pg_cron runs recurring transactions and alerts.

---

## 3. Authentication

- **Email + 6-digit code** (main method). It uses `input-otp`, `inputmode="numeric"`, `autocomplete="one-time-code"` and allows paste. A code is used instead of a magic link because an installed PWA would open the link in the browser instead of the app.
- **Email + password** as a fallback, with reset by email code.
- **App lock**: PIN, plus Face ID / fingerprint through **WebAuthn passkeys**, with an auto-lock timer.
- Sign out on all devices.
- **Onboarding** (3 short screens): name, starting accounts (Cash, Bank, UPI…), choose a theme. Currency is set to ₹.

---

## 4. Features

### 4.1 Transactions
- Expense, income and transfer
- Fields: amount, category, account, date and time, payee, note, tags, receipt photo
- **Quick add**: a bottom sheet that opens straight onto a large number pad, with simple math (`120+45`). Adding an expense takes about 3 seconds.
- Smart defaults: category and account are guessed from the payee using your own history
- **Swipe a row**: left to delete (with undo), right to duplicate. Every swipe also has a tap alternative (long-press menu), as the web guidelines require.
- Receipts are compressed on the phone and stored in Supabase Storage

### 4.2 Accounts
- Cash, bank, **UPI**, credit card, wallet, savings
- Balance per account and total net worth
- Credit card: limit, amount used, billing day

### 4.3 Categories and tags
Editable default categories suited to India (Groceries, Dining, Fuel, Rent, EMI, Recharge & bills, Shopping, Travel, Medical…). Each has an icon and color and can have sub-categories. Free-form tags.

### 4.4 Budgets
- Monthly budget, overall and per category
- Progress bars that show pace ("on track", "spending fast", "over"). Over 100% (e.g. 142%) must display correctly, not overflow.
- Optional carry-over of unspent money
- Alerts at 80% and 100%

### 4.5 Recurring payments and subscriptions
Rules (daily, weekly, monthly, yearly), auto-post or "confirm when due", a subscriptions overview, and created on the server by pg_cron.

### 4.6 Savings goals
Target, deadline, contributions, projected finish date.

### 4.7 Overview (home)
- This month's spending against budget, how much is left per day, and what changed since last time
- Period switcher: week / month / year / custom
- Spending trend chart (drag to inspect values)
- Top categories, upcoming payments, recent transactions
- **Insights** in plain words: "Dining is ₹2,340 lower than last month"
- The layout is decided with `/impeccable shape` and `/prototype`. It must not become the generic "big number + rings + stat cards" template, which `impeccable` refuses (see §6.4).

### 4.8 Activity (transactions list)
Virtualized list grouped by day with sticky headers and daily totals. Debounced search. A filter sheet saved in the URL. A calendar heatmap view.

### 4.9 Reports
Month and year breakdowns, category trends, income vs expense, comparison with the previous period. **Indian financial year (April–March) option.** CSV/PDF export, CSV import.

### 4.10 Notifications
Web Push (works on iOS once the app is added to the Home Screen): budget alerts, upcoming bills, daily reminder.

### 4.11 Rupee formatting
- Always `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` → `₹1,00,00,000.00`. Never hand-built separators.
- Short form for charts: `₹1.2L`, `₹3.4Cr` (test `Intl` compact output for `en-IN`; use a small helper if it isn't right).
- Amounts are **never cut off** with "…". The layout must fit ₹1,00,00,000.00.
- Tabular figures everywhere amounts change.
- **Currency selector in Settings → Preferences**: choose the base currency (default ₹ INR). All amounts are shown in it, and the number format follows the currency's usual locale (e.g. INR → `en-IN`, USD → `en-US`), with an override for the number format.
- Changing the base currency does **not** convert existing amounts. Settings warns about this before applying. Per-transaction foreign currency (with exchange rates) is a later addition. Every amount stores a currency code so it can be added cleanly.

---

## 5. Settings

| Section | Controls |
|---|---|
| Profile | Name, avatar, email |
| **Appearance** | Light / Dark / System · color theme · AMOLED black · glass level (off / subtle / full) · text size · reduce motion |
| Preferences | **Base currency** (default ₹), number format, month start day (e.g. salary day 25th), first day of week, financial year (Jan–Dec or Apr–Mar), default account |
| Categories / Accounts / Tags | Full management screens |
| Budgets | Defaults, carry-over, alert levels |
| Notifications | Each alert on/off, reminder time |
| Security | App lock, PIN, passkey, auto-lock timer, **privacy mode** (blur all amounts; also toggled by tapping the balance) |
| Data | Export, import, download backup, delete all data, delete account (confirm, or undo where possible) |
| Sessions | Devices, sign out everywhere |
| About | Version, changelog |

### Color themes
Each theme defines OKLCH color **roles** (shell, surface, text, muted, accent, positive, negative, data series 1–6, selection, focus), with a light and a dark version. Dark versions are designed separately, not inverted.

| Theme | Feel |
|---|---|
| **Onyx** (default) | Warm black, ivory, grey |
| **Champagne** | Muted gold on charcoal or ivory |
| **Emerald** | Deep private-bank green |
| **Sapphire** | Navy and cool blue |
| **Rosé** | Muted blush and mauve |
| **Peacock** | Teal-violet velvet, yellow gold (replaces "Aurora" to fit the jeweller world) |

The theme is applied by a tiny inline script before first paint (no flash). It is set as `html[data-theme]`, matching the selector `transitions-dev` uses. Both `theme-color` meta tags and `color-scheme` update with every theme and mode change, so the phone's status bar always matches.

---

## 6. Design system

### 6.1 Brand commitments
These are written into `PRODUCT.md` (via `/impeccable init`) so the skills treat them as the brief:
- **Frosted glass has a specific job**: it is used only on surfaces that float above content (bottom tab bar, top bar after scrolling, sheets, the one overview card), to show depth. It is never decoration on ordinary cards or list rows.
- **The serif is only for headline amounts** (overview total, account and goal headers). Every other number (lists, inputs, charts, labels) uses Geist with tabular figures. The serif must have tabular lining figures. It is picked from 2–3 candidates with `/prototype`, avoiding the over-used faces `impeccable` lists (Fraunces, Playfair, Cormorant, Lora, DM Serif, Newsreader…).
- Minimal and calm: one accent per theme, generous spacing, no visual noise.

### 6.2 Typography
- A fixed rem scale with a 1.125–1.2 step ratio. Body text 16px minimum (also stops iOS zooming into inputs).
- Tracking: large display `-0.02em` (never tighter than `-0.04em`), body `0`, small text slightly positive. Line height: display 1.05, body 1.5.
- `font-optical-sizing: auto`, `text-wrap: balance` on headings, `pretty` on paragraphs.
- On dark backgrounds: slightly more line height and tracking.
- Only the font weights we use are loaded, self-hosted, with `font-display: swap` and fallback fonts matched in size.

### 6.3 Glass and color rules
- Glass material: a translucent surface + `backdrop-filter: blur(20px) saturate(180%)` + a 1px top highlight + a soft shadow (shadows always have an offset and a blur).
- **Never stack glass on glass.** A sheet placed over the glass tab bar has a dimming backdrop.
- Text on glass gets more contrast and slightly heavier weight. Colored elements sit on a solid layer, not on glass.
- **Never animate the blur value.** Fade a layer that is already blurred instead.
- Honor `prefers-reduced-transparency` (solid surfaces) and `prefers-contrast: more`.
- Contrast: body text ≥ 4.5:1, large text, icons and focus rings ≥ 3:1. Check every theme in both modes.
- Information is never shown by color alone (over budget also gets text or an icon).
- Edges of scrolling areas use a gradient fade or blur instead of 1px divider lines.
- Theme the browser's own parts too: text selection, caret, scrollbars, focus ring.

### 6.4 Patterns we avoid (from `impeccable`)
Labels above headings, nested cards, grids of identical icon cards, gradient text, thick colored side borders, hard offset shadows, emoji icons, spinners in the middle of content (use skeletons), and the "big number + small label + stat cards" home template.

### 6.5 Components and states
- Every interactive part has default, pressed, focus, disabled, loading and error states. Hover only with `(hover: hover) and (pointer: fine)`, via a custom Tailwind variant, because Tailwind's `hover:` alone is not enough on phones.
- **Touch targets 44×44px**, with at least 8px between them.
- Empty states teach (e.g. "Add your first expense" with the ＋ button highlighted). Using a sheet or inline content is preferred over modal pop-ups.

### 6.6 Writing in the app
- Sentence case everywhere (iOS feel). Second person ("Your budget"). Short and plain.
- No em dashes and no filler words (seamless, intuitive, effortless…), following `plain-writing`. Placeholders end with "…".
- Never invent numbers. Insights only state what the data shows.

---

## 7. Mobile app feel

Baseline from `mobile-native`, set up **before the first component**:
- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`. **Never disable zoom.**
- `100dvh` for the app shell and sheets, never `100vh`.
- `html { -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; overscroll-behavior: none }`; `overscroll-behavior: contain` inside sheets.
- `touch-action: manipulation` on buttons. `pan-y` on swipeable rows. `none` on drag handles.
- `user-select: none` only on controls, never on the whole page.
- Safe areas (`env(safe-area-inset-*)`) on the top bar, tab bar, sheets and toasts.
- Inputs: amounts use `inputmode="decimal"` and `enterkeyhint="done"`.
- PWA: manifest `theme_color` = `background_color`, standalone mode, icons and splash screens, status bar style set. **Always test the installed version**, because standalone mode changes safe areas and the status bar.

**Navigation**
- Floating glass **bottom tab bar** with tabs named for their contents: **Overview · Activity · ＋ · Budgets · Settings**. ＋ is an action button in the middle, not a tab.
- **Tab content switches instantly** (you switch tabs many times a day). The active indicator moves with a CSS `clip-path` transition (250ms), not Motion `layoutId`, which dropped frames during navigation in Vercel's own app.
- Opening a detail screen (transaction, account, category) slides in, and back slides out the same way (§8.3). Swiping from the edge to go back must never be blocked.
- Large title that shrinks on scroll.
- Haptics through `navigator.vibrate` (Android only) for meaningful moments only: saved, deleted, snapped, error. They fire on the same frame as the visual feedback.

---

## 8. Motion

### 8.1 Rules
1. **How often you'll see it decides whether it animates.** Seen 100+ times a day (tab switch, typing a digit, opening a row) → no animation, or almost none. Seen occasionally (sheets, toasts, detail screens) → normal animation. Rare (onboarding, a goal reached, changing theme) → can be delightful.
2. Every animation has a stated purpose: feedback, showing where something came from, a change of state, or avoiding a jarring jump.
3. Animate only `transform`, `opacity` and `clip-path`. Never `transition: all`. Never animate `blur`, `box-shadow` or size for decoration.
4. **Ease-out for things entering or leaving, ease-in-out for things moving on screen, never ease-in.**
5. Closing is faster than opening and never bounces. Closing is never delayed.
6. Everything can be interrupted midway: springs and transitions, never keyframes, on anything you can touch.
7. Start enters from `scale(0.95–0.97)` + transparent, never from `scale(0)`.
8. Stagger only for rare entrances: 30–80ms, uneven, under 300ms total, never on lists you see daily.
9. **Data doesn't move for style.** Amounts, rings and charts animate **only when the value really changes** (e.g. after you add an expense, old → new). They do not animate on page load or refresh.
10. **Reduced motion** (system setting or the in-app toggle) means less motion, not none: keep fades and color changes, remove movement, bounce and stagger. Finger-tracking during a drag stays.
11. Frame budget: design for **8ms per frame (120Hz phones)**, not just 16.7ms. Gesture updates go to Motion values or direct style writes, never React state.

### 8.2 Tokens (ported into Tailwind `@theme`)
| Token | Value |
|---|---|
| Durations | stagger 40 · micro 80 · quick 150 · fast 250 · medium 350 · slow 400 · very-slow 500 (ms) |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Press | `scale(0.97)`, 100–160ms ease-out, on pointer down |
| Popover / menu | 250ms in, 150ms out, from scale 0.97, origin from the trigger |
| Default spring | `{ type: 'spring', bounce: 0, duration: 0.4 }` |
| Spring after a flick | `bounce: 0.2`, started with the release velocity |
| Toast | 400ms, slides from the bottom and leaves the same way |

`/transitions refine` checks that the code only uses these tokens.

### 8.3 Each interaction
| Interaction | Motion |
|---|---|
| **Tab bar** | Content swaps instantly. Indicator: CSS `clip-path`, 250ms ease-in-out. Icons get the press scale. |
| **＋ / quick-add sheet** | Slides up 500ms `--ease-drawer` (or spring). The number pad is already in place (no stagger). Drag down to close: follows the finger exactly, rubber-bands at the top, closes past ~40–50% of the height **or** on a fast flick (>500 px/s). The backdrop's opacity follows the drag. The number pad keys don't start a drag. |
| **Number pad keys** | Press scale 0.97 + Android haptic. The display does not animate each digit. |
| **Swipe row** | Follows the finger with `touch-action: pan-y` so the list still scrolls. Rubber-bands past the action width. Commits past ~50% or on a flick, otherwise springs back with the release speed. Deleted rows fade and shrink (200ms) while neighbours close the gap. |
| **Amounts** | NumberFlow, old → new, only after a real change. Tabular figures. |
| **Budget bars / rings** | Ease to the new value after a transaction (≤ 300ms). Never redraw from zero on load. |
| **Charts** | Appear without drawing in. Scrubbing follows the finger. |
| **Detail screens** | Slide 8px with a fade and a slight blur, 250ms, the same both ways. Or a direction-aware spring (forward moves left), `bounce: 0`. |
| **List add / delete** | New item rises 8px from transparent. Deleted item fades and shrinks to 0.95 in 200ms. |
| **Theme switch** | Rare, so it can be special: a circular reveal from the tap point via the View Transitions API. With reduced motion, a quick crossfade. |
| **Pull to refresh** | Follows the finger with resistance, springs back on release. It must not take over normal scrolling (`mobile-native`). |
| **Toasts** | Sonner, a single `<Toaster />` at the root (outside any transformed element), given the current theme, styled via `toast.custom()`. Short message + undo for deletes. |
| **Saved / error** | Saved: check-mark (`transitions-dev` 10-success-check). Error: small shake (12-error-state-shake). |

---

## 9. Performance

**Targets:** LCP < 1.5s on 4G with a mid-range phone, INP < 100ms, CLS ≈ 0, initial JS < 150 KB gzipped, repeat start < 300ms, steady 60fps (120fps where the phone supports it).

**How:**
- Split code per route and preload when a link is touched
- Query cache saved to IndexedDB, so the app opens with data instantly
- Optimistic updates for every change
- Totals calculated in Postgres
- Virtualized lists and the React Compiler
- Self-hosted fonts with only the weights used
- Glass limited to floating surfaces. `will-change` only on the large blurred layers, never on everything.
- **Test on a real mid-range Android phone and an iPhone** over the local network (`chrome://inspect`, Safari Web Inspector) every week.

---

## 10. Data model (Supabase)

Money is stored as **whole paise** (`bigint`), never as decimals.

```
profiles            id, display_name, avatar_url, base_currency ('INR'), locale ('en-IN'),
                    week_start, month_start_day, fiscal_year_start
user_settings       user_id, theme, mode, amoled, glass_level, text_size, reduce_motion,
                    privacy_mode, app_lock, notification prefs (jsonb)
accounts            id, user_id, name, type (cash/bank/upi/card/wallet/savings), currency,
                    opening_balance_minor, credit_limit_minor, billing_day, icon, color, sort_order, archived
categories          id, user_id, parent_id, name, kind, icon, color, sort_order, archived
transactions        id, user_id, type, amount_minor, currency, account_id, to_account_id,
                    category_id, payee, note, occurred_at, recurring_rule_id, created_at, updated_at
tags / transaction_tags
attachments         id, transaction_id, storage_path, mime, size
budgets             id, user_id, category_id (null = overall), period, amount_minor, rollover, alert_thresholds
recurring_rules     id, user_id, template (jsonb), rrule, next_run_at, auto_post, active
goals / goal_contributions
push_subscriptions  id, user_id, endpoint, keys, device_label
```

- Row Level Security on every table (`user_id = auth.uid()`)
- Indexes on `(user_id, occurred_at desc)` and `(user_id, category_id, occurred_at)`
- SQL functions: `overview_summary`, `category_breakdown`, `cashflow_series`, `budget_progress`. Months follow the user's month start day and financial year setting.
- Default categories and accounts are created on sign-up by a database trigger
- Times are stored in UTC and shown in IST, with tests for transactions near midnight

---

## 11. Project structure

```
oryn/
├─ PRODUCT.md            # from /impeccable init: product, users, brand commitments
├─ DESIGN.md             # from /impeccable document + /learn-taste: design rules that build up over time
├─ CLAUDE.md             # includes "Before building or changing UI, read DESIGN.md."
├─ src/
│  ├─ routes/            # (auth)/…, (app)/overview, activity, budgets, settings/…, prototypes/… (dev only)
│  ├─ features/          # transactions, accounts, budgets, goals, auth, settings
│  ├─ ui/                # Glass, Sheet, Button, NumberPad, Amount, ProgressBar, Chart, TabBar…
│  ├─ motion/            # tokens, springs, shared variants
│  ├─ theme/             # OKLCH themes, inline theme script
│  ├─ lib/               # supabase, money (paise ↔ ₹, en-IN), dates (IST), query client
│  ├─ dev/               # worst-case / empty / 1,000-row demo data for break-ui
│  └─ styles/app.css
├─ supabase/             # migrations, functions, seed.sql
└─ e2e/
```

---

## 12. How each skill is used

Some skills can only be started by you, by typing the slash command. They are marked **(you run)**.

| Skill | When | What for |
|---|---|---|
| **impeccable** | Phase 0, then on every screen and at the end of every phase | `init` → PRODUCT.md. `shape` before each screen. `typeset`, `colorize`, `animate`, `onboard` while building. `harden` for errors, long names and crore amounts. `critique`, `audit`, `polish` at the end of a phase. `document` → DESIGN.md. Its hook checks UI files after each edit (already installed). |
| **web-design-guidelines** | End of every phase / before merging | Mechanical check: accessibility, forms, touch, URL state, locale formatting, anti-patterns |
| **mobile-native** | Phase 0 scaffold, plus device testing | The viewport, safe-area, touch and status-bar baseline in §7 |
| **apple-design** | Designing sheets, gestures, glass and type | Springs, rubber-banding, materials, type tracking, reduced transparency |
| **pick-ui-library** **(you run)** | Before adding any dependency | e.g. `/pick-ui-library bottom sheet` |
| **prototype** **(you run)** | Before key pieces: overview, quick-add sheet, transaction row, tab bar, serif choice | 3–5 different working versions in `/prototypes/…`, switched with keys 1–5. Keep the best, delete the rest |
| **break-ui** | Once each list or card works | Worst-case data (₹1,00,00,000.00, 142% budgets, very long payees, empty, one item, 1,000 rows, 320px width, 200% zoom, dark mode) |
| **animate** | Each single animation | Step-by-step: should it animate → purpose → values |
| **choreograph** | Several things moving together | List add / delete, detail push / pop, first-run entrance |
| **gestures** | Sheet, swipe rows, pull to refresh | Follow-the-finger, velocity, rubber-band rules |
| **transitions-dev** | Phase 0 tokens, then per component | Motion tokens + ready-made transitions (check-mark, shake, number change, tabs, skeleton reveal, toast) |
| **transitions-polish** | After each feature | `transitions review` / `transitions polish` for timing, distance, scale, easing |
| **emil-design-eng** | Throughout | General polish reference (press states, origins, drag details) |
| **animation-performance** | Glass surfaces, and any stutter on a phone | Find and fix dropped frames |
| **animation-vocabulary** | When describing motion | The right term for a motion idea |
| **find-animation-opportunities** | After the screens exist | At most 5–7 suggested motions with exact values |
| **improve-animations** | After the first release | Full motion audit, writes a plan |
| **remove-animations** | If anything feels slow or busy | Removes motion only |
| **review-animations** **(you run)** | Before merging motion work | Strict approve / block review |
| **ask-emil** **(you run)** | When unsure which motion skill fits | Points to the right one |
| **ask-sonner** | Setting up toasts | Sonner setup and styling |
| **learn-taste** **(you run)** | End of any session where you gave design feedback | Turns your corrections into permanent rules in DESIGN.md |
| **design-taste-frontend** | Only for a public landing page, if we build one | Its copy checker and banned-word list. It is built for marketing sites, not app screens. It bans violet, which clashes with the Aurora theme. |
| **plain-writing** | All in-app text and docs | Plain language rules (§6.6) |
| **search**, **redesign-screen**, **best-practices** (Mobbin) | Not used | Need a paid Mobbin subscription, which we don't have. |
| **frontend-design** | Alongside impeccable | Distinctive visual direction |
| **animate-expo**, **write-swift** | Not used | React Native and Swift only, not a web app |

---

## 13. Roadmap

| Phase | Work | Skills | Result |
|---|---|---|---|
| **0. Foundation** | Scaffold TanStack Start + Tailwind v4 + Biome + Vitest + PWA. Supabase project + CLI. `mobile-native` baseline. Motion tokens. OKLCH themes (6 × light/dark/AMOLED) + no-flash script. Glass components. App shell + tab bar. Serif choice. | impeccable `init`, mobile-native, transitions-dev, apple-design, prototype (serif, tab bar), pick-ui-library | A polished empty app that installs to the home screen |
| **1. Sign-in & onboarding** | Email code, password, protected routes, onboarding, profile | impeccable `shape` / `onboard`, web-design-guidelines | Sign in on your phone |
| **2. Core money** | Schema + RLS, accounts, categories, quick-add sheet + number pad, Activity list, swipe actions, search & filters | prototype (quick-add, row), gestures, choreograph, break-ui | Usable for daily tracking |
| **3. Overview & budgets** | SQL summaries, overview, charts, insights, budgets, alerts | impeccable `shape` / `critique`, prototype (overview), animate, break-ui | The main screens |
| **4. More features** | Recurring + subscriptions, goals, tags, receipts, reports + financial year, CSV/PDF export, CSV import, offline cache | harden, break-ui | Full feature set |
| **5. Polish & release** | App lock + passkeys, privacy mode, push, calendar heatmap, accessibility pass, device performance pass, E2E tests | audit, polish, find-animation-opportunities, transitions-polish, review-animations, animation-performance, web-design-guidelines, `document` | Version 1.0 |

At the end of each phase: `/impeccable critique` → `/impeccable audit` → `/web-design-guidelines` → `/impeccable polish` → `/learn-taste`.

---

## 14. Extra recommendations

1. **Integer paise** for all money.
2. **Month start day** (e.g. the 25th) and an **April–March financial year** option. Budgets and reports follow them.
3. **UPI as an account type**, since most daily payments in India go through it.
4. **Privacy mode**: tap the total to blur every amount.
5. **Smart quick add** from your own payee history.
6. **Later:** type "chai 40 yesterday" or photograph a receipt and have it filled in automatically (a Claude model through a Supabase Edge Function).
7. **Test on real phones weekly**, installed as an app, not only in a desktop browser.
8. **Your own backups**: weekly export, as the free plan has none.
9. **Single user for now**, but `user_id` on every row allows sharing later.

---

## 15. Status

**Visual world chosen (18 Nov 2026): The Jeweller's Showcase.** Velvet grounds per theme, struck-metal accent with one job, showcase glass on floating surfaces, recessed category trays, hallmark strike when an entry is saved. Contract: `.impeccable/surfaces/src-routes-app-index-tsx.md`.

**Phase 0: done except Supabase connection.**
- [x] TanStack Start (SPA mode) + Vite 8 + React 19 + React Compiler + Tailwind v4 + Biome, Vercel adapter
- [x] Mobile-native baseline, PWA manifest + icons
- [x] 6 themes × light/dark + AMOLED, glass levels, text size, reduce motion, no-flash boot script, theme-color sync, circular theme reveal
- [x] Glass top bar, floating glass tab bar with moving metal indicator, custom drag sheet, quick-add number pad with sums
- [x] Overview, Activity, Budgets (read-only), Settings → Appearance, Currency and format, privacy mode
- [x] Entries save on the phone for now (local), with undo
- [ ] Supabase project: create it, add `.env.local`, link the CLI (needs your Supabase account)
- [ ] Service worker / offline (Phase 4), serif final choice via `/prototype`
- [ ] Startup JS is above the 150 KB target; the add sheet is now lazy-loaded. Measure in the Phase 5 performance pass.
