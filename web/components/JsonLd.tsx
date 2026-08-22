/** JSON-LD enjeksiyonu. Veri her zaman sunucuda üretilir, kullanıcı girdisi içermez. */
export default function JsonLd({ data }: { data: object | object[] }) {
  const liste = Array.isArray(data) ? data : [data];
  return (
    <>
      {liste.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, '\\u003c') }}
        />
      ))}
    </>
  );
}
