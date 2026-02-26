alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.user_consents enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "profiles_read_own" on public.profiles
for select using (id = auth.uid());

create policy "profiles_insert_self" on public.profiles
for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid());

create policy "addresses_owner_all" on public.addresses
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "consents_owner_read" on public.user_consents
for select using (user_id = auth.uid());

create policy "consents_owner_insert" on public.user_consents
for insert with check (user_id = auth.uid());

create policy "orders_customer_read" on public.orders
for select using (user_id = auth.uid());

create policy "orders_customer_insert" on public.orders
for insert with check (user_id = auth.uid());
