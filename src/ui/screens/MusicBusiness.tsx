// Music career area (Sprint 8): live shows, the beat store and your catalogue. Every number comes from musicBizView.
import { useState, type ReactNode } from 'react';
import { musicBizView, type MusicBizView } from '../../sim/actions';
import { BEAT_ENERGY, BEAT_HOURS, BEAT_SPARK, SHOW_ENERGY, SHOW_HOURS, SHOW_START_WINDOW } from '../../sim/constants';
import { useGame } from '../../store/game';
import { compact, count, money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card } from '../kit';
import { Reason, ReasonWithMap, useRun } from './runKit';

const pad2 = (n: number) => String(n).padStart(2, '0');

function SubTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-music first:mt-0">
      {children}
    </h3>
  );
}

function VenueCard({ v, onNavigate }: { v: MusicBizView['shows'][number]; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const reasonId = `venue-${v.id}-reason`;
  return (
    <Card>
      <article aria-label={v.name}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-bold leading-snug">{v.name}</h4>
            <p className="text-xs text-muted">{v.blurb}</p>
            <p className="mt-1 text-xs">{v.where}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums leading-none">{money(v.ticketPrice)}</p>
            <p className="text-[11px] text-muted">a ticket</p>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">
          Capacity <span className="tabular-nums text-ink">{count(v.capacity)}</span> · Fans needed{' '}
          <span className="tabular-nums text-ink">{count(v.minFans)}</span>
        </p>
        <p className="mt-1 text-sm">
          ≈<span className="font-semibold tabular-nums">{count(v.expectedTickets)}</span> tickets · ≈
          <span className="font-semibold tabular-nums text-good">{money(v.expectedPay)}</span> tonight
        </p>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={v.disabledReason !== null}
          aria-describedby={v.disabledReason || error ? reasonId : undefined}
          aria-label={`Play ${v.name}, ${SHOW_HOURS} hours, minus ${SHOW_ENERGY} Energy`}
          onClick={() => run(v.command)}
        >
          Play {v.name} ({SHOW_HOURS}h)
        </Button>
        <ReasonWithMap id={reasonId} text={v.disabledReason} error={error} onNavigate={onNavigate} />
      </article>
    </Card>
  );
}

function LiveShows({ biz, onNavigate }: { biz: MusicBizView; onNavigate: (tab: Tab) => void }) {
  const [from, to] = SHOW_START_WINDOW;
  return (
    <section aria-labelledby="biz-shows">
      <SubTitle id="biz-shows">Live shows</SubTitle>
      <p className="mb-2 text-xs text-muted">
        One show a night, doors {pad2(from)}:00–{pad2(to)}:00 · {SHOW_HOURS}h · −{SHOW_ENERGY} Energy. You have{' '}
        <span className="font-semibold tabular-nums text-ink">{compact(biz.fans)}</span> Fans.
      </p>
      {biz.playedTonight && <p className="mb-2 text-xs text-good">✓ You played tonight. Ears ringing, merch table empty.</p>}
      <ul className="flex flex-col gap-2">
        {biz.shows.map((v) => (
          <li key={v.id}>
            <VenueCard v={v} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BeatStore({ biz }: { biz: MusicBizView }) {
  const { error, run } = useRun();
  const reasonId = 'make-beat-reason';
  const { makeBeat } = biz;
  return (
    <section aria-labelledby="biz-beats">
      <SubTitle id="biz-beats">Beat store</SubTitle>
      <Card>
        <p className="text-sm">
          Beats{' '}
          <span className="font-semibold tabular-nums">
            {biz.beats.length} / {biz.beatMax}
          </span>
        </p>
        <p className="text-xs text-muted">
          Made at home · {BEAT_HOURS}h · −{BEAT_ENERGY} Energy · −{BEAT_SPARK} Spark. Leases land at 06:00.
        </p>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={makeBeat.disabledReason !== null}
          aria-describedby={makeBeat.disabledReason || error ? reasonId : undefined}
          aria-label={`Make a beat, ${BEAT_HOURS} hours, minus ${BEAT_ENERGY} Energy, minus ${BEAT_SPARK} Spark`}
          onClick={() => run(makeBeat.command)}
        >
          Make a beat ({BEAT_HOURS}h)
        </Button>
        <Reason id={reasonId} text={makeBeat.disabledReason} error={error} />
        {biz.beats.length > 0 ? (
          <ul aria-label="Your beats" className="mt-2 flex flex-col divide-y divide-line">
            {biz.beats.map((b) => (
              <li key={b.id} className="py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold">{b.title}</p>
                  <p className="shrink-0 text-xs tabular-nums">Quality {b.quality}</p>
                </div>
                <p className="text-xs text-muted">
                  {b.leases} {b.leases === 1 ? 'lease' : 'leases'} · earned <span className="tabular-nums text-ink">{money(b.earned)}</span>
                </p>
                <p className="text-xs">
                  <span className="tabular-nums">{pct(b.leaseChance)}</span> lease chance/day · <span className="tabular-nums">{money(b.fee)}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted">No beats yet. The laptop fan is ready when you are.</p>
        )}
      </Card>
    </section>
  );
}

function Catalogue({ biz }: { biz: MusicBizView }) {
  return (
    <section aria-labelledby="biz-catalog">
      <SubTitle id="biz-catalog">Catalogue</SubTitle>
      {biz.catalog.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No records out yet. Finish a release week and it lives here, earning sync money while you sleep.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {biz.catalog.map((r) => (
            <li key={r.id}>
              <Card>
                <article aria-label={`${r.title}, ${r.scale}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 font-bold leading-snug">“{r.title}”</h4>
                    <span className="shrink-0 text-xs tabular-nums">Quality {r.quality}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {r.scale} · {r.peak === null ? "didn't chart" : `peaked #${r.peak}`} · {r.label ?? 'self-released'}
                  </p>
                  <p className="mt-1 text-xs">
                    {r.placements} {r.placements === 1 ? 'placement' : 'placements'} · <span className="tabular-nums">{pct(r.placementChance)}</span> sync
                    chance/day
                  </p>
                </article>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Shows, beats and catalogue — your music career outside any one project. */
export function MusicBusiness({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  const [open, setOpen] = useState(true);
  if (!state) return null;
  const biz = musicBizView(state);
  return (
    <section aria-labelledby="music-biz-title" className="mt-6 border-t border-line pt-4">
      <h2 id="music-biz-title">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl text-left"
          aria-expanded={open}
          aria-controls="music-biz-body"
          onClick={() => setOpen((o) => !o)}
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-music">Music business</span>
            <span className="block text-xs text-muted">
              Shows, beats and your catalogue · {biz.catalog.length} {biz.catalog.length === 1 ? 'record' : 'records'} · {biz.beats.length} beats
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-muted">
            {open ? '▲' : '▼'}
          </span>
        </button>
      </h2>
      {open && (
        <div id="music-biz-body" className="mt-2">
          <LiveShows biz={biz} onNavigate={onNavigate} />
          <BeatStore biz={biz} />
          <Catalogue biz={biz} />
        </div>
      )}
    </section>
  );
}
