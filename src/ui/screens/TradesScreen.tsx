import { useGame } from '../../store/game';
import { clock, day } from '../format';

export function TradesScreen() {
  const trades = useGame((g) => g.state?.trades);
  if (!trades) return null;
  const items = [...trades].sort((a, b) => b.minute - a.minute);

  return (
    <div>
      <header className="mb-3 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-black uppercase tracking-[0.15em]">The Trades</h1>
        <div className="my-1.5 border-y-2 border-double border-ink py-0.5" aria-hidden />
        <p className="text-xs italic text-muted">All the news that fits, and some that doesn&apos;t</p>
      </header>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Slow news day. Nobody has been fired, hired or canceled. Yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((h) => (
            <li key={h.id} className="py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
                <span className="tabular-nums">
                  Day {day(h.minute)} {clock(h.minute)}
                </span>
                {h.own && (
                  <span className="rounded border border-accent/60 bg-accent/15 px-1.5 py-0.5 font-bold text-accent" aria-label="About you">
                    YOU
                  </span>
                )}
              </div>
              <p className={`mt-0.5 font-[family-name:var(--font-display)] leading-snug ${h.own ? 'font-bold' : 'font-semibold'}`}>{h.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
