#!/usr/bin/env node
/**
 * Yerel geliştirme için gömülü PostgreSQL yönetimi.
 *
 *   node scripts/pg.mjs start|stop|status|reset
 *
 * Makineye PostgreSQL kurmayı gerektirmez; @embedded-postgres paketiyle gelen
 * gerçek PostgreSQL 18 binary'lerini kullanır. Böylece daterange, GiST exclusion
 * constraint ve generated column gibi üretimde kullanacağımız özellikler
 * yerelde de birebir çalışır.
 *
 * Üretimde bu script kullanılmaz — DATABASE_URL yönetilen bir PostgreSQL'e bakar.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(kok, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin');
const VERI = path.join(kok, '.pgdata');
const LOG = path.join(kok, '.pgdata.log');
const PORT = process.env.PGPORT ?? '5433';

const exe = (ad) => path.join(BIN, process.platform === 'win32' ? `${ad}.exe` : ad);

/**
 * Windows'ta postmaster çocuk süreçleri (autovacuum, checkpointer) fork yerine
 * yeniden spawn ediliyor ve bin dizini PATH'te yoksa DLL yükleyemeyip
 * 0xC0000142 ile çöküyorlar. Bu yüzden PATH'i her çağrıda genişletiyoruz.
 */
const ORTAM = { ...process.env, PATH: `${BIN}${path.delimiter}${process.env.PATH ?? ''}` };

function calistir(ad, args, opts = {}) {
  const r = spawnSync(exe(ad), args, { encoding: 'utf8', env: ORTAM, cwd: BIN, ...opts });
  if (r.error) throw r.error;
  return r;
}

function durum() {
  const r = calistir('pg_ctl', ['status', '-D', VERI]);
  return r.status === 0;
}

function baslat() {
  if (!fs.existsSync(BIN)) {
    console.error('Gömülü PostgreSQL binary’leri bulunamadı. Önce `npm install` çalıştırın.');
    process.exit(1);
  }

  if (!fs.existsSync(VERI)) {
    console.log('PostgreSQL veri dizini oluşturuluyor…');
    const r = calistir('initdb', [
      '-D', VERI, '--username=postgres', '--auth=trust',
      '--encoding=UTF8', '--locale=C',
    ], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }

  if (durum()) {
    console.log(`PostgreSQL zaten çalışıyor (port ${PORT}).`);
    return;
  }

  // stdio tamamen kapatılmalı: postmaster devraldığı boruyu açık tutar ve
  // spawnSync hiç dönmez. Çıktı zaten -l ile günlük dosyasına yazılıyor.
  const r = calistir('pg_ctl', ['start', '-D', VERI, '-l', LOG, '-o', `-p ${PORT}`, '-w', '-t', '30'],
    { stdio: 'ignore' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || '');
    console.error(`Başlatılamadı. Günlük: ${LOG}`);
    process.exit(r.status ?? 1);
  }
  console.log(`PostgreSQL hazır → postgresql://postgres@localhost:${PORT}`);
}

function durdur() {
  if (!fs.existsSync(VERI) || !durum()) {
    console.log('PostgreSQL zaten durmuş.');
    return;
  }
  calistir('pg_ctl', ['stop', '-D', VERI, '-m', 'fast', '-w'], { stdio: 'inherit' });
  console.log('PostgreSQL durduruldu.');
}

function sifirla() {
  durdur();
  if (fs.existsSync(VERI)) fs.rmSync(VERI, { recursive: true, force: true });
  if (fs.existsSync(LOG)) fs.rmSync(LOG, { force: true });
  console.log('Veri dizini silindi. `npm run db:start` ile yeniden kurulur.');
}

const komut = process.argv[2] ?? 'start';
if (komut === 'start') baslat();
else if (komut === 'stop') durdur();
else if (komut === 'reset') sifirla();
else if (komut === 'status') console.log(durum() ? 'çalışıyor' : 'durmuş');
else {
  console.error('Kullanım: node scripts/pg.mjs start|stop|status|reset');
  process.exit(1);
}
