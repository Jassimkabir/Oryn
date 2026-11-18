# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TanStack Start (TanStack Router, Query, Form, Table, Virtual, Store, Pacer), Vite, Tailwind CSS v4, Motion, Base UI, Supabase (Postgres, Auth, Storage, Edge Functions, pg_cron), hosted on Vercel. Installable PWA. Both Vercel (Hobby) and Supabase (Free) stay on free plans; no other paid services. Full detail in PLAN.md.

## Users

One person: the owner, tracking their own money in India. They use Oryn on their phone in two modes, equally often:
- **Right after paying**: phone in hand, a few seconds to log an expense before moving on.
- **Catching up and reviewing**: sitting down to enter several transactions, then checking where money went and whether the month is on track.

## Product Purpose

A personal expense tracker that is fast to log into, clear to read, and pleasant to open every day. Success is the owner logging every expense without friction and always knowing where the month stands.

## Positioning

Compared with the trackers the owner has used (Money Manager, Walnut, Spendee, spreadsheets), Oryn is:
- **Premium and calm**: no clutter, no ads, no upsell.
- **Faster to log**: quick add opens straight onto a number pad.
- **Clearer**: plain-language insight into where money goes and whether spending is on pace.
- **Private**: no bank scraping or SMS reading. Data lives in the owner's own Supabase database.

## Operating Context

- Used mostly one-handed on a phone, often outdoors or in a queue, installed to the home screen. Also opened on desktop occasionally (centered phone-width layout).
- Money is Indian Rupee by default, formatted `en-IN` (lakh/crore grouping: ₹1,00,00,000.00). Base currency is selectable in Settings.
- Payments are mostly UPI, cards and cash. Many people are paid on a fixed day (e.g. the 25th), and India's financial year runs April–March.

## Capabilities and Constraints

- Sign-in: email + 6-digit code, and email + password. **No phone/SMS sign-in.**
- Core features: expenses, income, transfers, accounts (incl. UPI), categories, tags, receipts, budgets, recurring payments and subscriptions, savings goals, reports, CSV/PDF export, CSV import, push reminders, app lock, privacy mode.
- Settings give full control, including Appearance: light/dark/system, AMOLED black, several color themes, glass level, text size, reduce motion.
- Money stored as integer minor units. Per-transaction multi-currency is out of scope for v1. Base currency is a setting.
- Must stay within Vercel Hobby and Supabase Free limits.

## Brand Commitments

- Name: **Oryn**.
- Redesigned 18 Nov 2026 at the owner's request. Binding from the owner: a **native mobile-app feel** with **bottom navigation**, **fluid 60fps motion**, and **multiple colour themes plus light/dark**, with the **Oryn logo wearing each theme's colour** (app icon, tab icon, and in the app, including the home screen). Light, not dark and heavy, by default.
- Frosted / liquid glass with cards and charts, asked for again by the owner on 18 Nov 2026: glass surfaces over each theme's soft ambient light, with a Glass control (Clear, Frosted, Solid) and a Glow toggle. Icons are Hugeicons stroke-rounded. Luxurious but calm: the theme glow stays mild.
- Fonts: **Geist** for the interface and all data.
- Logo: the owner's mint ribbon loop (brand/README.md). Mint is its own colour; every other theme tints it.
- Voice: plain, short, second person, sentence case.

## Evidence on Hand

No real data yet. The logo is the owner's own (brand/). Never invent transaction histories, testimonials or statistics in shipped UI. Demo data is dev-only.

## Product Principles

1. **Logging comes first.** Any screen is at most one tap from adding an expense, and adding one takes about 3 seconds.
2. **The month at a glance.** Show where the month stands and what changed, in plain words, before any chart.
3. **Calm over clever.** Restraint everywhere: motion only where it explains or responds, no decoration that competes with the numbers.
4. **Fast feels premium.** Instant start from cache, optimistic updates, no waiting on the network for anything the phone already knows.
5. **Your data, your control.** Private by default, exportable at any time, deletable completely.

## Accessibility & Inclusion

WCAG 2.2 AA: text contrast ≥ 4.5:1 (large text, icons, focus rings ≥ 3:1) in every theme and mode, 44×44px touch targets, layouts that hold at 200% text size, full support for reduced motion, reduced transparency and increased contrast, and tap/keyboard alternatives for every gesture.
