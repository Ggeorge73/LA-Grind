import { useEffect, useRef, useState } from 'react';
import { projectScaleOptions, projectView, type ProjectView, type ScaleOption } from '../../sim/actions';
import {
  AGENT_PITCH_ENERGY,
  AGENT_PITCH_HOURS,
  BILLS_HOUR,
  DECK_ENERGY,
  DECK_HOURS,
  DECK_SPARK,
  EDIT_ENERGY,
  EDIT_HOURS,
  HIRE_HOURS,
  LABEL_PITCH_ENERGY,
  LABEL_PITCH_HOURS,
  MINUTES_PER_DAY,
  PITCH_HOURS,
  PRODUCTION_VALUE_MAX,
  PROMO_BOOST,
  PROMO_ENERGY,
  PROMO_HOURS,
  PROMO_SPARK,
  RECORD_ENERGY,
  RECORD_HOURS,
  SHOOT_CALL_WINDOW,
  SHOOT_ENERGY,
  SHOOT_HOURS,
  WRITE_SESSION_HOURS,
} from '../../sim/constants';
import { LOCATIONS } from '../../sim/content/locations';
import type { ProjectCredit } from '../../sim/types';
import { useGame } from '../../store/game';
import { clock, compact, count, day, money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card, Meter, SectionTitle, Sheet } from '../kit';
import { MusicBusiness } from './MusicBusiness';
import { Reason, ReasonWithMap, needsTravel, useRun, wholePct } from './runKit';

/** Preset self-fund amounts (UI shortcuts, not balance rules — the sim validates each). */
const SELF_FUND_PRESETS = [100, 500, 1000] as const;
// ---------- No active project ----------

function ScaleCard({ option }: { option: ScaleOption }) {
  const { error, run } = useRun();
  const reasonId = `scale-${option.id}-reason`;
  return (
    <Card>
      <article aria-label={option.name}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-bold leading-snug">{option.name}</h2>
          <span className="shrink-0 font-semibold tabular-nums">{option.budget > 0 ? money(option.budget) : 'No budget'}</span>
        </div>
        <p className="text-xs text-muted">Needs Clout Tier {option.minTier}</p>
        <p className="mt-1 text-sm">{option.summary}</p>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={option.disabledReason !== null}
          aria-describedby={option.disabledReason || error ? reasonId : undefined}
          onClick={() => run(option.command)}
        >
          Start {option.name}
        </Button>
        <Reason id={reasonId} text={option.disabledReason} error={error} />
      </article>
    </Card>
  );
}

const MEDIUM_GROUPS = [
  { medium: 'film', title: 'Film', tagline: 'Script, money, crew, shoot, festivals', cls: 'text-film' },
  { medium: 'music', title: 'Music', tagline: 'Write, book a studio, record, drop it', cls: 'text-music' },
  { medium: 'tv', title: 'TV', tagline: 'Spec, deck, agent, staffing season', cls: 'text-tv' },
] as const;

/**
 * Credits are written by the sim as "Released by …" or "Self-released online" when a film comes out,
 * and "Peaked at #N on …" when a record's release week charts.
 */
const isRelease = (outcome: string) => /^(released by|self-released|peaked at)/i.test(outcome);

function ReleaseBanner({ credit, onDismiss }: { credit: ProjectCredit; onDismiss: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const music = credit.medium === 'music';
  // The release button sits far down the festival list; bring the good news into view (instant, so reduced motion is respected).
  useEffect(() => ref.current?.scrollIntoView({ block: 'start' }), []);
  return (
    <section
      ref={ref}
      aria-labelledby="release-banner-title"
      className="screen-in mb-3 scroll-mt-3 rounded-2xl border-2 border-good bg-good/15 p-3"
      role="status"
    >
      <p className="text-2xl leading-none" aria-hidden>
        {music ? '🎧🍾' : '🎬🍾'}
      </p>
      <h2 id="release-banner-title" className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold">
        {music ? `“${credit.title}” charted!` : `“${credit.title}” is out!`}
      </h2>
      <p className="text-sm">{credit.outcome}</p>
      <p className="text-xs text-muted">
        {credit.scale} · Quality {credit.quality}/100 · Day {day(credit.minute)} {clock(credit.minute)}
      </p>
      <p className="mt-1 text-xs">
        {music ? 'Release week is over and the chart remembers. Start the next one.' : 'Your IMDb page has an actual credit on it now. Start the next one.'}
      </p>
      <Button variant="ghost" className="mt-1 w-full" onClick={onDismiss}>
        Dismiss
      </Button>
    </section>
  );
}

function NoProject() {
  const state = useGame((g) => g.state)!;
  const options = projectScaleOptions(state);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const latest = state.credits[0];
  const latestKey = latest ? `${latest.title}-${latest.minute}` : null;
  const celebrate =
    latest !== undefined && isRelease(latest.outcome) && state.minute - latest.minute < MINUTES_PER_DAY && dismissed !== latestKey;
  return (
    <div>
      {celebrate && <ReleaseBanner credit={latest} onDismiss={() => setDismissed(latestKey)} />}
      <header className="mb-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Projects</h1>
        <p className="text-sm text-muted">Stop auditioning for other people's work. Make your own — one project at a time.</p>
      </header>

      {MEDIUM_GROUPS.map((g) => {
        const group = options.filter((o) => o.medium === g.medium);
        if (group.length === 0) return null;
        return (
          <section key={g.medium} aria-labelledby={`scales-${g.medium}`}>
            <h2 id={`scales-${g.medium}`} className="mb-2 mt-4 flex items-baseline gap-2 first:mt-0">
              <span className={`text-xs font-semibold uppercase tracking-widest ${g.cls}`}>{g.title}</span>
              <span className="text-xs text-muted">{g.tagline}</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {group.map((o) => (
                <li key={o.id}>
                  <ScaleCard option={o} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-label="Your credits">
        <SectionTitle>Your credits</SectionTitle>
        {state.credits.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No credits yet. Your IMDb page is just a headshot and a dream.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.credits.map((c, i) => (
              <li key={`${c.title}-${c.minute}-${i}`}>
                <Card>
                  <h3 className="font-semibold leading-snug">“{c.title}”</h3>
                  <p className={`text-sm ${isRelease(c.outcome) ? 'font-semibold text-good' : 'text-muted'}`}>{c.outcome}</p>
                  <p className="text-xs text-muted">
                    {c.medium === 'music' ? 'Music' : c.medium === 'tv' ? 'TV' : 'Film'} · {c.scale} · Quality {c.quality}/100 · Day {day(c.minute)}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Active project ----------

function Stepper({ stages }: { stages: ProjectView['stages'] }) {
  const STATUS_TEXT = { done: 'Done', current: 'Now', upcoming: 'Later' } as const;
  return (
    <ol aria-label="Production stages" className="mb-3 flex flex-wrap gap-1.5">
      {stages.map((st, i) => (
        <li
          key={st.id}
          aria-current={st.status === 'current' ? 'step' : undefined}
          className={`rounded-lg border px-2 py-1 text-xs ${
            st.status === 'current'
              ? 'border-accent bg-accent/15 font-semibold text-accent'
              : st.status === 'done'
                ? 'border-good/50 text-good'
                : 'border-line text-muted'
          }`}
        >
          <span aria-hidden>{st.status === 'done' ? '✓ ' : st.status === 'current' ? '▶ ' : `${i + 1}. `}</span>
          {st.label}
          <span className="sr-only">
            {' '}
            — {STATUS_TEXT[st.status]}
          </span>
          {st.status === 'current' && <span aria-hidden> · now</span>}
        </li>
      ))}
    </ol>
  );
}

function WriteCard({ view }: { view: ProjectView }) {
  const { error, run } = useRun();
  const { script, write } = view;
  const reasonId = 'write-reason';
  const music = view.project.medium === 'music';
  const tv = view.project.medium === 'tv';
  return (
    <Card>
      <h2 className="font-bold">{music ? 'Write the songs' : tv ? 'Write the spec pilot' : 'Write the script'}</h2>
      <p className="text-sm">
        {music ? 'Song' : 'Sessions'} <span className="font-semibold tabular-nums">{script.done}/{script.needed}</span> · {music ? 'Song' : 'Script'} quality{' '}
        <span className="font-semibold tabular-nums">{Math.round(script.quality)}</span>/100
      </p>
      {script.scores.length > 0 ? (
        <ul aria-label={music ? 'Song scores' : 'Session scores'} className="mt-1 flex flex-wrap gap-1.5">
          {script.scores.map((s, i) => (
            <li key={i} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs tabular-nums">
              {music ? 'Song' : 'Draft'} {i + 1}: {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {music
            ? 'A voice memo of you humming. It has potential. Probably.'
            : tv
              ? 'FADE IN. That is as far as anyone has got.'
              : 'The blank page stares back. It has notes.'}
        </p>
      )}
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={write.disabledReason !== null}
        aria-describedby={write.disabledReason || error ? reasonId : undefined}
        onClick={() => run(write.command)}
      >
        {music ? `Write a song (${WRITE_SESSION_HOURS}h)` : tv ? `Write a draft (${WRITE_SESSION_HOURS}h)` : `Write (${WRITE_SESSION_HOURS}h)`}
      </Button>
      <Reason id={reasonId} text={write.disabledReason} error={error} />
    </Card>
  );
}

function BudgetSummary({ view }: { view: ProjectView }) {
  const b = view.budget;
  return (
    <Card>
      <Meter label="Budget raised, %" value={b.budget > 0 ? (100 * b.raised) / b.budget : 0} tone="good" hint={`${money(b.raised)} of ${money(b.budget)} raised`} />
      <p className="mt-1 text-sm">
        <span className="font-semibold tabular-nums">{money(b.raised)}</span> of {money(b.budget)} raised
      </p>
      <p className="text-xs text-muted">
        Self-funded {money(b.selfFunded)} · spent {money(b.spent)} · left {money(b.remaining)}
      </p>
    </Card>
  );
}

function InvestorCard({ inv, onNavigate }: { inv: ProjectView['investors'][number]; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const reasonId = `inv-${inv.id}-reason`;
  return (
    <Card>
      <article aria-label={inv.name}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{inv.name}</h3>
            <p className="text-xs text-muted">{inv.blurb}</p>
            <p className="mt-1 text-xs">Takes meetings in {inv.where}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold tabular-nums leading-none" aria-label={`Pitch odds ${pct(inv.odds)}`}>
              {pct(inv.odds)}
            </p>
            <p className="text-[11px] text-muted">odds</p>
          </div>
        </div>
        {inv.pitchedToday && <p className="mt-1 text-xs text-muted">Pitched today — the room needs time to forget you.</p>}
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={inv.disabledReason !== null}
          aria-describedby={inv.disabledReason || error ? reasonId : undefined}
          aria-label={`Pitch ${inv.name}, ${PITCH_HOURS} hours`}
          onClick={() => run(inv.command)}
        >
          Pitch ({PITCH_HOURS}h)
        </Button>
        {(inv.disabledReason || error) && (
          <div className="flex items-center justify-between gap-2">
            <Reason id={reasonId} text={inv.disabledReason} error={error} />
            {inv.disabledReason && needsTravel(inv.disabledReason) && (
              <Button variant="ghost" className="shrink-0" onClick={() => onNavigate('map')}>
                Map
              </Button>
            )}
          </div>
        )}
      </article>
    </Card>
  );
}

function SelfFund({ view }: { view: ProjectView }) {
  const dispatch = useGame((g) => g.dispatch);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  const room = view.budget.room;
  const chips: { key: string; label: string; amount: number }[] = SELF_FUND_PRESETS.map((a) => ({ key: String(a), label: money(a), amount: a }));
  if (room > 0) chips.push({ key: 'all', label: `All remaining (${money(room)})`, amount: room });
  const reasons = chips.map((c) => ({ ...c, reason: view.selfFundReason(c.amount) }));
  const firstReason = reasons.find((c) => c.reason)?.reason ?? null;
  const allSame = reasons.every((c) => c.reason === firstReason);

  return (
    <section aria-label="Self-fund">
      <SectionTitle>Self-fund</SectionTitle>
      <Card>
        <div role="group" aria-label="Self-fund amount" className="flex flex-wrap gap-2">
          {reasons.map((c) => (
            <Button
              key={c.key}
              disabled={c.reason !== null}
              title={c.reason ?? undefined}
              aria-label={`Self-fund ${c.label}${c.reason ? ` — unavailable: ${c.reason}` : ''}`}
              onClick={() => {
                const r = dispatch({ type: 'SELF_FUND', amount: c.amount });
                setError(r ? { key: c.key, text: r } : null);
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>
        {firstReason && (
          <ul className="mt-1 text-xs text-warn">
            {allSame ? (
              <li>{firstReason}</li>
            ) : (
              reasons
                .filter((c) => c.reason)
                .map((c) => (
                  <li key={c.key}>
                    {c.label}: {c.reason}
                  </li>
                ))
            )}
          </ul>
        )}
        {error && (
          <p className="mt-1 text-xs text-bad" role="status">
            {error.text}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">Your cash, gone. Probably.</p>
      </Card>
    </section>
  );
}

function CrewCard({ c }: { c: ProjectView['crew']['candidates'][number] }) {
  const { error, run } = useRun();
  const reasonId = `crew-${c.id}-reason`;
  return (
    <Card>
      <article aria-label={`${c.name}, ${c.role}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{c.name}</h3>
            <p className="text-xs text-muted">{c.role}</p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums">{money(c.fee)}</span>
        </div>
        <p className="mt-1 text-sm">
          Skill {c.skill}/5{' '}
          <span aria-hidden className="text-accent">
            {'★'.repeat(c.skill)}
            <span className="text-line">{'★'.repeat(Math.max(0, 5 - c.skill))}</span>
          </span>
        </p>
        <p className="text-xs italic text-muted">“{c.quirk}”</p>
        {c.hired ? (
          <p className="mt-2 rounded-lg border border-good/50 bg-good/15 px-2 py-2 text-center text-sm font-semibold text-good">✓ Hired</p>
        ) : (
          <>
            <Button
              variant="primary"
              className="mt-2 w-full"
              disabled={c.disabledReason !== null}
              aria-describedby={c.disabledReason || error ? reasonId : undefined}
              aria-label={`Hire ${c.name} for ${money(c.fee)}, ${HIRE_HOURS} hour meeting`}
              onClick={() => run(c.command)}
            >
              Hire ({HIRE_HOURS}h)
            </Button>
            <Reason id={reasonId} text={c.disabledReason} error={error} />
          </>
        )}
      </article>
    </Card>
  );
}

function CrewStage({ view }: { view: ProjectView }) {
  const { crew, budget } = view;
  const music = view.project.medium === 'music';
  return (
    <>
      <Card>
        <h2 className="font-bold">
          {music ? 'Studio crew' : 'Crew'} {crew.hired}/{crew.slots}
        </h2>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <Meter label="Crew quality" value={crew.quality} />
          <Meter label="Production value" value={crew.productionValue} max={PRODUCTION_VALUE_MAX} hint={`${Math.round(crew.productionValue)} of ${PRODUCTION_VALUE_MAX}`} />
        </div>
        <p className="mt-2 text-sm">
          Budget remaining <span className="font-semibold tabular-nums">{money(budget.remaining)}</span>
        </p>
        <p className="text-xs text-muted">{music ? 'Unspent money ends up in the mix. Allegedly.' : 'Unspent money ends up on screen. Allegedly.'}</p>
      </Card>
      <SectionTitle>Candidates</SectionTitle>
      <ul className="flex flex-col gap-2">
        {crew.candidates.map((c) => (
          <li key={c.id}>
            <CrewCard c={c} />
          </li>
        ))}
      </ul>
      <SelfFund view={view} />
    </>
  );
}

function ScoreChips({ label, prefix, scores }: { label: string; prefix: string; scores: number[] }) {
  return (
    <ul aria-label={label} className="mt-1 flex flex-wrap gap-1.5">
      {scores.map((s, i) => (
        <li key={i} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs tabular-nums">
          {prefix} {i + 1}: {s}
        </li>
      ))}
    </ul>
  );
}

function ShootCard({ view, onNavigate }: { view: ProjectView; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const { shoot } = view;
  const reasonId = 'shoot-reason';
  const [callFrom, callTo] = SHOOT_CALL_WINDOW;
  return (
    <Card>
      <h2 className="font-bold">Shoot the film</h2>
      <p className="text-sm">
        Day <span className="font-semibold tabular-nums">{shoot.done} / {shoot.needed}</span>
        {shoot.scores.length > 0 && (
          <>
            {' '}
            · Average <span className="font-semibold tabular-nums">{Math.round(shoot.average)}</span>/100
          </>
        )}
      </p>
      {shoot.scores.length > 0 ? (
        <ScoreChips label="Shoot day scores" prefix="Day" scores={shoot.scores} />
      ) : (
        <p className="mt-1 text-xs text-muted">Nothing in the can yet. The AD is already behind schedule.</p>
      )}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted">Set</dt>
        <dd>{shoot.where}</dd>
        <dt className="text-muted">Call time</dt>
        <dd>
          Start between {String(callFrom).padStart(2, '0')}:00 and {String(callTo).padStart(2, '0')}:00
        </dd>
        <dt className="text-muted">Cost</dt>
        <dd>
          {SHOOT_HOURS}h · −{SHOOT_ENERGY} Energy
        </dd>
      </dl>
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={shoot.disabledReason !== null}
        aria-describedby={shoot.disabledReason || error ? reasonId : undefined}
        aria-label={`Shoot a day, ${SHOOT_HOURS} hours, minus ${SHOOT_ENERGY} Energy`}
        onClick={() => run(shoot.command)}
      >
        Shoot a day ({SHOOT_HOURS}h)
      </Button>
      <ReasonWithMap id={reasonId} text={shoot.disabledReason} error={error} onNavigate={onNavigate} />
    </Card>
  );
}

function PostCard({ view }: { view: ProjectView }) {
  const { error, run } = useRun();
  const { post } = view;
  const reasonId = 'post-reason';
  return (
    <Card>
      <h2 className="font-bold">Post-production</h2>
      <p className="text-sm">
        Edit session <span className="font-semibold tabular-nums">{post.done} / {post.needed}</span>
        {post.scores.length > 0 && (
          <>
            {' '}
            · Average <span className="font-semibold tabular-nums">{Math.round(post.average)}</span>/100
          </>
        )}
      </p>
      {post.scores.length > 0 ? (
        <ScoreChips label="Edit session scores" prefix="Cut" scores={post.scores} />
      ) : (
        <p className="mt-1 text-xs text-muted">Forty hours of footage. Twelve of them are the slate.</p>
      )}
      <p className={`mt-2 text-xs ${post.hasEditor ? 'text-good' : 'text-muted'}`}>
        {post.hasEditor ? '✓ Your Editor adds a bonus to every session.' : 'No Editor hired — you cut it yourself, no bonus.'}
      </p>
      <p className="text-xs">
        <span className="text-muted">Cost</span> {EDIT_HOURS}h · −{EDIT_ENERGY} Energy · anywhere
      </p>
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={post.disabledReason !== null}
        aria-describedby={post.disabledReason || error ? reasonId : undefined}
        aria-label={`Edit, ${EDIT_HOURS} hours, minus ${EDIT_ENERGY} Energy`}
        onClick={() => run(post.command)}
      >
        Edit ({EDIT_HOURS}h)
      </Button>
      <Reason id={reasonId} text={post.disabledReason} error={error} />
      <SoundtrackPicker view={view} />
    </Card>
  );
}

function SoundtrackOption({ o }: { o: ProjectView['soundtrack']['options'][number] }) {
  const { error, run } = useRun();
  const reasonId = `soundtrack-${o.id}-reason`;
  return (
    <li>
      <p className="text-sm">
        <span className="font-semibold">“{o.title}”</span> <span className="text-xs text-muted">Quality {o.quality}</span>
      </p>
      <Button
        className="mt-1 w-full break-words"
        disabled={o.disabledReason !== null}
        aria-describedby={o.disabledReason || error ? reasonId : undefined}
        aria-label={`Use ${o.title} on the soundtrack, plus ${o.bonus} quality`}
        onClick={() => run(o.command)}
      >
        Use {o.title} (+{o.bonus})
      </Button>
      <Reason id={reasonId} text={o.disabledReason} error={error} />
    </li>
  );
}

/** Film post: put one of your released records on the soundtrack (once per film). */
function SoundtrackPicker({ view }: { view: ProjectView }) {
  const { current, options } = view.soundtrack;
  if (current) {
    return (
      <p className="mt-3 rounded-lg border border-music/50 bg-music/10 px-2 py-2 text-sm">
        <span aria-hidden>🎵 </span>On the soundtrack: <span className="font-semibold">“{current.title}”</span>{' '}
        <span className="tabular-nums text-good">(+{current.bonus} quality)</span>
      </p>
    );
  }
  if (options.length === 0) return <p className="mt-3 text-xs text-muted">Release music of your own and you can put it on your film's soundtrack.</p>;
  return (
    <section aria-labelledby="soundtrack-title" className="mt-3 border-t border-line pt-2">
      <h3 id="soundtrack-title" className="text-sm font-semibold">
        Put a record on the soundtrack
      </h3>
      <p className="text-xs text-muted">One per film. Adds to the film's quality.</p>
      <ul className="mt-1 flex flex-col gap-2">
        {options.map((o) => (
          <SoundtrackOption key={o.id} o={o} />
        ))}
      </ul>
    </section>
  );
}

type FestivalRow = ProjectView['festivals'][number];

function FestivalStatus({ sub }: { sub: NonNullable<FestivalRow['submission']> }) {
  if (sub.status === 'pending') {
    return (
      <p className="mt-2 rounded-lg border border-line bg-surface-2 px-2 py-2 text-center text-sm" role="status">
        ⏳ Submitted · result Day {day(sub.resultMinute)} at {clock(sub.resultMinute)}
      </p>
    );
  }
  if (sub.status === 'accepted') {
    return (
      <div className="mt-2 rounded-lg border border-good/50 bg-good/15 px-2 py-2 text-center text-sm font-semibold text-good">
        <p>✓ Official Selection</p>
        {sub.award && (
          <p className="mt-1 inline-block rounded-md border border-accent/60 bg-accent/15 px-2 py-0.5 text-xs text-accent">
            <span aria-hidden>🏆 </span>
            {sub.award}
          </p>
        )}
      </div>
    );
  }
  return <p className="mt-2 rounded-lg border border-bad/40 bg-bad/10 px-2 py-2 text-center text-sm text-bad">✗ Not selected</p>;
}

function FestivalCard({ f }: { f: FestivalRow }) {
  const { error, run } = useRun();
  const reasonId = `fest-${f.id}-reason`;
  const greyed = !f.eligible;
  return (
    <Card className={greyed ? 'opacity-60' : ''}>
      <article aria-label={`${f.name}, tier ${f.tier}${greyed ? ', not eligible' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tier {f.tier}</p>
            <h3 className="font-bold leading-snug">{f.name}</h3>
            <p className="text-xs text-muted">{f.blurb}</p>
            <p className="mt-1 text-xs">
              Fee {money(f.fee)} · results in {f.waitDays} days
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold tabular-nums leading-none" aria-label={`Acceptance odds ${pct(f.odds)}`}>
              {pct(f.odds)}
            </p>
            <p className="text-[11px] text-muted">{f.submission ? 'locked odds' : 'odds'}</p>
          </div>
        </div>
        {f.submission ? (
          <FestivalStatus sub={f.submission} />
        ) : greyed ? (
          <p className="mt-2 text-xs text-warn">{f.disabledReason ?? 'Not eligible at this scale.'}</p>
        ) : (
          <>
            <Button
              variant="primary"
              className="mt-2 w-full"
              disabled={f.disabledReason !== null}
              aria-describedby={f.disabledReason || error ? reasonId : undefined}
              aria-label={`Submit to ${f.name} for ${money(f.fee)}`}
              onClick={() => run(f.command)}
            >
              Submit ({money(f.fee)})
            </Button>
            <Reason id={reasonId} text={f.disabledReason} error={error} />
          </>
        )}
      </article>
    </Card>
  );
}

type Pending = { kind: 'offer'; offer: ProjectView['offers'][number] } | { kind: 'self' };

function ReleaseSection({ view }: { view: ProjectView }) {
  const dispatch = useGame((g) => g.dispatch);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { offers, selfRelease } = view;
  const title = view.project.title;
  const selfReasonId = 'self-release-reason';

  const confirm = () => {
    if (!pending) return;
    setError(dispatch(pending.kind === 'offer' ? pending.offer.command : selfRelease.command));
    setPending(null);
  };

  return (
    <section aria-label="Release">
      {offers.length > 0 && (
        <>
          <SectionTitle>Distribution offers</SectionTitle>
          <div className="rounded-2xl border-2 border-accent bg-accent/10 p-3">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
              {offers.length === 1 ? 'Someone wants to buy your film' : `${offers.length} distributors want your film`}
            </h3>
            <p className="text-xs text-muted">Accepting releases the film and ends the project.</p>
            <ul className="mt-2 flex flex-col gap-2">
              {offers.map((o) => (
                <li key={o.id} className="rounded-xl border border-line bg-surface p-3">
                  <article aria-label={`Offer from ${o.distributor}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold leading-snug">{o.distributor}</h4>
                        <p className="text-xs text-muted">{o.blurb}</p>
                        {o.festival && <p className="mt-1 text-xs">Found you at {o.festival}</p>}
                      </div>
                      <span className="shrink-0 text-lg font-bold tabular-nums text-good">{money(o.amount)}</span>
                    </div>
                    <Button
                      variant="primary"
                      className="mt-2 w-full"
                      disabled={o.disabledReason !== null}
                      aria-describedby={o.disabledReason ? `offer-${o.id}-reason` : undefined}
                      aria-label={`Accept ${o.distributor}'s offer of ${money(o.amount)} and release`}
                      onClick={() => setPending({ kind: 'offer', offer: o })}
                    >
                      Accept &amp; release
                    </Button>
                    <Reason id={`offer-${o.id}-reason`} text={o.disabledReason} />
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <SectionTitle>{offers.length > 0 ? 'Or skip the middlemen' : 'Self-release'}</SectionTitle>
      <Card>
        <p className="text-sm">Upload it yourself. No money, but the internet will see it. Some of it.</p>
        <Button
          className="mt-2 w-full"
          disabled={selfRelease.disabledReason !== null}
          aria-describedby={selfRelease.disabledReason ? selfReasonId : undefined}
          onClick={() => setPending({ kind: 'self' })}
        >
          Self-release online (+{selfRelease.rp} RP, {money(0)})
        </Button>
        <Reason id={selfReasonId} text={selfRelease.disabledReason} />
      </Card>
      {error && (
        <p className="mt-1 text-xs text-bad" role="status">
          {error}
        </p>
      )}

      {pending && (
        <Sheet
          title={pending.kind === 'offer' ? `Sell “${title}” to ${pending.offer.distributor}?` : `Self-release “${title}”?`}
          onClose={() => setPending(null)}
        >
          <p className="mb-4 text-sm text-muted">
            {pending.kind === 'offer'
              ? `You get ${money(pending.offer.amount)} and the film is released. This ends the project — other offers and pending festivals go away.`
              : `You get +${selfRelease.rp} RP and no money. This ends the project — any distribution offers go away.`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setPending(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirm}>
              {pending.kind === 'offer' ? 'Accept & release' : 'Release it'}
            </Button>
          </div>
        </Sheet>
      )}
    </section>
  );
}

function FestivalStage({ view }: { view: ProjectView }) {
  const pending = view.festivals.filter((f) => f.submission?.status === 'pending').length;
  return (
    <>
      <Card>
        <h2 className="font-bold">Festival circuit</h2>
        <p className="text-sm">
          Final quality <span className="font-semibold tabular-nums">{Math.round(view.quality)}</span>/100. Submit, wait, refresh your inbox
          at 06:00.
        </p>
        {pending > 0 && (
          <p className="mt-1 text-xs text-muted">
            {pending} result{pending === 1 ? '' : 's'} pending.
          </p>
        )}
      </Card>
      <ReleaseSection view={view} />
      <SectionTitle>Festivals</SectionTitle>
      <ul className="flex flex-col gap-2">
        {view.festivals.map((f) => (
          <li key={f.id}>
            <FestivalCard f={f} />
          </li>
        ))}
      </ul>
    </>
  );
}

// ---------- Music ----------

function StudioBooking({ view }: { view: ProjectView }) {
  const b = view.budget;
  return (
    <Card>
      <h2 className="font-bold">Book the studio</h2>
      <p className="text-sm">
        <span className="font-semibold">{view.project.studio ?? 'The studio'}</span>
        <span className="text-muted"> · {LOCATIONS[view.project.location].name}</span>
      </p>
      <div className="mt-2">
        <Meter label="Studio budget booked, %" value={b.budget > 0 ? (100 * b.raised) / b.budget : 0} tone="music" hint={`${money(b.raised)} of ${money(b.budget)} booked`} />
      </div>
      <p className="mt-1 text-sm">
        <span className="font-semibold tabular-nums">{money(b.raised)}</span> of {money(b.budget)} booked
      </p>
      <p className="text-xs text-muted">
        {view.signedLabel
          ? 'The label paid its advance; self-fund the rest. Crew fees come out of it; the rest goes into the sound.'
          : "No label yet, so it's your money — or pitch a label below. Crew fees come out of it; the rest goes into the sound."}
      </p>
    </Card>
  );
}

function SignedLabelCard({ label }: { label: NonNullable<ProjectView['signedLabel']> }) {
  return (
    <section aria-labelledby="signed-label-title" className="rounded-2xl border-2 border-music/60 bg-music/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-music">Deal signed</p>
      <h2 id="signed-label-title" className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug">
        Signed to {label.name}
      </h2>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
          <dt className="text-[11px] text-muted">Advance</dt>
          <dd className="font-bold tabular-nums leading-tight text-good">{money(label.advance)}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
          <dt className="text-[11px] text-muted">Their cut</dt>
          <dd className="font-bold tabular-nums leading-tight">{wholePct(label.royaltyCut)}</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
          <dt className="text-[11px] text-muted">Marketing</dt>
          <dd className="font-bold tabular-nums leading-tight">+{wholePct(label.marketing)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-muted">
        They keep {wholePct(label.royaltyCut)} of royalties; their marketing adds +{wholePct(label.marketing)} to release-week streams.
      </p>
    </section>
  );
}

function LabelCard({ label, onNavigate }: { label: ProjectView['labels'][number]; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const reasonId = `label-${label.id}-reason`;
  return (
    <Card>
      <article aria-label={label.name}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{label.name}</h3>
            <p className="text-xs text-muted">{label.blurb}</p>
            <p className="mt-1 text-xs">Takes meetings in {label.where}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold tabular-nums leading-none" aria-label={`Signing odds ${pct(label.odds)}`}>
              {pct(label.odds)}
            </p>
            <p className="text-[11px] text-muted">odds</p>
          </div>
        </div>
        <ul aria-label="Deal terms" className="mt-1 flex flex-wrap gap-1.5 text-xs">
          <li className="rounded-md border border-line bg-surface-2 px-2 py-0.5">Advance {label.advance} of budget</li>
          <li className="rounded-md border border-line bg-surface-2 px-2 py-0.5">Keeps {wholePct(label.royaltyCut)} of royalties</li>
          <li className="rounded-md border border-line bg-surface-2 px-2 py-0.5">Marketing +{wholePct(label.marketing)} streams</li>
        </ul>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={label.disabledReason !== null}
          aria-describedby={label.disabledReason || error ? reasonId : undefined}
          aria-label={`Pitch ${label.name}, ${LABEL_PITCH_HOURS} hours, minus ${LABEL_PITCH_ENERGY} Energy`}
          onClick={() => run(label.command)}
        >
          Pitch {label.name} ({LABEL_PITCH_HOURS}h)
        </Button>
        <ReasonWithMap id={reasonId} text={label.disabledReason} error={error} onNavigate={onNavigate} />
      </article>
    </Card>
  );
}

/** Music "Book the studio": pitch labels until one signs, then show the deal. */
function LabelSection({ view, onNavigate }: { view: ProjectView; onNavigate: (tab: Tab) => void }) {
  if (view.signedLabel) return <SignedLabelCard label={view.signedLabel} />;
  if (view.labels.length === 0) return null;
  return (
    <section aria-label="Labels">
      <SectionTitle>Labels</SectionTitle>
      <p className="mb-2 text-xs text-muted">One label per record, one meeting a day. A yes pays an advance toward the studio; they take a cut and push the release.</p>
      <ul className="flex flex-col gap-2">
        {view.labels.map((l) => (
          <li key={l.id}>
            <LabelCard label={l} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecordCard({ view, onNavigate }: { view: ProjectView; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const record = view.record;
  if (!record) return null;
  const reasonId = 'record-reason';
  return (
    <Card>
      <h2 className="font-bold">Record</h2>
      <p className="text-sm">
        Session <span className="font-semibold tabular-nums">{record.done} / {record.needed}</span>
        {record.scores.length > 0 && (
          <>
            {' '}
            · Average <span className="font-semibold tabular-nums">{Math.round(record.average)}</span>/100
          </>
        )}
      </p>
      {record.scores.length > 0 ? (
        <ScoreChips label="Recording session scores" prefix="Take" scores={record.scores} />
      ) : (
        <p className="mt-1 text-xs text-muted">The red light is on. Nobody touch the snacks.</p>
      )}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted">Studio</dt>
        <dd className="min-w-0">
          {record.studio} · {LOCATIONS[view.project.location].name}
        </dd>
        <dt className="text-muted">Cost</dt>
        <dd>
          {RECORD_HOURS}h · −{RECORD_ENERGY} Energy
        </dd>
      </dl>
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={record.disabledReason !== null}
        aria-describedby={record.disabledReason || error ? reasonId : undefined}
        aria-label={`Record a session, ${RECORD_HOURS} hours, minus ${RECORD_ENERGY} Energy`}
        onClick={() => run(record.command)}
      >
        Record ({RECORD_HOURS}h)
      </Button>
      <ReasonWithMap id={reasonId} text={record.disabledReason} error={error} onNavigate={onNavigate} />
    </Card>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function MusicReleaseStage({ view }: { view: ProjectView }) {
  const release = useRun();
  const promo = useRun();
  const r = view.release;
  if (!r) return null;

  if (!r.released) {
    const reasonId = 'release-record-reason';
    return (
      <Card>
        <h2 className="font-bold">Release week</h2>
        <p className="text-sm">
          It's mixed, mastered and final quality <span className="font-semibold tabular-nums">{Math.round(view.quality)}</span>/100. Drop it when you're
          ready.
        </p>
        <ul className="mt-2 list-disc pl-5 text-xs text-muted">
          <li>Release week lasts {r.daysTotal} days.</li>
          <li>
            Each day's streams, royalties, new fans and chart spot on {r.chart} land at {pad2(BILLS_HOUR)}:00.
          </li>
          <li>Promo once a day to boost the next day's streams.</li>
          {view.signedLabel && (
            <li>
              {view.signedLabel.name} keeps {wholePct(view.signedLabel.royaltyCut)} of royalties; their marketing adds +{wholePct(view.signedLabel.marketing)} to
              streams.
            </li>
          )}
        </ul>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={r.releaseReason !== null}
          aria-describedby={r.releaseReason || release.error ? reasonId : undefined}
          onClick={() => release.run(r.releaseCommand)}
        >
          Release it now
        </Button>
        <Reason id={reasonId} text={r.releaseReason} error={release.error} />
      </Card>
    );
  }

  const done = r.days.length;
  const promoId = 'promo-reason';
  return (
    <>
      <Card>
        <h2 className="font-bold">Release week</h2>
        <p className="text-xs text-muted">{r.chart}</p>
        {view.signedLabel && (
          <p className="text-xs text-music">
            {view.signedLabel.name} keeps {wholePct(view.signedLabel.royaltyCut)} of royalties
          </p>
        )}
        <p className="mt-1 text-sm">
          Day <span className="font-semibold tabular-nums">{done} / {r.daysTotal}</span>
          {done === 0 && <span className="text-muted"> · first numbers at {pad2(BILLS_HOUR)}:00</span>}
        </p>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line bg-surface-2 px-1 py-1.5">
            <dt className="text-[11px] text-muted">Peak</dt>
            <dd className="text-lg font-bold tabular-nums leading-tight">{r.peak === null ? '—' : `#${r.peak}`}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 px-1 py-1.5">
            <dt className="text-[11px] text-muted">Streams</dt>
            <dd className="text-lg font-bold tabular-nums leading-tight">{compact(r.totalStreams)}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 px-1 py-1.5">
            <dt className="text-[11px] text-muted">Fans</dt>
            <dd className="text-lg font-bold tabular-nums leading-tight">{compact(r.fans)}</dd>
          </div>
        </dl>
        {done > 0 ? (
          <table className="mt-2 w-full table-fixed text-xs tabular-nums">
            <caption className="sr-only">Release week, day by day</caption>
            <thead>
              <tr className="text-muted">
                <th scope="col" className="w-[3.25rem] py-1 text-left font-normal">
                  Day
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Streams
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Fans
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Royalties
                </th>
                <th scope="col" className="w-12 py-1 text-right font-normal">
                  Chart
                </th>
              </tr>
            </thead>
            <tbody>
              {r.days.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <th scope="row" className="py-1 text-left font-normal">
                    {d.day}
                    {d.promoted && (
                      <>
                        <span className="ml-1 text-music" aria-hidden title="Promo boost">
                          ▲
                        </span>
                        <span className="sr-only">, promo boost</span>
                      </>
                    )}
                  </th>
                  <td className="py-1 text-right">{count(d.streams)}</td>
                  <td className="py-1 text-right">+{count(d.fans)}</td>
                  <td className="py-1 text-right">{money(d.royalties)}</td>
                  <td className={`py-1 text-right font-semibold ${d.position === null ? 'text-muted' : ''}`}>
                    {d.position === null ? (
                      <>
                        <span aria-hidden>—</span>
                        <span className="sr-only">didn't chart</span>
                      </>
                    ) : (
                      `#${d.position}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-xs text-muted">Out now. Refresh, refresh, refresh.</p>
        )}
        {r.days.some((d) => d.promoted) && (
          <p className="mt-1 text-[11px] text-muted">
            <span className="text-music" aria-hidden>
              ▲
            </span>{' '}
            boosted by the previous day's promo
          </p>
        )}
      </Card>
      <Card>
        <h2 className="font-bold">Promo</h2>
        <p className="text-sm">
          A promo push today adds +{Math.round(PROMO_BOOST * 100)}% to tomorrow's streams. Once a day, anywhere.
        </p>
        {r.promotedToday && <p className="mt-1 text-xs text-good">✓ Promoted today — tomorrow's numbers get the boost.</p>}
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={r.promoReason !== null}
          aria-describedby={r.promoReason || promo.error ? promoId : undefined}
          onClick={() => promo.run(r.promoCommand)}
        >
          Promo ({PROMO_HOURS}h, −{PROMO_ENERGY} Energy, −{PROMO_SPARK} Spark)
        </Button>
        <Reason id={promoId} text={r.promoReason} error={promo.error} />
      </Card>
    </>
  );
}

/** Where the quality number comes from: each stage's score so far (all values from projectView). */
function QualityParts({ view }: { view: ProjectView }) {
  const parts: { label: string; value: number | null }[] = view.spec
    ? [
        { label: 'Spec', value: view.script.done > 0 ? view.script.quality : null },
        { label: 'Deck', value: view.spec.deck.done > 0 ? view.spec.deck.average : null },
      ]
    : view.record
    ? [
        { label: 'Songs', value: view.script.done > 0 ? view.script.quality : null },
        { label: 'Crew', value: view.crew.hired > 0 ? view.crew.quality : null },
        { label: 'Record', value: view.record.done > 0 ? view.record.average : null },
      ]
    : [
        { label: 'Script', value: view.script.done > 0 ? view.script.quality : null },
        { label: 'Crew', value: view.crew.hired > 0 ? view.crew.quality : null },
        { label: 'Shoot', value: view.shoot.done > 0 ? view.shoot.average : null },
        { label: 'Post', value: view.post.done > 0 ? view.post.average : null },
      ];
  return (
    <ul aria-label="Quality by stage" className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
      {parts.map((x) => (
        <li key={x.label}>
          {x.label} <span className="font-semibold tabular-nums text-ink">{x.value === null ? '—' : Math.round(x.value)}</span>
          {x.value === null && <span className="sr-only"> not scored yet</span>}
        </li>
      ))}
    </ul>
  );
}

// ---------- TV spec pilot (writer's side) ----------

type SpecView = NonNullable<ProjectView['spec']>;

function DeckCard({ deck }: { deck: SpecView['deck'] }) {
  const { error, run } = useRun();
  const reasonId = 'deck-reason';
  return (
    <Card>
      <h2 className="font-bold">Build the pitch deck</h2>
      <p className="text-sm">
        Session <span className="font-semibold tabular-nums">{deck.done} / {deck.needed}</span>
        {deck.scores.length > 0 && (
          <>
            {' '}
            · Average <span className="font-semibold tabular-nums">{Math.round(deck.average)}</span>/100
          </>
        )}
      </p>
      {deck.scores.length > 0 ? (
        <ScoreChips label="Deck session scores" prefix="Slide pass" scores={deck.scores} />
      ) : (
        <p className="mt-1 text-xs text-muted">Twelve slides. One of them is just a mood board of rain.</p>
      )}
      <p className="mt-2 text-xs">
        <span className="text-muted">Cost</span> {DECK_HOURS}h · −{DECK_ENERGY} Energy · −{DECK_SPARK} Spark · anywhere
      </p>
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={deck.disabledReason !== null}
        aria-describedby={deck.disabledReason || error ? reasonId : undefined}
        onClick={() => run(deck.command)}
      >
        Build deck ({DECK_HOURS}h)
      </Button>
      <Reason id={reasonId} text={deck.disabledReason} error={error} />
    </Card>
  );
}

function AgencyCard({ agency, onNavigate }: { agency: SpecView['agencies'][number]; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const reasonId = `agency-${agency.id}-reason`;
  return (
    <Card>
      <article aria-label={agency.name}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">{agency.name}</h3>
            <p className="text-xs text-muted">{agency.blurb}</p>
            <p className="mt-1 text-xs">Takes meetings in {agency.where}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold tabular-nums leading-none" aria-label={`Signing odds ${pct(agency.odds)}`}>
              {pct(agency.odds)}
            </p>
            <p className="text-[11px] text-muted">odds</p>
          </div>
        </div>
        <p className="mt-1 text-xs">
          <span className="rounded-md border border-tv/50 bg-tv/10 px-2 py-0.5 text-tv">Heat +{wholePct(agency.heat)}</span>
          <span className="text-muted"> to staffing odds if they sign you</span>
        </p>
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={agency.disabledReason !== null}
          aria-describedby={agency.disabledReason || error ? reasonId : undefined}
          onClick={() => run(agency.command)}
        >
          Meet {agency.name} ({AGENT_PITCH_HOURS}h, −{AGENT_PITCH_ENERGY} Energy)
        </Button>
        <ReasonWithMap id={reasonId} text={agency.disabledReason} error={error} onNavigate={onNavigate} />
      </article>
    </Card>
  );
}

function AgentStage({ view, spec, onNavigate }: { view: ProjectView; spec: SpecView; onNavigate: (tab: Tab) => void }) {
  return (
    <>
      <Card>
        <h2 className="font-bold">Land an agent</h2>
        <p className="text-sm">
          Spec <span className="font-semibold tabular-nums">{Math.round(view.script.quality)}</span>/100 · Deck{' '}
          <span className="font-semibold tabular-nums">{Math.round(spec.deck.average)}</span>/100
        </p>
        <p className="mt-1 text-xs text-muted">
          One agency meeting a day. Bigger agencies are harder to sign but bring more heat into staffing season.
        </p>
        {spec.pitchedToday && <p className="mt-1 text-xs text-muted">Met an agency today — assistants talk. Try again tomorrow.</p>}
      </Card>
      <SectionTitle>Agencies</SectionTitle>
      <ul className="flex flex-col gap-2">
        {spec.agencies.map((a) => (
          <li key={a.id}>
            <AgencyCard agency={a} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </>
  );
}

function StaffingCard({ spec }: { spec: SpecView }) {
  const st = spec.staffing;
  return (
    <section aria-labelledby="staffing-title" className="rounded-2xl border-2 border-tv/60 bg-tv/10 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-tv">Staffing season</p>
      <h2 id="staffing-title" className="font-[family-name:var(--font-display)] text-lg font-bold leading-snug">
        {spec.agent ? `${spec.agent.name} is sending your spec out` : 'Your agent is sending your spec out'}
      </h2>
      {st ? (
        <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
            <dt className="text-[11px] text-muted">Tries</dt>
            <dd className="font-bold tabular-nums leading-tight">
              {st.tries}/{st.triesTotal}
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
            <dt className="text-[11px] text-muted">Odds</dt>
            <dd className="font-bold tabular-nums leading-tight">{pct(st.odds)}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface px-1 py-1.5">
            <dt className="text-[11px] text-muted">Next try</dt>
            <dd className="font-bold tabular-nums leading-tight">
              Day {day(st.nextMinute)} {clock(st.nextMinute)}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-1 text-sm text-muted">Waiting on the first round of calls.</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Nothing to press: your agent makes the calls. Keep hustling — Clout raises the odds. Staffed writers do one room day a week at the studio lot.
      </p>
    </section>
  );
}

function ActiveProject({ view, onNavigate }: { view: ProjectView; onNavigate: (tab: Tab) => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const [confirm, setConfirm] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);
  const { project } = view;
  const location = LOCATIONS[project.location];
  const music = project.medium === 'music';
  const tv = view.spec !== null;

  return (
    <div>
      <header className="mb-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">“{project.title}”</h1>
        <p className="text-sm text-muted">
          {tv
            ? `${view.scaleName} · write it, pitch it, get staffed`
            : music
              ? `${view.scaleName} · records at ${project.studio ?? 'the studio'}, ${location.name}`
              : `${view.scaleName} · shoots in ${location.name}`}
        </p>
      </header>

      <Stepper stages={view.stages} />
      <div className="mb-3">
        <Meter label="Quality so far, out of 100" value={view.quality} hint={`Quality so far: ${Math.round(view.quality)} of 100`} />
        <QualityParts view={view} />
      </div>

      <div className="flex flex-col gap-2">
        {project.stage === 'develop' && <WriteCard view={view} />}

        {view.spec && project.stage === 'deck' && <DeckCard deck={view.spec.deck} />}
        {view.spec && project.stage === 'agent' && <AgentStage view={view} spec={view.spec} onNavigate={onNavigate} />}
        {view.spec && project.stage === 'staffing' && <StaffingCard spec={view.spec} />}

        {!tv && project.stage === 'finance' && music && (
          <>
            <StudioBooking view={view} />
            <LabelSection view={view} onNavigate={onNavigate} />
            <SelfFund view={view} />
          </>
        )}

        {!tv && project.stage === 'finance' && !music && (
          <>
            <BudgetSummary view={view} />
            <SectionTitle>Investors</SectionTitle>
            <ul className="flex flex-col gap-2">
              {view.investors.map((inv) => (
                <li key={inv.id}>
                  <InvestorCard inv={inv} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
            <SelfFund view={view} />
          </>
        )}

        {!tv && project.stage === 'crew' && <CrewStage view={view} />}

        {project.stage === 'shoot' && <ShootCard view={view} onNavigate={onNavigate} />}
        {project.stage === 'post' && <PostCard view={view} />}
        {project.stage === 'festival' && <FestivalStage view={view} />}
        {project.stage === 'record' && <RecordCard view={view} onNavigate={onNavigate} />}
        {project.stage === 'release' && <MusicReleaseStage view={view} />}
      </div>

      <div className="mt-6">
        <Button variant="danger" className="w-full" onClick={() => setConfirm(true)}>
          Abandon project
        </Button>
        {abandonError && (
          <p className="mt-1 text-xs text-bad" role="status">
            {abandonError}
          </p>
        )}
      </div>

      {confirm && (
        <Sheet title={`Abandon “${project.title}”?`} onClose={() => setConfirm(false)}>
          <p className="mb-4 text-sm text-muted">
            {tv ? 'The spec goes in a drawer. The drawer is full of specs.' : 'Money raised is gone. The credit stays, forever, as a cautionary tale.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                const r = dispatch(view.abandon);
                setAbandonError(r);
                setConfirm(false);
              }}
            >
              Abandon
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function ProjectsScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  if (!state) return null;
  const view = projectView(state);
  return (
    <>
      {view ? <ActiveProject view={view} onNavigate={onNavigate} /> : <NoProject />}
      <MusicBusiness onNavigate={onNavigate} />
    </>
  );
}
