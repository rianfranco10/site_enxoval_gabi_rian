-- Rode isto no SQL Editor do seu projeto Supabase (Menu lateral > SQL Editor > New query > Run)
-- Este script pode ser rodado mais de uma vez sem dar erro (é "idempotente").

create extension if not exists "pgcrypto";

create table if not exists categories (
  id text primary key,
  label text not null,
  icon text default 'Tag',
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  category text not null references categories(id),
  title text not null,
  image_url text,
  product_url text not null,
  price numeric,
  status text not null default 'nao_comprado',
  notes text,
  created_at timestamptz not null default now()
);

alter table categories enable row level security;
alter table items enable row level security;

-- Sem login: qualquer pessoa com o link do site pode ver e (no modo admin) editar
drop policy if exists "public access to categories" on categories;
create policy "public access to categories" on categories for all to anon using (true) with check (true);

drop policy if exists "public access to items" on items;
create policy "public access to items" on items for all to anon using (true) with check (true);

-- --------------------------------------------------------------
-- IMPORTANTE: antes de rodar as linhas abaixo, crie o bucket de fotos:
-- Menu lateral > Storage > New bucket > nome "item-photos" > marque "Public bucket" > Create
-- Depois volte aqui e rode o restante deste script.
-- --------------------------------------------------------------

drop policy if exists "public upload to item-photos" on storage.objects;
create policy "public upload to item-photos"
on storage.objects for insert to anon
with check (bucket_id = 'item-photos');

drop policy if exists "public read item-photos" on storage.objects;
create policy "public read item-photos"
on storage.objects for select to anon
using (bucket_id = 'item-photos');
