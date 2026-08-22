'use client';

import { useApp } from './AppState';
import Icon from './Icon';

export default function DetailActions({ id, ad }: { id: string; ad: string }) {
  const { favoriler, toggleFavori, bildir } = useApp();
  const favori = favoriler.includes(id);

  return (
    <div className="detail-actions">
      <button
        type="button" className="btn btn-quiet btn-sm"
        onClick={async () => {
          const url = window.location.href;
          if (navigator.share) { try { await navigator.share({ title: ad, url }); return; } catch { /* iptal */ } }
          await navigator.clipboard?.writeText(url);
          bildir('Bağlantı kopyalandı');
        }}
      >
        <Icon n="share" s={16} /> Paylaş
      </button>
      <button
        type="button" className="btn btn-quiet btn-sm" onClick={() => toggleFavori(id)} aria-pressed={favori}
        style={favori ? { color: 'var(--accent)' } : undefined}
      >
        <Icon n="heart" s={16} /> {favori ? 'Kaydedildi' : 'Kaydet'}
      </button>
    </div>
  );
}
