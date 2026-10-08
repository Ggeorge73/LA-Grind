import { useGame } from '../../store/game';
import { clock, day } from '../format';

export function LogScreen() {
  const log = useGame((g) => g.state?.log);
  if (!log) return null;
  const items = [...log].sort((a, b) => b.minute - a.minute);

  return (
    <div>
      <h1 className="mb-3 font-[family-name:var(--font-display)] text-xl font-bold">Activity log</h1>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing yet. Your memoir is off to a slow start.</p>
      ) : (
        <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((e) => (
            <li key={e.id} className="flex gap-3 px-3 py-2 text-sm">
              <span className="shrink-0 text-xs tabular-nums text-muted">
                Day {day(e.minute)} {clock(e.minute)}
              </span>
              <span className="min-w-0 break-words">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
