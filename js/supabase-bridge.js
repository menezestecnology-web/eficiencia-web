"use strict";
/* ====================================================================
   Ponte web ↔ Supabase para o Sistema de Eficiência Individual.
   Versão multi-empresa: cada empresa tem uma linha em app_state
   identificada por um "slug" (ex.: engetec, acme). A escolha vem do
   parâmetro ?empresa=<slug> na URL. Sem o parâmetro, redireciona
   para portal.html (lista/cadastro de empresas).
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
        '<div style="font-size:22px;font-weight:800;margin-bottom:6px">Erro</div>' +
        '<div style="font-size:13px;line-height:1.55">' + msg + '</div></div>';
    });
  }

  if (!url || !key || /SEU-PROJETO/.test(String(url))) {
    fatal('Faltam credenciais em <code>js/config.js</code>. Edite o arquivo e preencha <b>SUPABASE_URL</b> e <b>SUPABASE_PUBLISHABLE_KEY</b>.');
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    fatal('SDK do Supabase não carregou. Verifique sua conexão com a internet.');
    return;
  }

  /* Identifica a empresa pela URL: index.html?empresa=engetec */
  var params = new URLSearchParams(location.search);
  var empresa = (params.get("empresa") || "").trim().toLowerCase();

  if (!empresa) {
    /* Sem empresa especificada → vai para o portal. */
    location.replace("portal.html");
    return;
  }
  if (!/^[a-z0-9-]{2,32}$/.test(empresa)) {
    fatal('Identificador de empresa inválido (<b>?empresa=' + empresa.replace(/[<>]/g, "") + '</b>). Use apenas letras minúsculas, números e hífen (2 a 32 caracteres).');
    return;
  }

  var sb = window.supabase.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  window.__EMPRESA = empresa;

  window.db = {
    load: async function () {
      try {
        var r = await sb.from("app_state").select("data,nome").eq("empresa", empresa).maybeSingle();
        if (r.error) return { ok: false, error: r.error.message };
        if (!r.data) {
          return { ok: false, error: 'Empresa "' + empresa + '" não cadastrada. Cadastre em portal.html.' };
        }
        return { ok: true, data: r.data.data || null };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e) };
      }
    },
    save: async function (DB) {
      try {
        var nome = (DB && DB.empresa && DB.empresa.nome) || empresa;
        var r = await sb.from("app_state").upsert(
          { empresa: empresa, nome: nome, data: DB, updated_at: new Date().toISOString() },
          { onConflict: "empresa" }
        );
        if (r.error) return { ok: false, error: r.error.message };
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String((e && e.message) || e) };
      }
    },
    info: function () {
      return Promise.resolve({ ok: true, path: "(supabase: " + empresa + ")", size: 0 });
    },
    lastBackup: function () { return Promise.resolve({ ok: true, info: null }); }
  };
})();
