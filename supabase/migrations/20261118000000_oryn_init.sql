-- Oryn: accounts, categories, groups, transactions, recurring payments, profile.
-- Every row belongs to one person (user_id) and Row Level Security keeps it theirs.
-- Ids are text made on the phone, so rows can be created offline; the primary key
-- is (user_id, id). Amounts are integer minor units (paise).

create extension if not exists pg_cron;

-- ── Profile (settings that follow you between phones) ─────────────────────
create table public.profiles (
	user_id uuid primary key default auth.uid() references auth.users on delete cascade,
	settings jsonb not null default '{}'::jsonb,
	time_zone text not null default 'Asia/Kolkata',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ── Accounts ──────────────────────────────────────────────────────────────
create table public.accounts (
	user_id uuid not null default auth.uid() references auth.users on delete cascade,
	id text not null check (length(id) between 1 and 64),
	name text not null check (length(name) between 1 and 80),
	kind text not null check (kind in ('cash', 'bank', 'upi', 'card', 'wallet')),
	opening bigint not null default 0,
	archived boolean not null default false,
	sort integer not null default 0,
	updated_at timestamptz not null default now(),
	primary key (user_id, id)
);

-- ── Categories ────────────────────────────────────────────────────────────
create table public.categories (
	user_id uuid not null default auth.uid() references auth.users on delete cascade,
	id text not null check (length(id) between 1 and 64),
	name text not null check (length(name) between 1 and 60),
	kind text not null check (kind in ('expense', 'income')),
	icon text not null,
	color text not null,
	budget bigint check (budget is null or budget >= 0),
	archived boolean not null default false,
	sort integer not null default 0,
	updated_at timestamptz not null default now(),
	primary key (user_id, id)
);

-- ── Groups (a wedding, a renovation, a trip) ──────────────────────────────
create table public.groups (
	user_id uuid not null default auth.uid() references auth.users on delete cascade,
	id text not null check (length(id) between 1 and 64),
	name text not null check (length(name) between 1 and 60),
	icon text not null,
	budget bigint check (budget is null or budget >= 0),
	in_monthly boolean not null default false,
	finished boolean not null default false,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (user_id, id)
);

-- ── Recurring payments ────────────────────────────────────────────────────
create table public.recurring (
	user_id uuid not null default auth.uid() references auth.users on delete cascade,
	id text not null check (length(id) between 1 and 64),
	kind text not null check (kind in ('expense', 'income', 'transfer')),
	amount bigint not null check (amount > 0),
	account_id text not null,
	to_account_id text,
	category_id text,
	group_id text,
	payee text not null default '',
	freq text not null check (freq in ('weekly', 'monthly', 'yearly')),
	every integer not null default 1 check (every between 1 and 52),
	start_on date not null,
	next_on date not null,
	auto_post boolean not null default true,
	active boolean not null default true,
	updated_at timestamptz not null default now(),
	primary key (user_id, id),
	foreign key (user_id, account_id) references public.accounts (user_id, id),
	foreign key (user_id, to_account_id) references public.accounts (user_id, id),
	foreign key (user_id, category_id) references public.categories (user_id, id) on delete set null (category_id),
	foreign key (user_id, group_id) references public.groups (user_id, id) on delete set null (group_id),
	check ((kind = 'transfer') = (to_account_id is not null))
);

-- ── Transactions ──────────────────────────────────────────────────────────
create table public.transactions (
	user_id uuid not null default auth.uid() references auth.users on delete cascade,
	id text not null check (length(id) between 1 and 120),
	kind text not null check (kind in ('expense', 'income', 'transfer')),
	amount bigint not null check (amount > 0),
	currency text not null default 'INR' check (length(currency) = 3),
	account_id text not null,
	to_account_id text,
	category_id text,
	group_id text,
	payee text not null default '' check (length(payee) <= 200),
	note text check (note is null or length(note) <= 2000),
	at timestamptz not null,
	recurring_id text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	primary key (user_id, id),
	foreign key (user_id, account_id) references public.accounts (user_id, id),
	foreign key (user_id, to_account_id) references public.accounts (user_id, id),
	foreign key (user_id, category_id) references public.categories (user_id, id) on delete set null (category_id),
	foreign key (user_id, group_id) references public.groups (user_id, id) on delete set null (group_id),
	foreign key (user_id, recurring_id) references public.recurring (user_id, id) on delete set null (recurring_id),
	check ((kind = 'transfer') = (to_account_id is not null)),
	check (kind = 'transfer' or to_account_id is null)
);

create index transactions_user_at on public.transactions (user_id, at desc);
create index transactions_user_group on public.transactions (user_id, group_id) where group_id is not null;
create index recurring_due on public.recurring (next_on) where active and auto_post;

-- ── updated_at ────────────────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
	new.updated_at := now();
	return new;
end $$;

do $$
declare t text;
begin
	foreach t in array array['profiles', 'accounts', 'categories', 'groups', 'recurring', 'transactions'] loop
		execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
	end loop;
end $$;

-- ── Row Level Security: each person sees and changes only their own rows ──
do $$
declare t text;
begin
	foreach t in array array['profiles', 'accounts', 'categories', 'groups', 'recurring', 'transactions'] loop
		execute format('alter table public.%I enable row level security', t);
		execute format(
			'create policy "own rows" on public.%I for all to authenticated
				using (user_id = (select auth.uid()))
				with check (user_id = (select auth.uid()))', t);
	end loop;
end $$;

-- ── Recurring: the next occurrence, counted from the start date ───────────
-- A payment on the 31st lands on the last day of shorter months and returns to
-- the 31st (Postgres month arithmetic clamps to the month end).
create function public.recurring_next(start_on date, freq text, every integer, after date)
returns date language plpgsql immutable set search_path = '' as $$
declare
	k integer := 0;
	occ date;
begin
	loop
		occ := case freq
			when 'weekly' then start_on + (7 * every * k)
			when 'monthly' then (start_on + make_interval(months => every * k))::date
			else (start_on + make_interval(years => every * k))::date
		end;
		if occ > after then return occ; end if;
		k := k + 1;
		if k > 5000 then return after + 1; end if;
	end loop;
end $$;

-- Posts every due automatic payment for everyone. Same ids the phone uses
-- (rec-<id>-<date>), so a payment the phone already posted is not doubled.
create function public.post_due_recurring() returns integer
language plpgsql security definer set search_path = '' as $$
declare
	r public.recurring%rowtype;
	tz text;
	today date;
	posted integer := 0;
begin
	for r in
		select * from public.recurring
		where active and auto_post and next_on <= (now() at time zone 'Asia/Kolkata')::date + 1
		for update skip locked
	loop
		select coalesce(p.time_zone, 'Asia/Kolkata') into tz from public.profiles p where p.user_id = r.user_id;
		tz := coalesce(tz, 'Asia/Kolkata');
		today := (now() at time zone tz)::date;
		while r.next_on <= today loop
			insert into public.transactions
				(user_id, id, kind, amount, account_id, to_account_id, category_id, group_id, payee, at, recurring_id)
			values (
				r.user_id,
				'rec-' || r.id || '-' || to_char(r.next_on, 'YYYY-MM-DD'),
				r.kind,
				r.amount,
				r.account_id,
				case when r.kind = 'transfer' then r.to_account_id end,
				case when r.kind = 'transfer' then null else r.category_id end,
				r.group_id,
				r.payee,
				(r.next_on + time '09:00') at time zone tz,
				r.id
			)
			on conflict (user_id, id) do nothing;
			posted := posted + 1;
			r.next_on := public.recurring_next(r.start_on, r.freq, r.every, r.next_on);
		end loop;
		update public.recurring set next_on = r.next_on where user_id = r.user_id and id = r.id;
	end loop;
	return posted;
end $$;

revoke all on function public.post_due_recurring() from public, anon, authenticated;

-- Every day at 00:30 IST (19:00 UTC).
select cron.schedule('oryn-post-recurring', '0 19 * * *', $$select public.post_due_recurring()$$);
