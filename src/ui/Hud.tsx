import { useGame, type Speed } from '../store/game';
import { todaysBill } from '../sim/actions';
import { BILLS_HOUR, MAX_TIER, SPEEDS } from '../sim/constants';
import { LOCATIONS } from '../sim/content/locations';
import { cloutTier, tierProgress, tierThreshold } from '../sim/formulas';
import { Button, Meter } from './kit';
import { clock, day, duration, money } from './format';

const SPEED_LABEL = (s: Speed): { text: string; aria: string } =>
  s === 0 ? { text: 'Pause', aria: 'Pause' } : s === 1 ? { text: '1x', aria: 'Normal speed' } : { text: `${s}x`, aria: 'Fast speed' };

const pad = (n: number) => String(n).padStart(2, '0');

export function Hud() {
  const state = useGame((g) => g.state);
  const speed = useGame((g) => g.speed);
  const setSpeed = useGame((g) => g.setSpeed);
  const dispatch = useGame((g) => g.dispatch);
  if (!state) return null;

  const p = state.player;
  const tier = cloutTier(p.rp);
  const atMax = tier >= MAX_TIER;
  const next = atMax ? null : tierThreshold(tier + 1);
  const progress = tierProgress(p.rp);
  const act = state.activity;
  const overdraft = p.cash < 0;

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-surface px-4 pb-2">
      {/* Row 1: clock + speed */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums">
          Day {day(state.minute)} <span className="text-muted">·</span> {clock(state.minute)}
        </p>
        <div role="group" aria-label="Game speed" className="flex gap-1">
          {SPEEDS.map((s) => {
            const l = SPEED_LABEL(s);
            const on = speed === s;
            return (
              <Button
                key={s}
                variant={on ? 'primary' : 'secondary'}
                aria-pressed={on}
                aria-label={l.aria}
                className="px-2 text-xs"
                onClick={() => setSpeed(s)}
              >
                {l.text}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Row 2: cash, bills, where */}
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <p>
          <span className="sr-only">Cash: </span>
          <span className={`text-base font-bold tabular-nums ${overdraft ? 'text-bad' : 'text-ink'}`}>{money(p.cash)}</span>
          {overdraft && <span className="ml-1 font-semibold uppercase text-bad">overdraft</span>}
          <span className="ml-2 text-muted">
            Bills {money(todaysBill(state))} at {pad(BILLS_HOUR)}:00
          </span>
        </p>
        <p className="text-muted">
          <span className="text-ink">{LOCATIONS[p.location].name}</span> · Car {Math.round(p.carHealth)}
        </p>
      </div>

      {/* Row 3: meters */}
      <div className="mt-1.5 grid grid-cols-3 gap-3">
        <Meter label="Energy" value={p.energy} tone="good" />
        <Meter
          label={p.creativeBurnout ? 'Burnout · Creative Burnout' : 'Burnout'}
          value={p.burnout}
          tone="bad"
          hint={`${Math.round(p.burnout)} of 100${p.creativeBurnout ? ', Creative Burnout active' : ''}`}
        />
        <Meter label="Spark" value={p.spark} tone="music" />
      </div>
      {p.creativeBurnout && (
        <p className="mt-0.5 text-[11px] font-semibold text-bad">Creative Burnout: your muse has left the chat.</p>
      )}

      {/* Row 4: clout */}
      <div className="mt-1.5">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="font-semibold">Clout Tier {tier}</span>
          <span className="tabular-nums text-muted">
            RP {Math.round(p.rp)} / {next === null ? 'max' : next}
          </span>
        </div>
        <div
          className="mt-0.5 h-1 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={`Progress to Clout Tier ${atMax ? tier : tier + 1}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {/* Busy */}
      {act && <Busy label={act.label} start={act.startMinute} end={act.endMinute} now={state.minute} onSkip={() => dispatch({ type: 'SKIP_TO_DONE' })} />}
    </header>
  );
}

function Busy({ label, start, end, now, onSkip }: { label: string; start: number; end: number; now: number; onSkip: () => void }) {
  const span = Math.max(1, end - start);
  const frac = Math.max(0, Math.min(1, (now - start) / span));
  const left = Math.max(0, end - now);
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate font-semibold">
            <span className="sr-only">Busy: </span>
            {label}
          </span>
          <span className="shrink-0 tabular-nums text-muted">{duration(left)} left</span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"
          role="progressbar"
          aria-label={`${label} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(frac * 100)}
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      <Button variant="primary" className="shrink-0 px-3 text-xs" onClick={onSkip}>
        Skip to done
      </Button>
    </div>
  );
}
