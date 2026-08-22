'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from './AppState';
import Icon from './Icon';

import { TAPU_ADI, TLkisa, m2, teslimCeyrek } from '@/lib/bicim';
import type { OzellikKey, Proje } from '@/lib/types';

export default function CompareBar({ projeler }: { projeler: Proje[] }) {
  const { karsilastir, toggleKarsilastir, temizleKarsilastir } = useApp();
  const [acik, setAcik] = useState(false);

  const secilenler = karsilastir
    .map((id) => projeler.find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  if (!secilenler.length) return null;

  const satir = (baslik: string, hucre: (v: (typeof secilenler)[number]) => React.ReactNode) => (
    <tr key={baslik}>
      <th scope="row">{baslik}</th>
      {secilenler.map((v) => <td key={v.id}>{hucre(v)}</td>)}
    </tr>
  );
  const varMi = (v: (typeof secilenler)[number], k: OzellikKey) =>
    v.ozellik.includes(k)
      ? <span style={{ color: 'var(--success)', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon n="check" s={15} />Var</span>
      : <span className="dim">—</span>;

  return (
    <>
      <div className="compare-bar show">
        <span className="cb-txt">{secilenler.length} villa seçildi</span>
        <div className="cb-items">
          {secilenler.map((v) => (
            <div className="cb-item" key={v.id} title={v.ad}>
              <Image src={v.foto[0]} alt="" width={104} height={80} style={{ objectFit: 'cover' }} />
              <button type="button" onClick={() => toggleKarsilastir(v.id)} aria-label={`${v.ad} karşılaştırmadan çıkar`}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAcik(true)}>
          <Icon n="scale" s={15} /> Karşılaştır
        </button>
        <button type="button" className="icon-btn" style={{ color: 'inherit' }} onClick={temizleKarsilastir} aria-label="Karşılaştırmayı temizle">
          <Icon n="x" s={17} />
        </button>
      </div>

      {acik && (
        <div className="modal open" onClick={(e) => { if (e.target === e.currentTarget) setAcik(false); }} role="dialog" aria-modal="true" aria-label="Proje karşılaştırma">
          <div className="modal-box">
            <div className="modal-head">
              <h2 className="h3">Proje karşılaştırma</h2>
              <button type="button" className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setAcik(false)} aria-label="Kapat">
                <Icon n="x" s={20} />
              </button>
            </div>
            <table className="cmp-table">
              <tbody>
                <tr>
                  <th />
                  {secilenler.map((v) => (
                    <td key={v.id}>
                      <Image src={v.foto[0]} alt={v.ad} width={400} height={300} style={{ objectFit: 'cover' }} />
                      <b>{v.ad}</b>
                      <div className="tiny muted">{v.mahalle}, {v.bolge}</div>
                    </td>
                  ))}
                </tr>
                {satir('Fiyat aralığı', (v) => (
                  <b>{v.fiyatMax && v.fiyatMax > v.fiyatMin
                    ? `${TLkisa(v.fiyatMin)} – ${TLkisa(v.fiyatMax)}`
                    : `${TLkisa(v.fiyatMin)}'den`}</b>
                ))}
                {satir('Geliştirici', (v) => v.firma.ad)}
                {satir('Teslim', (v) => teslimCeyrek(v.teslim))}
                {satir('İnşaat ilerlemesi', (v) => (v.ilerleme > 0 ? `%${v.ilerleme}` : 'Başlamadı'))}
                {satir('Daire tipleri', (v) => (
                  [...new Set(v.daireTipleri.map((d) => d.oda))].join(', ') || '—'
                ))}
                {satir('Bağımsız bölüm', (v) => (v.olcek.bagimsizBolum?.toLocaleString('tr-TR') ?? '—'))}
                {satir('Blok sayısı', (v) => (v.olcek.blok?.toString() ?? '—'))}
                {satir('Yeşil alan', (v) => (v.olcek.yesilOran ? `%${v.olcek.yesilOran}` : '—'))}
                {satir('Peşinat', (v) => (v.odeme.pesinat > 0 ? `%${v.odeme.pesinat}` : 'Belirtilmedi'))}
                {satir('Vade', (v) => (v.odeme.vade > 0 ? `${v.odeme.vade} ay` : 'Yok'))}
                {satir('Konut kredisi', (v) => (v.odeme.krediyeUygun ? 'Uygun' : 'Uygun değil'))}
                {satir('Tapu', (v) => (v.odeme.tapu ? TAPU_ADI[v.odeme.tapu] : '—'))}
                {satir('Aidat (tahmini)', (v) => (v.odeme.aidat ? `${TLkisa(v.odeme.aidat)} / ay` : '—'))}
                {satir('Metroya yakın', (v) => varMi(v, 'metroyakin'))}
                {satir('Kapalı otopark', (v) => varMi(v, 'kapaliotopark'))}
                {satir('Yüzme havuzu', (v) => varMi(v, 'yuzmehavuzu'))}
                {satir('2018 yönetmeliği', (v) => varMi(v, 'depremyonetmelik'))}
                <tr>
                  <th />
                  {secilenler.map((v) => (
                    <td key={v.id}>
                      <Link className="btn btn-primary btn-sm" href={`/proje/${v.slug}`}>İncele</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
