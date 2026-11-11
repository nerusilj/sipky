// Medaile se stuhou nechává pořadí čitelné i bez rozlišení barev.
export default function PlacementBadge({ place }: { place: number }) {
  const tone = place === 1 ? 'gold' : place === 2 ? 'silver' : place === 3 ? 'bronze' : 'neutral';
  return <span className={`place-badge place-badge-${tone}`} role="img" aria-label={`${place}. místo`} title={`${place}. místo`}>
    <svg viewBox="0 0 44 54" fill="none" aria-hidden="true">
      <path className="place-ribbon" d="m11 30-5 21 9-5 6 6 3-19M23 33l1 19 7-6 7 5-5-21" />
      <circle className="place-medal" cx="22" cy="20" r="18" />
      <circle className="place-medal-inner" cx="22" cy="20" r="14" />
    </svg>
    <span className="place-number" aria-hidden="true">{place}</span>
  </span>;
}
