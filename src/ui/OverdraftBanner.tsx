import { MINUTES_PER_DAY, MINUTES_PER_HOUR } from '../sim/constants';
import { useGame } from '../store/game';
import { money } from './format';

function remaining(minutes: number): string {
  const m = Math.max(0, minutes);
  const d = Math.floor(m / MINUTES_PER_DAY);
  const h = Math.floor((m % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h`;
  return `${Math.ceil(m)}m`;
}

export function OverdraftBanner() {
  const overdraft = useGame((g) => g.state?.overdraft ?? null);
  const minute = useGame((g) => g.state?.minute ?? 0);
  const cash = useGame((g) => g.state?.player.cash ?? 0);
  if (!overdraft) return null;

  return (
    <div role="alert" className="border-y border-bad/50 bg-bad/15 px-4 py-2 text-sm">
      <p className="font-bold text-bad">OVERDRAFT — get back to $0 in {remaining(overdraft.deadlineMinute - minute)}</p>
      <p className="text-xs text-ink">
        Cash: <span className="font-semibold tabular-nums">{money(cash)}</span> · or it&apos;s a one-way ticket home.
      </p>
    </div>
  );
}
