import { useState } from 'react';
import { opportunityView, tvView, type OpportunityView } from '../../sim/actions';
import { visibleTier } from '../../sim/board';
import { BOARD_REFRESH_HOUR, CALLBACK_BEATS, PILOT_FEE_MULTIPLIER, PREP_MAX_HOURS } from '../../sim/constants';
import type { Medium, Opportunity } from '../../sim/types';
import { useGame } from '../../store/game';
import { money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card, MediumTag } from '../kit';
import { PendingPilots, PilotSeasonBanner, YourShowCard } from './tvKit';

type Filter = 'all' | Medium;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'film', label: 'Film' },
  { id: 'tv', label: 'TV' },
  { id: 'music', label: 'Music' },
];

const STATUS_LABEL: Record<Exclude<Opportunity['status'], 'open'>, { text: string; cls: string }> = {
  booked: { text: 'Booked', cls: 'border-good/50 bg-good/15 text-good' },
  rejected: { text: 'Passed', cls: 'border-line bg-surface-2 text-muted' },
  exposed: { text: 'Exposed', cls: 'border-bad/50 bg-bad/15 text-bad' },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n: number) => String(n).padStart(2, '0');
/** Disabled reasons that are solved by travelling somewhere get a Map shortcut. */
const needsTravel = (reason: string) => /\bgo to\b/i.test(reason);

function OpportunityCard({ view, onNavigate }: { view: OpportunityView; onNavigate: (tab: Tab) => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const [error, setError] = useState<string | null>(null);
  const { opp } = view;
  const open = opp.status === 'open';
  const status = opp.status === 'open' ? null : STATUS_LABEL[opp.status];
  const canPrepMore = view.oddsWithMaxPrep > view.odds + 0.0005;
  const submitReason = view.submit.disabledReason;
  const reasonId = `${opp.id}-submit-reason`;
  const run = (cmd: OpportunityView['submit']['command']) => setError(dispatch(cmd));

  return (
    <Card className={open ? '' : 'opacity-80'}>
      <article aria-label={opp.title}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <MediumTag medium={opp.medium} />
          {view.pilot && (
            <span className="rounded-md bg-tv px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-bg">Pilot</span>
          )}
          <span className="font-semibold">Tier {opp.tier}</span>
          <span className="text-muted">{cap(opp.skill)}</span>
          {status && (
            <span className={`ml-auto rounded-md border px-1.5 py-0.5 font-semibold uppercase tracking-wide ${status.cls}`}>{status.text}</span>
          )}
        </div>

        {view.pilot ? (
          <>
            <h2 className="mt-1.5 font-bold leading-snug">“{view.pilot.showTitle}”</h2>
            <p className="text-sm">
              {view.pilot.label} · <span className="font-semibold">{view.pilot.network}</span> · {view.pilot.role}
            </p>
          </>
        ) : (
          <h2 className="mt-1.5 font-bold leading-snug">{opp.title}</h2>
        )}
        <p className="text-xs text-muted">
          {view.where} · {view.window}
        </p>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p>
              <span className="font-semibold">{money(view.pay)}</span>
              {view.pilot && <span className="text-tv"> ({PILOT_FEE_MULTIPLIER}× TV pay)</span>} · +{view.rp} RP
              {view.network > 0 && <> · +{view.network} Network</>}
            </p>
            <p className="text-xs text-muted">
              {view.fee > 0 ? `${money(view.fee)} fee` : `Free ${view.submissionName}`} · Prep {opp.prepHours}/{PREP_MAX_HOURS}h
            </p>
          </div>
          {open && (
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums leading-none" aria-label={`Booking odds ${pct(view.odds)}`}>
                {pct(view.odds)}
              </p>
              <p className="text-[11px] text-muted">odds</p>
            </div>
          )}
        </div>
        {open && canPrepMore && <p className="mt-1 text-xs text-muted">→ {pct(view.oddsWithMaxPrep)} with max prep</p>}
        {open && view.pilot && (
          <p className="mt-2 rounded-lg border border-tv/50 bg-tv/10 px-2 py-1 text-xs">
            🎬 Callback: {CALLBACK_BEATS} director notes. Pick the right reads to raise your odds. No exposure risk.
          </p>
        )}
        {open && view.exposureRisk && (
          <p className="mt-2 rounded-lg border border-warn/50 bg-warn/10 px-2 py-1 text-xs text-warn">
            ⚠ Exposure risk: your skill is below the bar — failure costs RP
          </p>
        )}

        {open && (
          <div className="mt-3 flex flex-col gap-2">
            {view.prep.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Prep">
                {view.prep.map((p) => (
                  <div key={p.hours} className="flex flex-col">
                    <Button
                      disabled={p.disabledReason !== null}
                      title={p.disabledReason ?? undefined}
                      aria-label={`Prep ${p.hours} hour${p.hours === 1 ? '' : 's'}${p.disabledReason ? ` — unavailable: ${p.disabledReason}` : ''}`}
                      onClick={() => run(p.command)}
                    >
                      Prep {p.hours}h
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {view.prep.length > 0 && view.prep.every((p) => p.disabledReason) && view.prep[0]!.disabledReason !== submitReason && (
              <p className="text-xs text-warn">Prep: {view.prep[0]!.disabledReason}</p>
            )}
            <Button
              variant="primary"
              className="w-full"
              disabled={submitReason !== null}
              aria-describedby={submitReason ? reasonId : undefined}
              onClick={() => run(view.submit.command)}
            >
              Send {view.submissionName} · {pct(view.odds)}
            </Button>
            {submitReason && (
              <div className="flex items-center justify-between gap-2">
                <p id={reasonId} className="text-xs text-warn">
                  {submitReason}
                </p>
                {needsTravel(submitReason) && (
                  <Button variant="ghost" className="shrink-0" onClick={() => onNavigate('map')}>
                    Map
                  </Button>
                )}
              </div>
            )}
            {error && (
              <p className="text-xs text-bad" role="status">
                {error}
              </p>
            )}
          </div>
        )}
      </article>
    </Card>
  );
}

export function BoardScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  const [filter, setFilter] = useState<Filter>('all');
  if (!state) return null;

  const items = state.board.filter((o) => filter === 'all' || o.medium === filter);
  const tv = tvView(state);

  return (
    <div>
      <header className="mb-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Opportunity Board</h1>
        <p className="text-sm text-muted">
          Visible up to Tier {visibleTier(state.player)} · refreshes {pad(BOARD_REFRESH_HOUR)}:00
        </p>
      </header>

      <PilotSeasonBanner season={tv.season} />
      {tv.contract && <YourShowCard contract={tv.contract} onNavigate={onNavigate} idPrefix="gigs" />}
      <PendingPilots pilots={tv.pilots} />

      <div role="group" aria-label="Filter by medium" className="mb-3 grid grid-cols-4 gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-11 rounded-xl border text-sm ${
              filter === f.id ? 'border-accent bg-accent/15 font-semibold text-accent' : 'border-line bg-surface-2 text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="text-center">
          <p className="font-semibold">Nothing here. Not even a student film.</p>
          <p className="mt-1 text-sm text-muted">
            {state.board.length === 0 ? 'The board refreshes every morning. Grind on.' : 'Try another medium — or lower your standards.'}
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((o) => (
            <li key={o.id}>
              <OpportunityCard view={opportunityView(state, o)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
