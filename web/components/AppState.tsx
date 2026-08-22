'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Tema = 'light' | 'dark';

interface Durum {
  favoriler: string[];
  toggleFavori: (id: string) => void;
  karsilastir: string[];
  toggleKarsilastir: (id: string) => boolean;
  temizleKarsilastir: () => void;
  tema: Tema;
  toggleTema: () => void;
  bildir: (m: string) => void;
  mesaj: string | null;
}

const Ctx = createContext<Durum | null>(null);

const oku = <T,>(k: string, v: T): T => {
  if (typeof window === 'undefined') return v;
  try { return JSON.parse(localStorage.getItem('vn_' + k) ?? '') ?? v; } catch { return v; }
};

export function AppState({ children }: { children: React.ReactNode }) {
  const [favoriler, setFav] = useState<string[]>([]);
  const [karsilastir, setCmp] = useState<string[]>([]);
  const [tema, setTema] = useState<Tema>('light');
  const [mesaj, setMesaj] = useState<string | null>(null);

  // localStorage yalnızca istemcide okunur — hidrasyon uyuşmazlığını önler.
  useEffect(() => {
    setFav(oku<string[]>('fav', []));
    setCmp(oku<string[]>('cmp', []));
    setTema((document.documentElement.dataset.theme as Tema) ?? 'light');
  }, []);

  const bildir = useCallback((m: string) => {
    setMesaj(m);
    const t = setTimeout(() => setMesaj(null), 2600);
    return () => clearTimeout(t);
  }, []);

  const toggleFavori = useCallback((id: string) => {
    setFav((f) => {
      const yeni = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vn_fav', JSON.stringify(yeni));
      setMesaj(f.includes(id) ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi ♥');
      setTimeout(() => setMesaj(null), 2600);
      return yeni;
    });
  }, []);

  const toggleKarsilastir = useCallback((id: string) => {
    let kabul = true;
    setCmp((c) => {
      if (c.includes(id)) {
        const yeni = c.filter((x) => x !== id);
        localStorage.setItem('vn_cmp', JSON.stringify(yeni));
        return yeni;
      }
      if (c.length >= 3) {
        kabul = false;
        setMesaj('En fazla 3 villa karşılaştırılabilir');
        setTimeout(() => setMesaj(null), 2600);
        return c;
      }
      const yeni = [...c, id];
      localStorage.setItem('vn_cmp', JSON.stringify(yeni));
      return yeni;
    });
    return kabul;
  }, []);

  const temizleKarsilastir = useCallback(() => {
    setCmp([]);
    localStorage.setItem('vn_cmp', JSON.stringify([]));
  }, []);

  const toggleTema = useCallback(() => {
    setTema((t) => {
      const yeni: Tema = t === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = yeni;
      localStorage.setItem('vn_theme', JSON.stringify(yeni === 'dark'));
      return yeni;
    });
  }, []);

  const deger = useMemo<Durum>(() => ({
    favoriler, toggleFavori, karsilastir, toggleKarsilastir, temizleKarsilastir,
    tema, toggleTema, bildir, mesaj,
  }), [favoriler, toggleFavori, karsilastir, toggleKarsilastir, temizleKarsilastir, tema, toggleTema, bildir, mesaj]);

  return (
    <Ctx.Provider value={deger}>
      {children}
      <div className={'toast' + (mesaj ? ' show' : '')} role="status" aria-live="polite">{mesaj}</div>
    </Ctx.Provider>
  );
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp yalnızca AppState içinde kullanılabilir');
  return c;
}

/** Tema tercihini ilk boyamadan önce uygular — FOUC olmaz. */
export const temaScript = `(function(){try{var s=localStorage.getItem('vn_theme');var d=s===null?matchMedia('(prefers-color-scheme: dark)').matches:JSON.parse(s);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})();`;
