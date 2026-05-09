
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Operators
create table public.operators (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  departments text[] default '{}',
  online boolean default false,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.operators enable row level security;
create policy "operators all auth" on public.operators for all to authenticated using (true) with check (true);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  family_id text,
  department text,
  operator_id uuid references public.operators(id) on delete set null,
  last_visit date,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy "clients all auth" on public.clients for all to authenticated using (true) with check (true);
create index on public.clients (status);
create index on public.clients (department);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'ai' check (status in ('ai','operator','booked','closed')),
  assigned_operator_id uuid references public.operators(id) on delete set null,
  last_message_at timestamptz default now(),
  created_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
create policy "conv all auth" on public.conversations for all to authenticated using (true) with check (true);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('client','ai','operator','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "msg all auth" on public.messages for all to authenticated using (true) with check (true);
create index on public.messages (conversation_id, created_at);

-- Missed calls
create table public.missed_calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  phone text not null,
  caller_name text,
  called_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','contacted','converted','closed')),
  conversation_id uuid references public.conversations(id) on delete set null,
  auto_message_sent boolean default false
);
alter table public.missed_calls enable row level security;
create policy "calls all auth" on public.missed_calls for all to authenticated using (true) with check (true);

-- Appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  operator_id uuid references public.operators(id) on delete set null,
  visit_type text not null,
  duration_minutes int not null default 30,
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','done','cancelled','noshow')),
  source text default 'reception',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.appointments enable row level security;
create policy "appt all auth" on public.appointments for all to authenticated using (true) with check (true);
create index on public.appointments (starts_at);

-- Follow-up sequences
create table public.followup_sequences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target text not null,
  steps int not null default 1,
  active boolean not null default true,
  conversion_rate numeric default 0,
  messages_sent int default 0,
  created_at timestamptz not null default now()
);
alter table public.followup_sequences enable row level security;
create policy "seq all auth" on public.followup_sequences for all to authenticated using (true) with check (true);

-- Loyalty rewards
create table public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  description text,
  discount_percent int,
  code text,
  expires_at date,
  used boolean default false,
  created_at timestamptz not null default now()
);
alter table public.loyalty_rewards enable row level security;
create policy "loy all auth" on public.loyalty_rewards for all to authenticated using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.missed_calls;
