# Eficiência Individual — versão Web (Supabase)

Versão web do sistema **Eficiência Individual** (MenezesTecnologia), portada a partir do app Electron desktop. Roda em qualquer navegador moderno; dados ficam em **Supabase nuvem (PostgreSQL)**.

A interface (HTML/CSS/JS) é a **mesma do desktop** — copiada do `app.asar` instalado. A única diferença é a camada de persistência: em vez de SQLite local via `window.db` (Electron preload), usamos `js/supabase-bridge.js`, que implementa o mesmo contrato `window.db.load() / window.db.save(DB)` contra o Supabase.

## Como rodar (tudo no Supabase: banco + hospedagem)

1. Crie um projeto Supabase (https://supabase.com).
2. **SQL Editor** → cole e execute `supabase_schema.sql`. Isso cria a tabela `app_state`, a RLS e o **bucket público `web`** no Storage.
3. **Project Settings → API** → copie `Project URL` e a **publishable key** (`sb_publishable_*` ou anon key).
4. Em `js/config.example.js`, copie para `js/config.js` e cole as credenciais.
5. **Storage → web** → arraste TODOS os arquivos da pasta `eficiencia-web/` (preservando subpastas: `index.html` na raiz, `js/`, `assets/`).
6. O sistema fica acessível em:
   ```
   https://SEU-PROJETO.supabase.co/storage/v1/object/public/web/index.html
   ```
   Salve essa URL nos favoritos.

### Alternativa local (sem hospedar)

Para rodar só na sua máquina, depois de preencher `js/config.js`:
- `npx serve .` ou `python -m http.server 8080` na pasta, e abra `http://localhost:3000`.

## Estrutura

```
eficiencia-web/
├── index.html              ← UI completa (copiada do app.asar do desktop)
├── assets/icon.ico
├── js/
│   ├── config.example.js   ← modelo (vai pro git)
│   ├── config.js           ← seu (NÃO vai pro git)
│   ├── supabase-bridge.js  ← define window.db.load/save contra Supabase
│   └── xlsx.full.min.js
├── supabase_schema.sql     ← DDL: tabela app_state + RLS + bucket "web"
├── _legacy/                ← código de uma tentativa web anterior (ignorado)
└── README.md
```

## Como a persistência funciona

O renderer do desktop trabalha com um objeto JavaScript `DB = { empresa, config, equipes[], operadores[], operacoes[], dias[] }` e usa `window.db.save(DB)` para gravar tudo de uma vez. O `database.js` do desktop apenas serializa esse objeto para SQLite e desserializa de volta.

Para a versão web, replicamos exatamente esse padrão: **uma única linha** em `app_state(id=1)` com o objeto inteiro como `jsonb`. Isso elimina mapeamento coluna a coluna e mantém o renderer intocado.

Se mais tarde você precisar de queries SQL ou multi-tenant, dá pra migrar para um schema normalizado sem mexer no front (basta atualizar `supabase-bridge.js`).

## O que foi removido em relação ao desktop

- **Licença por PC** (`window.lic`) — não setamos a ponte, então o app pula direto para `bootApp()` (ver `index.html` linhas 3922-3931).
- **Backup/Restore de arquivo `.db`** — o navegador não acessa arquivos locais. O renderer já trata o retorno `undefined` com a mensagem "Backup .db disponível apenas no app desktop". O **export/import de backup em JSON** continua funcionando normalmente.

## Segurança

- A chave usada no `config.js` é a **publishable key** (`sb_publishable_*`), idêntica em segurança à anon key — pode ficar exposta no client. NUNCA use service_role no front.
- A RLS atual é permissiva (`for all to anon using (true)`), aceitável em single-tenant. Para multi-tenant: habilitar Supabase Auth e trocar a policy por `auth.uid() = owner`.
