# Connecting Oryn to Supabase

The app runs on the phone alone until these steps are done. Nothing you add before connecting is lost: the first sign-in uploads it to your account.

1. **Create a project** at supabase.com (free plan). Pick the Mumbai region (`ap-south-1`).
2. **Create the tables.** Open SQL Editor, paste all of `migrations/20261118000000_oryn_init.sql` and run it. Or, with the CLI: `pnpm exec supabase link --project-ref <ref>` then `pnpm exec supabase db push`.
   - The last line schedules the daily recurring job with pg_cron. If it fails, turn on **pg_cron** under Database → Extensions and run that line again.
3. **Send codes, not links.** Authentication → Email Templates → **Magic Link**: put `{{ .Token }}` in the body, for example `Your Oryn code is {{ .Token }}`. Do the same in **Confirm signup**.
4. **Allow your app's address.** Authentication → URL Configuration: set Site URL to your Vercel address, for example `https://oryn.vercel.app`.
5. **Add the keys.** Project Settings → API. Copy `.env.example` to `.env.local` and fill in the URL and the publishable key. On Vercel, add the same two variables under Settings → Environment Variables, then redeploy.
6. Restart `pnpm dev`. The app now asks you to sign in.

Free-plan notes: the built-in email sender allows only a few emails an hour, which is fine for one person. A project with no activity for 7 days is paused; opening the dashboard wakes it.
