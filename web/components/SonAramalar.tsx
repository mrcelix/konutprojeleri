'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { sonAramalariOku, sonAramalariSil, type SonArama } from '@/lib/son-aramalar';

/* Liste yalnızca istemcide okunuyor: sunucuda localStorage yok ve
   hidrasyon uyuşmazlığı olmaması için ilk render boş. */
export default function SonAramalar({ baslik = 'Son aramalarınız' }: { baslik?: string }) {
  const [liste, setListe] = useState<SonArama[]>([]);

  useEffect(() => { setListe(sonAramalariOku()); }, []);

  if (liste.length === 0) return null;

  return (
    <section className="son-arama">
      <div className="son-arama-bas">
        <h2><Icon n="clock" s={15} /> {baslik}</h2>
        <button type="button" className="uyg-temizle"
          onClick={() => { sonAramalariSil(); setListe([]); }}>
          Geçmişi sil
        </button>
      </div>
      <div className="son-arama-liste">
        {liste.map((a) => (
          <Link key={a.anahtar} className="son-arama-cip" href={`/arama?${a.sorgu}`}>
            <Icon n="search" s={14} sw={2.2} />
            {a.etiket}
          </Link>
        ))}
      </div>
      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        Bu liste yalnızca bu tarayıcıda tutuluyor; sunucuya gönderilmiyor.
      </p>
    </section>
  );
}
