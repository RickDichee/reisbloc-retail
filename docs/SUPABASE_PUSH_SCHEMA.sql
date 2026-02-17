-- Tabla para suscripciones push web
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  last_used timestamptz
);
create unique index if not exists push_subscriptions_endpoint_idx on public.push_subscriptions(endpoint);
