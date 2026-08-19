/**
 * Şema göçü.
 *
 * DIRECT_URL (port 5432, session mode) üzerinden çalışır.
 * Uygulama bağlantısı (6543, transaction mode) DDL için kullanılmaz —
 * CREATE INDEX CONCURRENTLY ve bazı DDL'ler oturum gerektirir.
 *
 * Çalıştırma:  node --env-file=.env.local scripts/migrate.mjs
 */

import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.env.DIRECT_URL;
if (!url) {
  console.error('DIRECT_URL tanımlı değil. Göçler 5432 (session mode) üzerinden çalışır.');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const dizin = join(process.cwd(), 'db', 'migrations');

async function calistir() {
  await sql`
    create table if not exists _gocler (
      dosya text primary key,
      calisti timestamptz not null default now()
    )`;

  const uygulanan = new Set(
    (await sql`select dosya from _gocler`).map((r) => r.dosya)
  );

  const dosyalar = (await readdir(dizin)).filter((f) => f.endsWith('.sql')).sort();

  for (const dosya of dosyalar) {
    if (uygulanan.has(dosya)) {
      console.log(`atlandı  ${dosya}`);
      continue;
    }
    const icerik = await readFile(join(dizin, dosya), 'utf8');
    process.stdout.write(`çalışıyor ${dosya} … `);
    await sql.unsafe(icerik);
    await sql`insert into _gocler (dosya) values (${dosya})`;
    console.log('tamam');
  }

  console.log('\nGöçler güncel.');
  await sql.end();
}

calistir().catch(async (e) => {
  // Postgres hataları position/detail/hint taşır; bunlar olmadan hangi
  // ifadenin patladığını bulmak zor. Hepsini bas.
  console.error('\nGÖÇ HATASI');
  console.error('  mesaj   :', e.message ?? String(e));
  if (e.severity) console.error('  seviye  :', e.severity);
  if (e.code) console.error('  kod     :', e.code);
  if (e.detail) console.error('  ayrıntı :', e.detail);
  if (e.hint) console.error('  ipucu   :', e.hint);
  if (e.position) console.error('  konum   :', e.position);
  if (e.where) console.error('  bağlam  :', e.where);
  await sql.end();
  process.exit(1);
});
