create table if not exists public.trailer_states (
  trailer_id text primary key,
  zweck text not null default '',
  planning jsonb not null default '{}'::jsonb,
  material_box jsonb not null default '{"manualItemIds":[],"slotLinked":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

alter table public.trailer_states enable row level security;

drop policy if exists "trailer_states_select_all" on public.trailer_states;
create policy "trailer_states_select_all"
on public.trailer_states
for select
to authenticated
using (true);

drop policy if exists "trailer_states_insert_authenticated" on public.trailer_states;
create policy "trailer_states_insert_authenticated"
on public.trailer_states
for insert
to authenticated
with check (true);

drop policy if exists "trailer_states_update_authenticated" on public.trailer_states;
create policy "trailer_states_update_authenticated"
on public.trailer_states
for update
to authenticated
using (true)
with check (true);

drop policy if exists "trailer_states_delete_authenticated" on public.trailer_states;
create policy "trailer_states_delete_authenticated"
on public.trailer_states
for delete
to authenticated
using (true);

alter publication supabase_realtime add table public.trailer_states;
