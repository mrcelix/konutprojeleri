'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { blokOzeti, govdeCozumle, type GovdeBlogu } from '@/lib/icerik-bicim';

/* ============================================================
   Blok editörü.

   Gövde zaten veritabanında BLOK DİZİSİ olarak duruyor; panel onu
   metne çevirip textarea'da gösteriyor, kaydederken geri çözümlüyordu.
   Yani yöneticinin `## başlık` ve `---` biçimini öğrenmesi, verinin
   şekli yüzünden değil yalnızca editör yüzündendi.

   Burada bloklar doğrudan düzenleniyor: her blok bir kart, başlık ve
   paragraf kendi alanında, liste maddeleri tek tek. Sıra ok tuşlarıyla
   değişiyor. Göç gerekmedi — kaydederken aynı diziyi JSON olarak
   gönderiyoruz.

   Metin kipi DURUYOR: uzun içeriği yapıştırmak, toplu düzeltme yapmak
   ve JavaScript çalışmadığında kaydetmek için tek yol o. İki kip
   arasında geçiş, aynı çözümleyicilerden geçerek kayıpsız oluyor.
   ============================================================ */

function metneCevir(bloklar: GovdeBlogu[]): string {
  return bloklar.map((b) => [
    b.h ? `## ${b.h}` : null,
    b.p ?? null,
    ...(b.liste ?? []).map((m) => `- ${m}`),
  ].filter(Boolean).join('\n')).join('\n---\n');
}

export default function BlokEditor(
  { baslangic, hataStil }: { baslangic: string; hataStil?: React.CSSProperties },
) {
  const [bloklar, setBloklar] = useState<GovdeBlogu[]>(() => govdeCozumle(baslangic));
  const [metinKipi, setMetinKipi] = useState(false);
  const [metin, setMetin] = useState(baslangic);

  /* Kaydedilen değer her zaman blok dizisi. Metin kipindeyken de
     çözümlenip gönderiliyor; sunucu iki yoldan da aynı şeyi alıyor. */
  const gonderilecek = useMemo(
    () => (metinKipi ? govdeCozumle(metin) : bloklar),
    [metinKipi, metin, bloklar],
  );

  function kipDegistir() {
    if (metinKipi) setBloklar(govdeCozumle(metin));
    else setMetin(metneCevir(bloklar));
    setMetinKipi((m) => !m);
  }

  const guncelle = (i: number, yama: Partial<GovdeBlogu>) =>
    setBloklar((b) => b.map((x, k) => (k === i ? { ...x, ...yama } : x)));

  const tasi = (i: number, yon: -1 | 1) =>
    setBloklar((b) => {
      const hedef = i + yon;
      if (hedef < 0 || hedef >= b.length) return b;
      const y = [...b];
      [y[i], y[hedef]] = [y[hedef], y[i]];
      return y;
    });

  const kelime = gonderilecek.reduce(
    (a, b) => a + (b.p ? b.p.split(/\s+/).length : 0) + (b.liste?.length ?? 0), 0,
  );

  return (
    <div className="blok-editor">
      {/* Sunucuya giden asıl değer; metin alanı yedek yol olarak duruyor */}
      <input type="hidden" name="govdeJson" value={JSON.stringify(gonderilecek)} />
      <textarea name="govde" value={metinKipi ? metin : metneCevir(bloklar)} readOnly hidden />

      <div className="govde-arac">
        <button type="button" className="btn btn-quiet btn-sm" onClick={kipDegistir}>
          <Icon n={metinKipi ? 'grid' : 'sliders'} s={14} />
          {metinKipi ? ' Blok olarak düzenle' : ' Metin olarak düzenle'}
        </button>
        {!metinKipi && (
          <button type="button" className="btn btn-quiet btn-sm"
            onClick={() => setBloklar((b) => [...b, { h: '', p: '' }])}>
            <Icon n="plus" s={14} sw={2.4} /> Blok ekle
          </button>
        )}
        <span className="govde-sayac">
          {gonderilecek.length} blok · {kelime} kelime
        </span>
      </div>

      {metinKipi ? (
        <>
          <textarea
            rows={20} value={metin} onChange={(e) => setMetin(e.target.value)} spellCheck
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, width: '100%', ...hataStil }}
          />
          <p className="tiny muted" style={{ margin: '6px 0 0' }}>
            <code>## Başlık</code> alt başlık · <code>- madde</code> liste ·
            düz satır paragraf · <code>---</code> yeni blok.
          </p>
        </>
      ) : bloklar.length === 0 ? (
        <div className="p-bos">
          <Icon n="grid" s={26} />
          <p>Henüz blok yok. “Blok ekle” ile başlayın.</p>
        </div>
      ) : (
        <div className="blok-liste">
          {bloklar.map((b, i) => (
            <article className="blok-kart" key={i}>
              <header className="blok-kart-bas">
                <span className="blok-kart-no">Blok {i + 1}{blokOzeti(b) ? ` · ${blokOzeti(b)}` : ''}</span>
                <div className="blok-kart-eylem">
                  <button type="button" className="icon-btn" disabled={i === 0}
                    onClick={() => tasi(i, -1)} aria-label="Yukarı taşı">
                    <Icon n="chevU" s={15} sw={2.4} />
                  </button>
                  <button type="button" className="icon-btn" disabled={i === bloklar.length - 1}
                    onClick={() => tasi(i, 1)} aria-label="Aşağı taşı">
                    <Icon n="chevD" s={15} sw={2.4} />
                  </button>
                  <button type="button" className="icon-btn" aria-label="Bloğu sil"
                    onClick={() => setBloklar((x) => x.filter((_, k) => k !== i))}>
                    <Icon n="x" s={15} sw={2.4} />
                  </button>
                </div>
              </header>

              <label className="blok-alan">
                <span>Başlık <span className="dim">(isteğe bağlı)</span></span>
                <input value={b.h ?? ''} maxLength={160}
                  onChange={(e) => guncelle(i, { h: e.target.value })} />
              </label>

              <label className="blok-alan">
                <span>Paragraf</span>
                <textarea rows={3} value={b.p ?? ''} maxLength={4000}
                  onChange={(e) => guncelle(i, { p: e.target.value })} />
              </label>

              <div className="blok-alan">
                <span>Liste <span className="dim">({b.liste?.length ?? 0} madde)</span></span>
                {(b.liste ?? []).map((m, k) => (
                  <div className="blok-madde" key={k}>
                    <input value={m} maxLength={400}
                      onChange={(e) => guncelle(i, {
                        liste: (b.liste ?? []).map((x, j) => (j === k ? e.target.value : x)),
                      })} />
                    <button type="button" className="icon-btn" aria-label={`${k + 1}. maddeyi sil`}
                      onClick={() => guncelle(i, { liste: (b.liste ?? []).filter((_, j) => j !== k) })}>
                      <Icon n="minus" s={15} sw={2.4} />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-quiet btn-sm"
                  onClick={() => guncelle(i, { liste: [...(b.liste ?? []), ''] })}>
                  <Icon n="plus" s={14} sw={2.4} /> Madde ekle
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
