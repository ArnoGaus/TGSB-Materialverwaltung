alter table public.profiles
  add column if not exists trailer_tool_unlocked boolean not null default false,
  add column if not exists trailer_tool_unlocked_at timestamptz null,
  add column if not exists trailer_tool_payment_provider text null,
  add column if not exists trailer_tool_payment_id text null;

comment on column public.profiles.trailer_tool_unlocked is 'Freischaltung für das Trailer-Planungstool';
comment on column public.profiles.trailer_tool_unlocked_at is 'Zeitpunkt der erfolgreichen Freischaltung';
comment on column public.profiles.trailer_tool_payment_provider is 'Zahlungsanbieter der Freischaltung';
comment on column public.profiles.trailer_tool_payment_id is 'Externe Zahlungs- oder Bestell-ID';
