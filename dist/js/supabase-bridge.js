"use strict";
/* ====================================================================
   Ponte web ↔ Supabase para o Sistema de Eficiência Individual.
   Expõe window.db.load() e window.db.save(DB) com o MESMO contrato do
   preload.js do app Electron, para que o renderer (index.html) não
   precise saber de onde os dados vêm.

   Estratégia: armazena o objeto DB inteiro como JSONB em uma única
   linha (app_state.id = 1). Espelha exatamente o load/save wholesale
   do database.js do desktop — única origem da verdade, zero mapeamento
   coluna a coluna.
   ==================================================================== */

(function () {
  var cfg = window.APP_CONFIG || {};
  var url = cfg.SUPABASE_URL;
  var key = cfg.SUPABASE_PUBLISHABLE_KEY;

  function fatal(msg) {
    document.addEventListener("DOMContentLoaded", function () {
      var host = document.getElementById("app") || document.body;
      host.innerHTML =
        '<div style="max-width:560px;margin:80px auto;padding:28px;border:1px solid #fee2e2;background:#fff1f1;border-radius:14px;font-family:Segoe UI,system-ui,sans-serif;color:#7f1d1d">' +
        '<div style="font-size:22px;font-weight:800;margin-bottom:6px">Configuração ausente</div>' +
        '<div style="font-size:13px;line-height:1.55">' + msg + '</div></div>';
    });
  }

  if (!url || !key || /SEU-PROJETO/.test(String(url))) {
    fatal('Copie <code>js/config.example.js</code> para <code>js/config.js</code> e preencha <b>SUPABASE_URL</b> e <b>SUPABASE_PUBLISHABLE_KEY</b> com as credenciais do seu projeto Supabase.');
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    fatal('Falha ao carregar a SDK do Supabase. Verifique sua conexão com a internet (CDN cdn.jsdelivr.net).');
    return;
  }

  var sb = window.supabase.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  var TABLE = "app_state";
  var ROW_ID = 1;

  /* Indica para a UI offline-tolerante que existe uma ponte de persistência. */
  window.db = {
    load: async function () {
      try {
        var r = await sb.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
        if (r.error) return { ok: false, error: r.error.message };
        var data = r.data && r.data.data ? r.data.data : null;
        return { ok: true, data: data };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e) };
      }
    },
    save: async function (DB) {
      try {
        var r = await sb.from(TABLE).upsert({ id: ROW_ID, data: DB, updated_at: new Date().toISOString() }, { onConflict: "id" });
        if (r.error) return { ok: false, error: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e) };
      }
    },
    /* Os métodos abaixo existem só para manter compatibilidade de assinatura
       com o preload.js do desktop. No navegador, backup/restore de arquivo
       .db não fazem sentido — o renderer já trata o retorno indefinido com
       a mensagem "disponível apenas no app desktop". */
    info: function () { return Promise.resolve({ ok: true, path: "(supabase)", size: 0 }); },
    lastBackup: function () { return Promise.resolve({ ok: true, info: null }); }
  };
})();
