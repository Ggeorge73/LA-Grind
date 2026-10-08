import { useState } from 'react';
import { projectScaleOptions, projectView, type ProjectView, type ScaleOption } from '../../sim/actions';
import { HIRE_HOURS, PITCH_HOURS, PRODUCTION_VALUE_MAX, WRITE_SESSION_HOURS } from '../../sim/constants';
import { LOCATIONS } from '../../sim/content/locations';
import type { Command } from '../../sim/types';
import { useGame } from '../../store/game';
import { money, pct } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card, Meter, SectionTitle, Sheet } from '../kit';

/** Preset self-fund amounts (UI shortcuts, not balance rules — the sim validates each). */
const SELF_FUND_PRESETS = [100, 500, 1000] as const;
/** Disabled reasons that are solved by travelling somewhere get a Map shortcut. */
const needsTravel = (reason: string) => /takes meetings in/i.test(reason);

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
        <p className="text-xs text-muted">Needs Clout Tier {option.minTier} · budget {money(option.budget)}</p>
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

function NoProject() {
  const state = useGame((g) => g.state)!;
  const options = projectScaleOptions(state);
  return (
    <div>
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
                  <p className="text-xs text-muted">
                    {c.scale} · {c.outcome} · Quality {c.quality}/100
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
      <Meter label="Budget raised" value={b.raised} max={b.budget} tone="good" hint={`${money(b.raised)} of ${money(b.budget)} raised`} />
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

function ComingSoon({ view }: { view: ProjectView }) {
  return (
    <Card>
      <h2 className="font-bold">Next sprint: cameras roll</h2>
      <p className="mt-1 text-sm">
        Your crew is assembled, the craft-services table is stocked with one sad tray of hummus, and the AD has already made three
        group chats. The shoot is coming soon — until then, everyone is “prepping”, which mostly means vaping near the van.
      </p>
      <p className="mt-2 text-xs text-muted">
        Crew {view.crew.hired}/{view.crew.slots} · crew quality {Math.round(view.crew.quality)} · script {Math.round(view.script.quality)}/100 ·{' '}
        {money(view.budget.remaining)} left in the budget
      </p>
    </Card>
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
        <Meter label="Quality so far" value={view.quality} hint={`Quality so far: ${Math.round(view.quality)} of 100`} />
        <p className="sr-only">Quality so far: {Math.round(view.quality)}/100</p>
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

        {(project.stage === 'shoot' || project.stage === 'post' || project.stage === 'festival') && <ComingSoon view={view} />}
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
