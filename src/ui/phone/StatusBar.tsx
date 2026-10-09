import { inboxView } from '../../sim/actions';
import { SPEEDS } from '../../sim/constants';
import { APPS } from '../../sim/content/phoneFlavor';
import { useGame, type Speed } from '../../store/game';
import { usePhone } from '../../store/phone';
import { clock, day, duration, money } from '../format';

const SPEED_META: Record<Speed, { aria: string; icon: string }> = {
  0: { aria: 'Pause', icon: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' },
  1: { aria: 'Normal speed', icon: 'M8 5.5v13l10.5-6.5z' },
  4: { aria: 'Fast speed', icon: 'M3.5 6v12l8-6zM12.5 6v12l8-6z' },
};

/** Pause / 1x / fast as one segmented control: every speed is one tap away. */
export function SpeedControl({ large = false }: { large?: boolean }) {
  const speed = useGame((g) => g.speed);
  const setSpeed = useGame((g) => g.setSpeed);
  return (
    <div role="group" aria-label="Game speed" className={`flex rounded-full bg-black/35 p-0.5 ring-1 ring-white/10 ${large ? 'w-full' : ''}`}>
      {SPEEDS.map((s) => {
        const on = speed === s;
        const meta = SPEED_META[s];
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            aria-label={meta.aria}
            title={meta.aria}
            onClick={() => setSpeed(s)}
            className={`flex min-h-11 items-center justify-center gap-1 rounded-full transition ${large ? 'flex-1 text-sm' : 'min-w-11 px-1'} ${
              on ? 'bg-accent text-accent-ink shadow-[0_0_12px_rgb(255_138_61/0.5)]' : 'text-ink/80 active:bg-white/10'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d={meta.icon} />
            </svg>
            {large && <span className="font-semibold">{s === 0 ? 'Pause' : `${s}x`}</span>}
            {!large && s > 1 && <span className="text-[10px] font-bold tabular-nums" aria-hidden>{s}x</span>}
          </button>
        );
      })}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.round(value);
  return (
    <div className="flex min-w-0 items-center gap-1" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted" aria-hidden>
        {label === 'Energy' ? 'NRG' : 'SPK'}
      </span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
      </span>
      <span className="text-[11px] font-semibold tabular-nums" aria-hidden>
        {v}
      </span>
    </div>
  );
}

export function StatusBar() {
  const state = useGame((g) => g.state);
  const openApp = usePhone((p) => p.openApp);
  if (!state) return null;
  const p = state.player;
  const unread = inboxView(state).unread;
  const broke = p.cash < 0;

  return (
    <header className="relative z-20 px-3 pb-1.5 pt-1" aria-label="Status bar">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-baseline gap-1.5 pl-1 font-[family-name:var(--font-display)]">
          <span className="text-lg font-bold tabular-nums leading-none">{clock(state.minute)}</span>
          <span className="text-xs font-semibold text-muted">Day {day(state.minute)}</span>
        </p>
        <SpeedControl />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 pl-1">
        <button
          type="button"
          onClick={() => openApp('bank')}
          aria-label={`Cash ${money(p.cash)}${broke ? ', overdraft' : ''}. Open ${APPS.bank.name}`}
          className={`-my-2 flex min-h-11 items-center rounded-full px-1 text-sm font-bold tabular-nums ${broke ? 'text-bad' : 'text-ink'}`}
        >
          {money(p.cash)}
          {broke && <span className="ml-1 rounded bg-bad/20 px-1 text-[9px] uppercase tracking-wide">overdraft</span>}
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          <Mini label="Energy" value={p.energy} color="var(--color-good)" />
          <Mini label="Spark" value={p.spark} color="var(--color-music)" />
          <button
            type="button"
            onClick={() => openApp('messages')}
            aria-label={unread > 0 ? `${unread} unread messages` : 'No unread messages'}
            className="-my-2 -mr-1 grid min-h-11 min-w-9 place-items-center"
          >
            <span className={`block h-2.5 w-2.5 rounded-full ${unread > 0 ? 'bg-pink shadow-[0_0_8px_var(--color-pink)]' : 'bg-white/15'}`} aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

/** Thin "you're busy" strip shown at the top of apps, with the one-tap Skip. */
export function ActivityStrip() {
  const act = useGame((g) => g.state?.activity ?? null);
  const minute = useGame((g) => g.state?.minute ?? 0);
  const dispatch = useGame((g) => g.dispatch);
  if (!act) return null;
  const frac = Math.max(0, Math.min(1, (minute - act.startMinute) / Math.max(1, act.endMinute - act.startMinute)));
  return (
    <div className="mx-3 mb-1 flex items-center gap-2 rounded-2xl bg-white/[0.06] py-0.5 pl-3 pr-0.5 ring-1 ring-white/10">
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="truncate font-semibold">
            <span className="sr-only">Busy: </span>
            {act.label}
          </span>
          <span className="shrink-0 tabular-nums text-muted">{duration(Math.max(0, act.endMinute - minute))} left</span>
        </p>
        <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${act.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}>
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-pink" style={{ width: `${frac * 100}%` }} />
        </div>
      </div>
      <button type="button" aria-label="Skip to done" onClick={() => dispatch({ type: 'SKIP_TO_DONE' })} className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-bold text-accent active:bg-white/10">
        Skip
      </button>
    </div>
  );
}
