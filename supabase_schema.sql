-- =====================================================================
-- supabase_schema.sql  (versão multi-empresa)
-- Sistema: Eficiência Individual
-- Estratégia: uma linha por empresa em public.app_state. O objeto DB
--             inteiro (mesma estrutura do desktop) vai no campo "data"
--             como jsonb. Espelha o load/save wholesale do database.js.
-- Acesso por URL: index.html?empresa=<slug>
-- =====================================================================

begin;

-- Schema antigo singleton → multi-empresa (destrutivo; rode quando o
-- banco ainda não tem dados reais).
drop table if exists public.app_state cascade;

create table public.app_state (
  empresa     text primary key
              check (empresa ~ '^[a-z0-9-]{2,32}$'),
  nome        text not null,
  data        jsonb,
  criada_em   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.app_state.empresa is
  'Slug usado em ?empresa= na URL. Letras minúsculas, números e hífen.';
comment on column public.app_state.nome is
  'Nome de exibição da empresa (ex.: "Engetec Consultoria").';
comment on column public.app_state.data is
  'Objeto DB serializado (mesma estrutura do desktop). null = ainda sem dados.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- Política inicial permissiva para anon. Trocar por auth.uid() quando
-- adicionar login multi-tenant real.
-- ---------------------------------------------------------------------
alter table public.app_state enable row level security;

drop policy if exists "anon_all_app_state" on public.app_state;
create policy "anon_all_app_state" on public.app_state
  for all to anon using (true) with check (true);

-- =====================================================================
-- Storage: bucket público "web" (continua igual)
-- =====================================================================
insert into storage.buckets (id, name, public)
  values ('web', 'web', true)
  on conflict (id) do update set public = true;

drop policy if exists "anon_select_web" on storage.objects;
create policy "anon_select_web" on storage.objects
  for select to anon using (bucket_id = 'web');

drop policy if exists "anon_insert_web" on storage.objects;
create policy "anon_insert_web" on storage.objects
  for insert to anon with check (bucket_id = 'web');

drop policy if exists "anon_update_web" on storage.objects;
create policy "anon_update_web" on storage.objects
  for update to anon using (bucket_id = 'web') with check (bucket_id = 'web');

drop policy if exists "anon_delete_web" on storage.objects;
create policy "anon_delete_web" on storage.objects
  for delete to anon using (bucket_id = 'web');

-- =====================================================================
-- Seed: empresa de exemplo (Engetec Consultoria)
-- =====================================================================
insert into public.app_state (empresa, nome)
  values ('engetec', 'Engetec Consultoria')
  on conflict (empresa) do nothing;

commit;
