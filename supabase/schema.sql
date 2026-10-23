-- FEC Board schema. Paste this whole file into Supabase > SQL Editor and click "Run".

-- ---------- Tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  color text default '#579dff'
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  color text not null default 'slate',
  position double precision not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  completed boolean not null default false,
  position double precision not null default 0,
  assignee uuid references public.profiles on delete set null,
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_list_id_idx on public.cards (list_id);

-- ---------- Security: only logged-in team members can see or change anything ----------
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;

drop policy if exists "team reads profiles" on public.profiles;
create policy "team reads profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "users edit own profile" on public.profiles;
create policy "users edit own profile" on public.profiles for update to authenticated using (id = auth.uid());

drop policy if exists "team manages lists" on public.lists;
create policy "team manages lists" on public.lists for all to authenticated using (true) with check (true);

drop policy if exists "team manages cards" on public.cards;
create policy "team manages cards" on public.cards for all to authenticated using (true) with check (true);

-- ---------- Auto-create a profile when a user is invited / signs up ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists cards_touch on public.cards;
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();

-- ---------- Live updates (everyone sees changes instantly) ----------
do $$
begin
  alter publication supabase_realtime add table public.lists;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.cards;
exception when duplicate_object then null;
end $$;
