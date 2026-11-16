import PlayerName from './PlayerName.tsx';
import { PencilIcon, VisitDartIcon } from './Icons.tsx';
import { CRICKET_TARGETS } from '../game/cricket.ts';
import { dartLabel } from '../game/x01.ts';
import type { Dart } from '../game/x01.ts';
import type { cricketScore } from '../game/cricketPresentation.ts';

export const decimal = (n: number) => n.toFixed(2).replace('.', ',');

function CricketMarks({ count }: { count: number }) {
  return <svg className="cricket-marks" viewBox="0 0 48 48" role="img" aria-label={`${count} ${count === 1 ? 'zásah' : 'zásahy'}`}>
    {!count && <path d="M20 24h8" opacity=".28" />}
    {count >= 1 && <path d="M14 34l20-20" />}{count >= 2 && <path d="M14 14l20 20" />}{count >= 3 && <circle cx="24" cy="24" r="19" />}
  </svg>;
}

export function CricketScoreboard({ score, readOnly }: { score: ReturnType<typeof cricketScore>; readOnly?: boolean }) {
  return <div className="cricket-table-scroll card" tabIndex={readOnly ? undefined : 0} role="region" aria-label="Tabulka Cricketu">
    <table className="cricket-table" style={readOnly ? undefined : { minWidth: 82 + score.players.length * 150 }}>
      <thead><tr>
        <th scope="col" className="cricket-target-heading"><span className="eyebrow">ČÍSLO</span></th>
        {score.players.map(({ player, points, legsWon, darts, mpr }, i) => {
          const active = i === score.active;
          return <th key={player.id} scope="col" className={active ? 'cricket-active' : ''} aria-current={active ? 'true' : undefined}>
            <PlayerName {...player} avatarSeed={player.id} avatarSize={32} />
            <div className="cricket-score">
              <strong aria-label={`${player.name}: ${points} bodů`}>{points}</strong>
              <span className="cricket-legs" title="Vyhrané legy" aria-label={`${legsWon} vyhraných legů`}>{legsWon}</span>
            </div>
            <div className="cricket-player-metrics">
              <span title="Počet hozených šipek v legu"><VisitDartIcon />{darts}</span>
              <span title="Průměr platných zásahů na tři šipky v legu">MPR {decimal(mpr)}</span>
            </div>
          </th>;
        })}
      </tr></thead>
      <tbody>{CRICKET_TARGETS.map((target, row) => {
        const closed = score.players.every(({ marks }) => marks[row] === 3);
        return <tr key={target} className={closed ? 'cricket-target-closed' : ''}>
          <th scope="row" title={closed ? 'Zavřeno všemi hráči – již neboduje' : undefined}>{target === 25 ? 'BULL' : target}</th>
          {score.players.map(({ player, marks }, i) => <td key={player.id} className={i === score.active ? 'cricket-active' : ''}>
            <CricketMarks count={marks[row]} />
          </td>)}
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export function CricketVisit({ darts, marks, points, selected, closed, onSelect, readOnly }: {
  darts: Dart[]; marks: number; points: number; selected?: number; closed?: boolean;
  onSelect?: (index: number) => void; readOnly?: boolean;
}) {
  return <section className="visit-strip" aria-label="Aktuální hody" aria-live="polite">
    {[0, 1, 2].map(i => {
      const dart = darts[i] ? dartLabel(darts[i]) : undefined;
      const className = `visit-slot ${dart ? 'filled' : 'empty'}`;
      const label = `${i + 1}. šipka: ${dart ?? 'neházeno'}`;
      const content = dart ? <strong key={dart} className="dart-register">{dart}</strong> : <VisitDartIcon />;
      if (readOnly) return <div key={i} className={className} aria-label={label}>{content}</div>;
      return <button key={i} className={className} aria-label={label} aria-pressed={selected === i}
        disabled={!onSelect || (!dart && (i !== darts.length || closed))} onClick={() => onSelect?.(i)}>
        {content}{selected === i && <span className="visit-edit-icon"><PencilIcon size={15} /></span>}
      </button>;
    })}
    <div className="visit-total" aria-label={`Kolo: ${marks} zásahů, ${points} bodů`}><strong>{marks}</strong>{points > 0 && <span>+{points} b.</span>}</div>
  </section>;
}
