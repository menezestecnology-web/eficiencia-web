"use strict";
/* ====================================================================
   Deploy do sistema Eficiência Individual para Supabase.
   Aplica o schema SQL e sobe os arquivos do site para o bucket "web".
   Uso: node deploy.js  (ou rode deploy.bat com duplo clique)
   ==================================================================== */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const mime = require("mime-types");

const ROOT = __dirname;

function parseConfig() {
  const file = path.join(ROOT, "js", "config.js");
  if (!fs.existsSync(file)) {
    throw new Error("js/config.js não encontrado. Crie a partir de js/config.example.js.");
  }
  const txt = fs.readFileSync(file, "utf8");
  const url = (txt.match(/SUPABASE_URL:\s*["']([^"']+)["']/) || [])[1];
  const key = (txt.match(/SUPABASE_PUBLISHABLE_KEY:\s*["']([^"']+)["']/) || [])[1];
  if (!url || !key || /SEU-PROJETO/.test(url)) {
    throw new Error("js/config.js sem credenciais válidas. Edite o arquivo.");
  }
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!m) throw new Error("SUPABASE_URL com formato inesperado.");
  return { url, key, ref: m[1] };
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(ans); });
  });
}

async function runSchema(ref, password) {
  const connectionString = `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("  Conectado ao Postgres.");
  const sql = fs.readFileSync(path.join(ROOT, "supabase_schema.sql"), "utf8");
  await client.query(sql);
  console.log("  Schema aplicado com sucesso.");
  await client.end();
}

const SKIP_NAMES = new Set([
  "_legacy", "node_modules", "README.md", ".gitignore",
  "supabase_schema.sql", "package.json", "package-lock.json",
  "deploy.js", "deploy.bat", "deploy.ps1"
]);

function listFiles(dir, prefix) {
  prefix = prefix || "";
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_NAMES.has(name) || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const rel = prefix ? prefix + "/" + name : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push.apply(out, listFiles(full, rel));
    } else {
      out.push({ full, rel });
    }
  }
  return out;
}

async function uploadAll(url, key) {
  const sb = createClient(url, key);
  const files = listFiles(ROOT);
  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const buf = fs.readFileSync(f.full);
    const ct = mime.lookup(f.full) || "application/octet-stream";
    const r = await sb.storage.from("web").upload(f.rel, buf, {
      contentType: ct,
      upsert: true
    });
    if (r.error) {
      console.log("  [erro] " + f.rel + ": " + r.error.message);
      fail++;
    } else {
      console.log("  enviado: " + f.rel);
      ok++;
    }
  }
  return { ok, fail };
}

(async () => {
  try {
    console.log("=== Deploy Eficiencia Individual ===\n");
    const cfg = parseConfig();
    console.log("Projeto Supabase: " + cfg.ref);
    console.log("URL:              " + cfg.url + "\n");

    let pwd = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
    if (!pwd) {
      console.log("A senha do banco esta na pagina Project Settings > Database");
      console.log("(ou era a que voce definiu ao criar o projeto).\n");
      pwd = await prompt("Senha do banco (DB Password): ");
    }
    pwd = String(pwd || "").trim();
    if (!pwd) throw new Error("Senha do banco obrigatoria.");

    console.log("\n[1/2] Aplicando schema SQL...");
    await runSchema(cfg.ref, pwd);

    console.log("\n[2/2] Subindo arquivos para o bucket 'web'...");
    const r = await uploadAll(cfg.url, cfg.key);
    console.log("\n" + r.ok + " arquivo(s) enviado(s). " + r.fail + " falha(s).");

    const finalUrl = cfg.url + "/storage/v1/object/public/web/index.html";
    console.log("\n=== Pronto! ===");
    console.log("Sistema disponivel em:");
    console.log("  " + finalUrl);
    console.log("\nAbra essa URL no navegador e salve nos favoritos.");
  } catch (e) {
    console.error("\n[ERRO] " + (e.message || e));
    process.exit(1);
  }
})();
