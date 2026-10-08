import { useEffect, useRef, useState } from 'react';
import { projectScaleOptions, projectView, type ProjectView, type ScaleOption } from '../../sim/actions';
import {
  EDIT_ENERGY,
  EDIT_HOURS,
  HIRE_HOURS,
  MINUTES_PER_DAY,
  PITCH_HOURS,
  PRODUCTION_VALUE_MAX,
  SHOOT_CALL_WINDOW,
  SHOOT_ENERGY,
  SHOOT_HOURS,
  WRITE_SESSION_HOURS,
} from '../../sim/constants';
import { LOCATIONS } from '../../sim/content/locations';
import type { Command, ProjectCredit } from '../../sim/types';
import { useGame } from '../../store/game';
import { clock, day, money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card, Meter, SectionTitle, Sheet } from '../kit';

/** Preset self-fund amounts (UI shortcuts, not balance rules — the sim validates each). */
const SELF_FUND_PRESETS = [100, 500, 1000] as const;
/** Disabled reasons that are solved by travelling somewhere get a Map shortcut. */
const needsTravel = (reason: string) => /takes meetings in|the set is in/i.test(reason);

/** Runs a command and keeps the rejection reason next to the button that caused it. */
function useRun() {
  const dispatch = useGame((g) => g.dispatch);
  const [error, setError] = useState<string | null>(null);
  return { error, run: (cmd: Command) => setError(dispatch(cmd)) };
}

function Reason({ id, text, error }: { id: string; text: string | null; error?: string | null }) {
  const shown = text ?? error ?? null;
  if (!shown) return null;
  return (
    <p id={id} className={`mt-1 text-xs ${text ? 'text-warn' : 'text-bad'}`} role={text ? undefined : 'status'}>
      {shown}
    </p>
  );
}

// ---------- No active project ----------

function ScaleCard({ option }: { option: ScaleOption }) {
  const { error, run } = useRun();
  const reasonId = `scale-${option.id}-reason`;
  return (
    <Card>
      <article aria-label={option.name}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-bold leading-snug">{option.name}</h2>
          <span className="shrink-0 font-semibold tabular-nums">{money(option.budget)}</span>
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

/** Credits are written by the sim as "Released by …" or "Self-released online" when a film comes out. */
const isRelease = (outcome: string) => /^(released by|self-released)/i.test(outcome);

function ReleaseBanner({ credit, onDismiss }: { credit: ProjectCredit; onDismiss: () => void }) {
  const ref = useRef<HTMLElement>(null);
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
        🎬🍾
      </p>
      <h2 id="release-banner-title" className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold">
        “{credit.title}” is out!
      </h2>
      <p className="text-sm">{credit.outcome}</p>
      <p className="text-xs text-muted">
        {credit.scale} · Quality {credit.quality}/100 · Day {day(credit.minute)} {clock(credit.minute)}
      </p>
      <p className="mt-1 text-xs">Your IMDb page has an actual credit on it now. Start the next one.</p>
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
        <p className="text-sm text-muted">Stop auditioning for other people's movies. Make your own.</p>
      </header>

      <ul className="flex flex-col gap-2">
        {options.map((o) => (
          <li key={o.id}>
            <ScaleCard option={o} />
          </li>
        ))}
      </ul>

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
                    {c.scale} · Quality {c.quality}/100 · Day {day(c.minute)}
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
  return (
    <Card>
      <h2 className="font-bold">Write the script</h2>
      <p className="text-sm">
        Sessions <span className="font-semibold tabular-nums">{script.done}/{script.needed}</span> · Script quality{' '}
        <span className="font-semibold tabular-nums">{Math.round(script.quality)}</span>/100
      </p>
      {script.scores.length > 0 ? (
        <ul aria-label="Session scores" className="mt-1 flex flex-wrap gap-1.5">
          {script.scores.map((s, i) => (
            <li key={i} className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs tabular-nums">
              Draft {i + 1}: {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">The blank page stares back. It has notes.</p>
      )}
      <Button
        variant="primary"
        className="mt-2 w-full"
        disabled={write.disabledReason !== null}
        aria-describedby={write.disabledReason || error ? reasonId : undefined}
        onClick={() => run(write.command)}
      >
        Write ({WRITE_SESSION_HOURS}h)
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
  return (
    <>
      <Card>
        <h2 className="font-bold">
          Crew {crew.hired}/{crew.slots}
        </h2>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <Meter label="Crew quality" value={crew.quality} />
          <Meter label="Production value" value={crew.productionValue} max={PRODUCTION_VALUE_MAX} hint={`${Math.round(crew.productionValue)} of ${PRODUCTION_VALUE_MAX}`} />
        </div>
        <p className="mt-2 text-sm">
          Budget remaining <span className="font-semibold tabular-nums">{money(budget.remaining)}</span>
        </p>
        <p className="text-xs text-muted">Unspent money ends up on screen. Allegedly.</p>
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

/** A reason line, plus a Map shortcut when the fix is "go somewhere". */
function ReasonWithMap({ id, text, error, onNavigate }: { id: string; text: string | null; error: string | null; onNavigate: (tab: Tab) => void }) {
  if (!text && !error) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <Reason id={id} text={text} error={error} />
      {text && needsTravel(text) && (
        <Button variant="ghost" className="shrink-0" onClick={() => onNavigate('map')}>
          Map
        </Button>
      )}
    </div>
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
    </Card>
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

/** Where the quality number comes from: each stage's score so far (all values from projectView). */
function QualityParts({ view }: { view: ProjectView }) {
  const parts: { label: string; value: number | null }[] = [
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

function ActiveProject({ view, onNavigate }: { view: ProjectView; onNavigate: (tab: Tab) => void }) {
  const dispatch = useGame((g) => g.dispatch);
  const [confirm, setConfirm] = useState(false);
  const [abandonError, setAbandonError] = useState<string | null>(null);
  const { project } = view;
  const location = LOCATIONS[project.location];

  return (
    <div>
      <header className="mb-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">“{project.title}”</h1>
        <p className="text-sm text-muted">
          {view.scaleName} · shoots in {location.name}
        </p>
      </header>

      <Stepper stages={view.stages} />
      <div className="mb-3">
        <Meter label="Quality so far, out of 100" value={view.quality} hint={`Quality so far: ${Math.round(view.quality)} of 100`} />
        <QualityParts view={view} />
      </div>

      <div className="flex flex-col gap-2">
        {project.stage === 'develop' && <WriteCard view={view} />}

        {project.stage === 'finance' && (
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

        {project.stage === 'crew' && <CrewStage view={view} />}

        {project.stage === 'shoot' && <ShootCard view={view} onNavigate={onNavigate} />}
        {project.stage === 'post' && <PostCard view={view} />}
        {project.stage === 'festival' && <FestivalStage view={view} />}
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
          <p className="mb-4 text-sm text-muted">Money raised is gone. The credit stays, forever, as a cautionary tale.</p>
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
  return view ? <ActiveProject view={view} onNavigate={onNavigate} /> : <NoProject />;
}
