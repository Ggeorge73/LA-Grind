import { useEffect, useRef } from 'react';
import { ARCHETYPES, ARCHETYPE_IDS } from '../../sim/content/archetypes';
import { NEW_RUN_NETWORK_KEEP } from '../../sim/constants';
import { dayOf } from '../../sim/formulas';
import { useGame } from '../../store/game';
import { money } from '../format';
import { Button, Card, SectionTitle } from '../kit';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function RunSummary() {
  const state = useGame((g) => g.state);
  const titleRef = useRef<HTMLHeadingElement>(null);
  // Move focus into the dialog so keyboard and screen-reader users land on the summary.
  useEffect(() => titleRef.current?.focus(), []);
  if (!state) return null;
  const { stats, player } = state;
  const days = dayOf(state.minute) - dayOf(stats.startMinute) + 1;
  const best = stats.bestBooking ? `${stats.bestBooking.title} · ${money(stats.bestBooking.pay)}` : 'None. Not even background.';
  const carried = Math.floor(player.network * NEW_RUN_NETWORK_KEEP);

  return (
    <div
      className="safe-top safe-bottom fixed inset-0 z-50 overflow-y-auto bg-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-summary-title"
    >
      <div className="mx-auto max-w-xl px-4 pb-6 pt-4">
        <h1 id="run-summary-title" ref={titleRef} tabIndex={-1} className="outline-none text-center font-[family-name:var(--font-display)] text-3xl font-black">
          Moved Back Home
        </h1>
        <p className="mt-1 text-center text-sm text-muted">Your childhood bedroom still has the poster up.</p>

        {stats.endHeadline && (
          <figure className="mx-auto mt-5 max-w-sm -rotate-1 rounded-sm border border-line bg-ink p-4 text-bg shadow-lg">
            <p className="text-center font-[family-name:var(--font-display)] text-[10px] font-bold uppercase tracking-[0.25em]">The Trades</p>
            <div className="my-1.5 border-t-2 border-double border-bg" aria-hidden />
            <blockquote className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug">{stats.endHeadline}</blockquote>
          </figure>
        )}

        <SectionTitle>The damage</SectionTitle>
        <Card>
          <dl className="divide-y divide-line">
            <Stat label="Days survived" value={String(days)} />
            <Stat label="Best booking" value={best} />
            <Stat label="Peak Clout Tier" value={`Tier ${stats.peakTier}`} />
            <Stat label="Total earned" value={money(stats.totalEarned)} />
            <Stat label="Bookings" value={String(stats.bookings)} />
            <Stat label="Network carried into next run" value={String(carried)} />
          </dl>
        </Card>

        <SectionTitle>Try again as…</SectionTitle>
        <div className="flex flex-col gap-2">
          {ARCHETYPE_IDS.map((id) => (
            <Button key={id} variant={id === player.archetype ? 'primary' : 'secondary'} className="w-full text-left" onClick={() => useGame.getState().start(id)}>
              <span className="block font-semibold">{ARCHETYPES[id].name}</span>
              <span className="block text-xs opacity-80">{ARCHETYPES[id].tagline}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
