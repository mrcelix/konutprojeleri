import postgres from 'postgres';

/**
 * Ağ gecikmesi ölçümü.
 *
 * Bu mimarinin TEK KRİTİK ayarı Vercel bölgesinin (fra1) Supabase
 * bölgesiyle (eu-central-1) eşleşmesidir. Eşleşmezse her sorgu ~90 ms
 * sürer ve sayfa başına 4-5 sorgu varsa yarım saniye kaybedilir.
 *
 * Yerelden ölçülen değer Türkiye'den Frankfurt'a gidiş-dönüştür
 * (~40-60 ms normal). Asıl önemli olan Vercel üzerinden ölçülen
 * değerdir: ana sayfadaki rozet onu gösterir, 3 ms altı olmalı.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tanımlı değil. .env.local dosyasını oluşturun.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });

const olcumler = [];
try {
  // İlk sorgu bağlantı kurulumunu da içerir; ölçüme katılmaz.
  await sql`select 1`;

  for (let i = 0; i < 7; i++) {
    const t = process.hrtime.bigint();
    await sql`select 1`;
    olcumler.push(Number(process.hrtime.bigint() - t) / 1e6);
  }

  olcumler.sort((a, b) => a - b);
  const ortanca = olcumler[Math.floor(olcumler.length / 2)];

  const [{ surum, bolge }] = await sql`
    select version() as surum,
           coalesce(current_setting('cluster_name', true), 'bilinmiyor') as bolge`;

  console.log(`Gecikme (ortanca) : ${ortanca.toFixed(1)} ms`);
  console.log(`En düşük / yüksek : ${olcumler[0].toFixed(1)} / ${olcumler.at(-1).toFixed(1)} ms`);
  console.log(`Sunucu            : ${surum.split(' ').slice(0, 2).join(' ')}`);
  console.log(`Küme              : ${bolge}`);
  console.log('');
  console.log('Yerelden 40-80 ms normaldir (Türkiye → Frankfurt).');
  console.log('Vercel üzerinden ORTANCA 5 ms üstüyse bölge eşleşmesi yanlıştır.');
console.log('İlk sorgu bağlantı kurulumunu da içerir; o değer bölge hakkında bilgi vermez.');
} finally {
  await sql.end();
}
