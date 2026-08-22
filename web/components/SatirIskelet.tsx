/* ============================================================
   Sonuç iskeleti.

   İlk yüklemede liste boştu ve altında yalnızca "Aranıyor…" yazıyordu;
   sayfa bir anda doluyor, harita ile liste birlikte zıplıyordu.
   İskelet gelecek yapının yerini şimdiden tutuyor: satır yüksekliği
   gerçek `VillaSatir` ile aynı, dolayısıyla sonuçlar gelince düzen
   kaymıyor.

   Yalnızca İLK yüklemede çıkıyor. Filtre değişiminde eldeki liste
   soluyor (`.soluk`) — var olan sonuçları iskeletle değiştirmek,
   kullanıcının okuduğu şeyi elinden almak olurdu.
   ============================================================ */
export default function SatirIskelet({ adet = 4 }: { adet?: number }) {
  return (
    <div className="vsatir-liste" aria-hidden="true">
      {Array.from({ length: adet }, (_, i) => (
        <div className="vsatir iskelet" key={i}>
          <div className="isk-media" />
          <div className="isk-govde">
            <div className="isk-satir" style={{ width: '48%', height: 20 }} />
            <div className="isk-satir" style={{ width: '32%' }} />
            <div className="isk-kunye">
              {Array.from({ length: 4 }, (_, k) => <div className="isk-satir" key={k} style={{ width: 62 }} />)}
            </div>
            <div className="isk-etiket">
              {Array.from({ length: 3 }, (_, k) => (
                <div className="isk-satir" key={k} style={{ width: 70 + k * 22, height: 22, borderRadius: 999 }} />
              ))}
            </div>
            <div className="isk-alt">
              <div className="isk-satir" style={{ width: 120, height: 26 }} />
              <div className="isk-satir" style={{ width: 96, height: 32, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
