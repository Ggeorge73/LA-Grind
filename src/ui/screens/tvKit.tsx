// TV, the actor's side (Sprint 9): pilot-season banner, pending pilots, the series-regular card and the callback sheet.
import { useEffect, useRef } from 'react';
import { tvView, type TvView } from '../../sim/actions';
import { CALLBACK_BEATS, EPISODE_ENERGY, EPISODE_HOURS, MISSED_EPISODE_PAY, PILOT_DECISION_DAYS } from '../../sim/constants';
import { useGame } from '../../store/game';
import { clock, day, money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, SectionTitle, Sheet } from '../kit';
import { ReasonWithMap, useRun, wholePct } from './runKit';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Gigs tab header: is pilot season on, and how the pilot → callback → pickup chain works. */
export function PilotSeasonBanner({ season }: { season: TvView['season'] }) {
  if (!season.active) {
    return (
      <p className="mb-3 text-xs text-muted">
        <span className="font-semibold text-tv">TV</span> · Next pilot season{' '}
        {season.startsInDays === 1 ? 'starts tomorrow' : `in ${plural(season.startsInDays, 'day')}`}.
      </p>
    );
  }
  return (
    <section aria-labelledby="pilot-season-title" className="mb-3 rounded-2xl border border-tv/50 bg-tv/10 p-3">
      <h2 id="pilot-season-title" className="font-bold text-tv">
        Pilot season · {season.daysLeft === 1 ? 'last day' : `${plural(season.daysLeft, 'day')} left`}
      </h2>
      <p className="mt-0.5 text-xs">
        Send a tape to a pilot → nail the callback ({CALLBACK_BEATS} director notes) → if you book it, the network decides on a pickup{' '}
        {PILOT_DECISION_DAYS} days later.
      </p>
    </section>
  );
}

/** Booked pilots waiting on the network. */
export function PendingPilots({ pilots }: { pilots: TvView['pilots'] }) {
  if (pilots.length === 0) return null;
  return (
    <section aria-label="Pilots awaiting pickup" className="mb-3">
      <SectionTitle>Pilots awaiting pickup</SectionTitle>
      <ul className="flex flex-col gap-1.5">
        {pilots.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            <span className="font-semibold">“{p.showTitle}”</span> — {p.network} decides Day {day(p.decisionMinute)} at {clock(p.decisionMinute)}
            <span className="text-muted"> · pickup ≈{wholePct(p.pickupOdds)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The series-regular contract: a weekly duty, so it sits at the top of Hustle (and on Gigs). */
export function YourShowCard({ contract, onNavigate, idPrefix }: { contract: NonNullable<TvView['contract']>; onNavigate: (tab: Tab) => void; idPrefix: string }) {
  const { error, run } = useRun();
  const c = contract;
  const reasonId = `${idPrefix}-shoot-reason`;
  const reason = c.disabledReason;
  return (
    <section aria-labelledby={`${idPrefix}-show-title`} className="mb-3 rounded-2xl border-2 border-tv/60 bg-tv/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-tv">Your show</p>
      <h2 id={`${idPrefix}-show-title`} className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug">
        “{c.showTitle}”
      </h2>
      <p className="text-xs text-muted">
        {c.network} · {c.role}
      </p>
      <p className="mt-1.5 text-sm">
        Episode <span className="font-semibold tabular-nums">{c.episode}</span> of {c.episodesTotal} · {money(c.weeklyPay)}/week
        {c.episodesMissed > 0 && <span className="text-bad"> · {c.episodesMissed} missed</span>}
      </p>
      <p className="mt-0.5 text-sm">
        This week's episode:{' '}
        {c.shotThisWeek ? (
          <span className="font-semibold text-good">shot ✓</span>
        ) : (
          <>
            <span className="font-semibold text-warn">not yet</span>
            <span className="text-muted">
              {' '}
              — due by Day {day(c.weekEndMinute)} {clock(c.weekEndMinute)}
            </span>
          </>
        )}
      </p>
      {!c.shotThisWeek && (
        <p className="mt-0.5 text-xs text-muted">
          On set at the studio lot in {c.where} · −{EPISODE_ENERGY} Energy. Miss it and the week pays {Math.round(MISSED_EPISODE_PAY * 100)}% and costs RP.
        </p>
      )}
      {c.shotThisWeek ? (
        <p className="mt-0.5 text-xs text-muted">
          Next episode shoots from Day {day(c.weekEndMinute)} {clock(c.weekEndMinute)}.
        </p>
      ) : (
        <>
          <Button
            variant="primary"
            className="mt-2 w-full"
            disabled={reason !== null}
            aria-describedby={reason || error ? reasonId : undefined}
            onClick={() => run(c.command)}
          >
            Shoot episode ({EPISODE_HOURS}h)
          </Button>
          <ReasonWithMap id={reasonId} text={reason} error={error} onNavigate={onNavigate} />
        </>
      )}
    </section>
  );
}

/** The callback mini-game. It blocks every other action in the sim, so it can't be dismissed; it closes when the last read is in. */
export function CallbackSheet() {
  const state = useGame((g) => g.state);
  const { error, run } = useRun();
  const cb = state ? tvView(state).callback : null;
  const open = cb !== null;
  const wasOpen = useRef(false);
  // The Send button that opened the callback is gone once the gig resolves; don't leave focus on <body>.
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      wasOpen.current = false;
      if (document.activeElement === document.body) document.querySelector<HTMLElement>('nav [aria-current="page"]')?.focus();
    }
  }, [open]);
  if (!cb) return null;
  const beat = cb.beats[cb.beatIndex];
  const done = cb.beats.slice(0, cb.beatIndex);
  return (
    <Sheet title={`Callback: ${cb.showTitle}`} onClose={() => {}}>
      <p className="-mt-2 mb-2 text-sm text-muted">
        {cb.network} · {cb.role}
      </p>

      {done.length > 0 && (
        <ol aria-label="Your reads so far" className="mb-2 flex flex-col gap-1">
          {done.map((b, i) => (
            <li key={i} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
              Note {i + 1}: you went with <span className="text-ink">“{b.picked === null ? '—' : b.reads[b.picked]}”</span>
            </li>
          ))}
        </ol>
      )}

      {beat && (
        <div aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-tv">
              Note {cb.beatIndex + 1} of {cb.beats.length}
            </p>
            <span className="flex gap-1" aria-hidden>
              {cb.beats.map((_, i) => (
                <span key={i} className={`h-1.5 w-5 rounded-full ${i <= cb.beatIndex ? 'bg-tv' : 'bg-line'}`} />
              ))}
            </span>
          </div>
          <blockquote className="mt-1 border-l-4 border-tv/60 pl-3 text-base italic leading-snug">
            <span className="sr-only">The director says: </span>“{beat.note}”
          </blockquote>
        </div>
      )}

      {beat && (
        <div role="group" aria-label="Pick your read" className="mt-3 flex flex-col gap-2">
          {beat.reads.map((text, i) => {
            const instinct = beat.sensed === i;
            return (
              <Button
                key={i}
                className={`w-full py-2 text-left leading-snug ${instinct ? 'border-accent! ring-1 ring-accent' : ''}`}
                aria-label={`Read ${i + 1}: ${text}${instinct ? ' — your instinct' : ''}`}
                onClick={() => run(cb.pick(i))}
              >
                <span>Read: {text}</span>
                {instinct && <span className="mt-0.5 block text-[11px] font-semibold text-accent">★ Your instinct</span>}
              </Button>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-sm">
        Odds now:{' '}
        <span className="font-semibold tabular-nums">
          {pct(cb.oddsIfWrong)}–{pct(cb.oddsIfRight)}
        </span>
      </p>
      <p className="text-xs text-muted">The room won't tell you how a read landed until the end. Unfinished callbacks wrap at 06:00.</p>
      {error && (
        <p className="mt-1 text-xs text-bad" role="status">
          {error}
        </p>
      )}
    </Sheet>
  );
}
