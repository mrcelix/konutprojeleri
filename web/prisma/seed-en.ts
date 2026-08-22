/**
 * İngilizce içerik.
 *
 * Türkçe editöryel metin bölge başına 1.100+ kelime; İngilizce
 * karşılıkları BU UZUNLUKTA DEĞİL. Bilinçli bir karar:
 *
 * · Makine çevirisiyle uzun metin üretmek Google'ın "otomatik oluşturulmuş
 *   içerik" tanımına girme riski taşıyor.
 * · İngilizce arayan kitle çoğunlukla yurt dışından alım yapıyor ya da
 *   Türkiye'de yeni; uzun yerel ayrıntıdan çok "burası neresi, kim
 *   oturuyor, nasıl ulaşılıyor, alım süreci nasıl işliyor" sorularının
 *   net yanıtını arıyor.
 *
 * Buradaki metinler elle yazıldı ve İngilizce okura göre kurgulandı.
 * Tam parite gerektiğinde profesyonel çeviri/yerelleştirme yapılmalı.
 *
 * SAYI YOK. Türkçe tarafta olduğu gibi burada da fiyat, getiri oranı
 * ve arsa değeri geçmiyor: hızla eskiyen ve doğrulanması gereken bir
 * rakamı tohum verisine gömmek, sitenin en zararlı yanlış bilgisi
 * olurdu. Güncel rakamlar proje kayıtlarından geliyor.
 */

export interface BolgeEn {
  slug: string;
  ozet: string;
  icerik: {
    giris: string;
    mevkiler: { baslik: string; metin: string }[];
    yatirim: string;
    ulasim: string;
    ipuclari: string[];
  };
}

export const BOLGELER_EN: BolgeEn[] = [
  {
    slug: 'atasehir',
    ozet: 'A planned district on Istanbul\'s Asian side, built around the city\'s financial centre. Large plots mean large schemes: gated, multi-block developments where housing and offices often share a site.',
    icerik: {
      giris: 'Ataşehir is one of the few Istanbul districts laid out on a plan rather than grown into. Street grid and block sizes were drawn before construction, which is why plots here are big and developments come at estate scale — several blocks, shared amenities, a single managed entrance. The district\'s pull today comes from the financial centre: the concentration of corporate offices keeps housing demand anchored to "living near work", and it is the reason mixed-use schemes (homes plus offices on one parcel) are far more common here than the national average.',
      mevkiler: [
        { baslik: 'Barbaros', metin: 'Closest to the financial centre and the upper end of the district\'s price range. Most new launches are here. Office density means weekday traffic peaks in the evening.' },
        { baslik: 'Küçükbakkalköy', metin: 'The heart of mixed use — retail at ground level, homes above. You can reach a supermarket or a café without a car, which is not true everywhere in the district.' },
        { baslik: 'İçerenköy', metin: 'Older building stock and the focus of urban-renewal schemes. Fewer new projects than Barbaros, but fewer units per plot too — the choice for buyers who want a smaller estate.' },
        { baslik: 'Yenisahra', metin: 'Among the shortest walks to the metro. Residential in character with little commercial density; the quieter side of the district.' },
      ],
      yatirim: 'Tenant demand is driven by the corporate offices nearby and concentrates in one- and two-bedroom units; the pool narrows noticeably above three bedrooms. Budget for service charges as a separate line: mixed-use schemes with indoor pools and fitness centres carry higher monthly costs than single-use buildings of the same size. Check how many nearby projects complete in the same quarter — a crowded handover window means a crowded letting market.',
      ulasim: 'Sabiha Gökçen airport (SAW) is roughly 30 km and 35–50 minutes by road; Istanbul Airport (IST) is 55 km and can take 60–90 minutes. Kadıköy is about 25–40 minutes. Metro access varies by neighbourhood — 5 to 15 minutes on foot depending on where the project sits.',
      ipuclari: [
        'In financial-centre schemes the price gap between view floors and lower floors is significant. On a tight budget, compromising on aspect costs less than compromising on floor area.',
        'In mixed-use projects, ask whether office and residential entrances are separate. Shared lobbies get busy on weekday mornings.',
        'Estimate service charges from the amenity list, not the floor area: an indoor pool and a gym are the two largest line items.',
        'Confirm in the contract whether the parking right belongs to the unit or to the development. They are not the same thing.',
        '"Walking distance to the metro" means different things to different developers. Time the walk yourself.',
      ],
    },
  },
  {
    slug: 'basaksehir',
    ozet: 'Istanbul\'s largest planned growth area on the European side, built out in phases. Generous floor areas and family-oriented layouts define the supply here.',
    icerik: {
      giris: 'Başakşehir was planned from open land in phases, and each phase reads differently: the older stages are settled, tree-lined and low-key, while the newer ones are still under construction. Because the district was not constrained by existing fabric, unit sizes run larger than the Istanbul average and layouts lean towards families — three- and four-bedroom plans are the core of the stock rather than the top end. Amenity provision is generous for the same reason: developers had the land for it.',
      mevkiler: [
        { baslik: 'Kayaşehir', metin: 'The newest phase and where most current launches sit. Wide boulevards, large parcels and a metro connection completed with the district rather than retrofitted.' },
        { baslik: 'Başak Konutları', metin: 'The settled core. Mature landscaping and established schools; new supply here comes from renewal rather than open land.' },
        { baslik: 'Ziya Gökalp', metin: 'Closer to the district\'s commercial spine, with a higher share of ground-floor retail and smaller unit types.' },
        { baslik: 'Şahintepe', metin: 'On the edge towards the reservoir and green belt. Lower density, longer drive to the metro, more open outlook.' },
      ],
      yatirim: 'This is an owner-occupier district first: the tenant pool is thinner than on the Asian side and skews towards families on longer leases, which means fewer voids but slower rent growth. Larger units let more readily here than they would in a central district. Because the area is still building out, check what is planned on the surrounding parcels — an open view today may be a neighbouring block in three years.',
      ulasim: 'Istanbul Airport (IST) is around 30 minutes by road. The M3 metro runs through the district and connects onward to the wider network; journey time to the historic centre is roughly an hour. The TEM motorway is the main road link and the district sits close to one of its main junctions.',
      ipuclari: [
        'Ask which phase a project belongs to. Phases differ more than neighbourhoods do here — in density, in landscaping, and in how much construction is still going on around them.',
        'Check the parcels adjacent to the project on the zoning plan, not just the project itself.',
        'Family-sized units dominate, so competition for the smaller types at handover can be sharper than the headline supply suggests.',
        'Green-space ratios are high across the district; compare them project by project rather than assuming.',
        'School catchment matters more here than in most Istanbul districts. Confirm it before you commit.',
      ],
    },
  },
  {
    slug: 'kartal',
    ozet: 'A former industrial coastline turned residential. Sea views, a metro line and Marmaray together make this one of the Asian side\'s fastest-changing districts.',
    icerik: {
      giris: 'Kartal\'s shoreline was industrial land within living memory, and its redevelopment is the reason the district now carries some of the tallest residential blocks on the Asian side. That history shapes the stock: large single-owner parcels released at once, which produced high-rise schemes with sea views rather than the incremental infill seen elsewhere. Away from the coast the district is older and lower, and the contrast between the two halves is sharp.',
      mevkiler: [
        { baslik: 'Sahil (coastal strip)', metin: 'Where the towers are. Sea views from mid-height upwards, a coastal park and the marina within walking distance. The upper end of the district.' },
        { baslik: 'Kordonboyu', metin: 'Between the shore and the E-5, close to both the metro and the coast. Mixed heights and the most walkable part of the district.' },
        { baslik: 'Soğanlık', metin: 'Inland and traditionally residential; renewal schemes here are smaller and prices sit below the coastal strip.' },
        { baslik: 'Yakacık', metin: 'On the higher ground behind the district, greener and cooler, with open views back towards the sea from the upper slopes.' },
      ],
      yatirim: 'The sea view is the district\'s pricing variable — the gap between a view unit and an equivalent unit facing inland is the largest single factor here, and it holds on resale. Rental demand comes from the Anatolian-side commuter market and benefits from having both metro and Marmaray. Verify what can be built between a project and the water before paying for a view; on a redeveloping coastline, that is a live question.',
      ulasim: 'Sabiha Gökçen airport (SAW) is about 25 minutes by road. The M4 metro runs through the district to Kadıköy in roughly 30 minutes, and Marmaray gives a cross-Bosphorus rail link without a road crossing. The coastal road and the E-5 are the main routes by car.',
      ipuclari: [
        'Ask what the zoning permits on the parcels between the project and the sea. A view is only as secure as the plan behind it.',
        'Height matters: in coastal towers the view often starts several floors up, and the marketing images are usually shot from the top.',
        'Wind exposure on the shoreline is real. Ask about balcony glazing.',
        'Check the walking route to the metro rather than the straight-line distance — the E-5 is not always easy to cross.',
        'Older inland streets are being renewed piecemeal, so construction noise around a finished project can last for years.',
      ],
    },
  },
  {
    slug: 'cankaya',
    ozet: 'Ankara\'s established centre. With little open land left, new supply comes almost entirely from urban renewal — boutique schemes of 30 to 80 units rather than large estates.',
    icerik: {
      giris: 'Çankaya is where Ankara\'s institutions, embassies and older apartment stock sit, and it has been fully built for decades. That single fact explains the local market: there is almost no open land, so new projects replace existing buildings one plot at a time. Schemes are small by Istanbul standards — thirty to eighty units is typical — and they are woven into existing streets rather than set behind a gate. Buyers here are usually trading up within the district rather than moving into it.',
      mevkiler: [
        { baslik: 'Çukurambar', metin: 'The district\'s newest face, with the highest concentration of recent building and a strong office presence alongside housing.' },
        { baslik: 'Gaziosmanpaşa', metin: 'Embassy district. Low density, mature trees, and renewal projects that are small and expensive.' },
        { baslik: 'Ayrancı', metin: 'Settled, central and walkable, with a well-established café and retail street life. Renewal here is plot-by-plot.' },
        { baslik: 'Oran', metin: 'Planned in the 1980s and greener than the district average, with larger units and more parking than the older streets.' },
      ],
      yatirim: 'Demand is steady rather than cyclical: the public institutions and universities that anchor the district do not move. Because schemes are small, supply arrives in modest quantities and rarely floods a neighbourhood. The trade-off is amenity — a thirty-unit renewal building will not carry a pool or a gym, and buyers expecting estate-scale facilities should look at the newer edges of the city instead.',
      ulasim: 'Esenboğa airport (ESB) is around 45 minutes by road. The Ankara metro serves the district, and the central business areas are reachable in 15–25 minutes from most neighbourhoods. Much of the district is genuinely walkable, which is unusual for the city.',
      ipuclari: [
        'In renewal projects, ask about the arrangement with the previous owners — how many units are allocated to them shapes who your neighbours will be.',
        'Small schemes mean shared costs are divided among few households. Check what the building actually commits to maintaining.',
        'Parking is the scarcest resource in the older streets. Confirm the ratio of spaces to units.',
        'Trees on and around the plot are protected in parts of the district; ask what survives construction.',
        'Because buildings replace buildings, ask when the neighbouring plots are scheduled for renewal.',
      ],
    },
  },
  {
    slug: 'bornova',
    ozet: 'İzmir\'s academic centre. Having a major university campus inside the district shapes both the supply of smaller units and the depth of the student rental market.',
    icerik: {
      giris: 'Bornova sits at the head of the İzmir gulf and holds the city\'s largest university campus. That single institution shapes the local market more than anything else: demand for compact units is constant, the letting cycle follows the academic year, and developers respond with a higher share of studio and one-bedroom plans than anywhere else in İzmir. Away from the campus, the district has an older residential core and, on the higher ground, a quieter and greener character.',
      mevkiler: [
        { baslik: 'Kazımdirik', metin: 'Adjacent to the campus and the centre of the student rental market. Compact units, high turnover, strong year-round demand.' },
        { baslik: 'Erzene', metin: 'Settled residential streets within walking distance of the campus, with larger units and a more permanent resident profile.' },
        { baslik: 'Evka 3', metin: 'A planned housing area with generous green space, popular with families and served by the metro.' },
        { baslik: 'Çamdibi', metin: 'Closer to the city centre and the industrial belt, with lower prices and a mix of older and renewed stock.' },
      ],
      yatirim: 'The student market is the district\'s defining feature: reliable demand for small units, but a letting calendar tied to the academic year and higher wear on the property. Family-sized units let to a different and steadier market away from the campus. Whichever you choose, know which market you are buying into — the two behave differently and the right unit for one is the wrong unit for the other.',
      ulasim: 'Adnan Menderes airport (ADB) is about 40 minutes by road. The İzmir metro runs through the district to Konak in roughly 25 minutes, and İZBAN suburban rail adds a second line. The ring road connects the district to the wider metropolitan area.',
      ipuclari: [
        'Ask when the building was handed over relative to the academic year — a September completion lets far more easily than a February one.',
        'Compact units near the campus are the most competitive segment. Layout quality matters more than headline floor area.',
        'Check parking provision: the student market brings fewer cars, but a family-oriented block without parking is hard to resell.',
        'The higher ground behind the district is noticeably cooler in summer.',
        'Furnished lettings are the norm near the campus; factor the fit-out into your budget.',
      ],
    },
  },
  {
    slug: 'nilufer',
    ozet: 'Bursa\'s planned district: wide boulevards, high green-space ratios and family-oriented estates. The most consistent new-build supply in the city.',
    icerik: {
      giris: 'Nilüfer grew under a plan, and it shows. Boulevards are wide, blocks are regular, and the green-space ratio is well above the city average — which is exactly why developers here build at estate scale with landscaped grounds rather than infill blocks. The district has become the default choice for families moving out of Bursa\'s older centre, and the housing stock reflects that: larger units, more low-rise, and a higher share of villa and townhouse schemes than anywhere else in the city.',
      mevkiler: [
        { baslik: 'Görükle', metin: 'Home to the university campus and the district\'s student market, with a concentration of smaller units.' },
        { baslik: 'Özlüce', metin: 'Established family estates with mature landscaping, good schools and a settled resident profile.' },
        { baslik: 'İhsaniye', metin: 'Central to the district, walkable, with the densest concentration of shops and services.' },
        { baslik: 'Beşevler', metin: 'Closer to the industrial belt and the ring road, with more affordable stock and quicker access to the motorway.' },
      ],
      yatirim: 'The district\'s economy rests on Bursa\'s automotive and manufacturing base, which supports a steady white-collar rental market for mid-sized units. Low-rise and villa schemes hold their value well here because the land supply that allows them is finite. As always, treat the service charge as part of the purchase price: landscaped estates cost more to run than they look like they should.',
      ulasim: 'Yenişehir airport (YEI) is around 60 minutes by road; İstanbul is roughly 2.5 hours via the Osmangazi bridge. The district is served by the Bursaray light rail, and the ring road puts most of the city within 20–30 minutes.',
      ipuclari: [
        'Green-space ratios vary a lot between estates despite the district average. Ask for the figure on the specific project.',
        'Low-rise and villa schemes carry higher service charges per unit than apartment blocks. Get the number before you decide.',
        'Check the walking route to the light rail rather than the road distance.',
        'Family estates fill up at handover; the second-hand market inside a popular estate is thin for the first few years.',
        'Ask which phase you are buying into and what remains to be built on the same site.',
      ],
    },
  },
];

/** Proje özetleri — slug → İngilizce özet. */
export const PROJE_OZET_EN: Record<string, string> = {
  'meridyen-park-atasehir': 'A mixed-use scheme in Barbaros, walking distance from Istanbul\'s financial centre, combining apartments and offices on one landscaped parcel with separate entrances for each.',
  'anka-vadi-basaksehir': 'A family-oriented estate in the Kayaşehir phase of Başakşehir, built around a central green spine, with generous three- and four-bedroom layouts and a metro station within walking distance.',
  'kordon-deniz-kartal': 'A coastal high-rise on Kartal\'s redeveloped shoreline, with open sea views from the middle floors upwards and the marina and coastal park a short walk away.',
  'ova-residence-cankaya': 'A boutique renewal scheme in Çukurambar, Ankara — a single building of moderate size on an established street, aimed at buyers trading up within the district.',
  'ege-hane-kampus-bornova': 'A compact-unit development beside the university campus in Bornova, planned around the student and young-professional rental market with layouts to match.',
  'yesilova-bahce-nilufer': 'A low-rise villa scheme in Nilüfer, Bursa, with private gardens, a shared landscaped park and the space for both that the district\'s planning allows.',
  'meridyen-ofis-atasehir': 'An office development beside the financial centre in Ataşehir, with floorplates suited to both single-tenant occupation and division, and electric-vehicle charging throughout the car park.',
  'anka-terrace-kartal': 'A completed and handed-over residential scheme on the higher ground behind Kartal, with terraced upper units looking back towards the sea.',
};

/** Özellik adları — kod → İngilizce ad. */
export const OZELLIK_EN: Record<string, string> = {
  /* Güvenlik ve giriş */
  guvenlik: '24/7 security',
  kamera: 'CCTV',
  kapalisite: 'Gated estate',
  akillEv: 'Smart home system',
  /* Otopark */
  kapaliotopark: 'Covered parking',
  acikotopark: 'Open parking',
  sarj: 'EV charging',
  /* Sosyal tesis */
  yuzmehavuzu: 'Swimming pool',
  kapalihavuz: 'Indoor pool',
  fitness: 'Gym',
  sauna: 'Sauna',
  spa: 'Spa',
  cocukoyun: 'Children\'s playground',
  basketbol: 'Basketball court',
  tenis: 'Tennis court',
  kosuparkuru: 'Running track',
  sosyaltesis: 'Clubhouse',
  /* Çevre ve konum */
  peyzaj: 'Extensive landscaping',
  manzara: 'View',
  denizemesafe: 'Close to the sea',
  metroyakin: 'Close to the metro',
  okulyakin: 'Close to schools',
  avmyakin: 'Close to a shopping centre',
  hastaneyakin: 'Close to a hospital',
  merkez: 'Central location',
  doga: 'Surrounded by green space',
  /* Yapı */
  depremyonetmelik: '2018 seismic code',
  'jeneratör': 'Backup generator',
  asansor: 'Lift',
  engelli: 'Step-free access',
  isiyalitim: 'Thermal insulation',
  sesyalitim: 'Acoustic insulation',
  yerdenisitma: 'Underfloor heating',
  dogalgaz: 'Mains gas',
};
