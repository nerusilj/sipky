export default function ComingSoonPage({ title, text }: { title: string; text: string }) {
  return <div className="page">
    <div className="page-heading"><div><h1>{title}</h1><p>{text}</p></div></div>
    <div className="card coming-soon"><span className="badge amber">PŘIPRAVUJEME</span><p>Tato sekce zatím není součástí verze v0.1. Nejdřív se z DEV sekce učíme skutečné události terče.</p></div>
  </div>;
}
