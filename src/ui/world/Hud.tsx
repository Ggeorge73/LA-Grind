// Sprint 12 (LAG-94) HUD over the 3D room: the slim glass pill (day, clock, mood, Clout, cash, speed, phone),
// the overdraft strip under it, and the Energy / Spark / Burnout panel at the top left.
import { bankView, inboxView } from '../../sim/actions';
import { MINUTES_PER_DAY } from '../../sim/constants';
import { APPS } from '../../sim/content/phoneFlavor';
import { MOODS } from '../../sim/content/homeFlavor';
import { cloutTier } from '../../sim/formulas';
import type { Player } from '../../sim/types';
import { useGame } from '../../store/game';
import { usePhone } from '../../store/phone';
import { clock, day, money, remaining } from '../format';
import { SpeedControl } from '../phone/StatusBar';

/** Average of Energy, Spark and (100 − Burnout), mapped to the content's mood ladder. */
export function moodOf(p: Player): string {
  const avg = (p.energy + p.spark + (100 - p.burnout)) / 3;
  return (MOODS.find((m) => avg >= m.min) ?? MOODS[MOODS.length - 1])?.label ?? '';
}

const isNight = (minute: number) => {
  const h = (minute % MINUTES_PER_DAY) / 60;
  return h < 6 || h >= 19.5;
};

function Sep({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`h-[18px] w-px shrink-0 bg-white/15 ${className}`} />;
}

export function TopBar() {
  const state = useGame((g) => g.state);
  const open = usePhone((p) => p.open);
  const setOpen = usePhone((p) => p.setOpen);
  const openApp = usePhone((p) => p.openApp);
  if (!state) return null;
  const p = state.player;
  const unread = inboxView(state).unread;
  const broke = p.cash < 0;
  const od = bankView(state).overdraft;

  return (
    <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-2 px-3">
      <header
        aria-label="Status"
        className="hud-glass pointer-events-auto mt-1.5 flex max-w-full items-center gap-1 whitespace-nowrap rounded-full py-1.5 pl-3 pr-1.5 text-[12px] tabular-nums sm:pl-3.5 sm:text-[13px]"
      >
        <p className="flex items-center gap-1.5 px-1">
          <span aria-hidden>{isNight(state.minute) ? '🌙' : '☀️'}</span>
          <span>
            <span className="font-bold">Day {day(state.minute)}</span> · {clock(state.minute)}
          </span>
        </p>
        <Sep className="hidden sm:block" />
        <p className="hidden px-1.5 font-semibold text-good sm:block">
          <span className="sr-only">Mood: </span>
          {moodOf(p)}
        </p>
        <Sep className="hidden sm:block" />
        <p className="hidden items-center gap-1 px-1.5 sm:flex">
          <span aria-hidden>⭐</span> Clout {cloutTier(p.rp)}
        </p>
        <Sep />
        <button
          type="button"
          onClick={() => openApp('bank')}
          aria-label={`Cash ${money(p.cash)}${broke ? ', overdraft' : ''}. Open ${APPS.bank.name}`}
          className={`rounded-full px-1.5 py-1 font-bold active:bg-white/10 ${broke ? 'text-bad' : ''}`}
        >
          {money(p.cash)}
        </button>
        <SpeedControl slim />
        <button
          type="button"
          data-open-phone
          aria-expanded={open}
          aria-label={open ? 'Put away phone' : unread > 0 ? `Open phone, ${unread} unread message${unread === 1 ? '' : 's'}` : 'Open phone'}
          onClick={() => setOpen(!open)}
          className="relative ml-0.5 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-pink shadow-[0_4px_14px_-4px_rgb(255_92_147/0.8)] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-[#1b1026]" aria-hidden>
            <path d="M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 3v13h8V5H8z" />
          </svg>
          {unread > 0 && (
            <span aria-hidden className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-white px-[3px] text-[10px] font-extrabold text-[#1b1026]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </header>
      {od && (
        <button
          type="button"
          onClick={() => openApp('bank')}
          className="pointer-events-auto rounded-full bg-bad/90 px-3.5 py-1.5 text-[12px] font-bold text-[#2a0710] shadow-[0_8px_20px_-6px_rgb(251_113_133/0.7)]"
          aria-label={`Overdraft: ${remaining(od.minutesLeft)} left to get back to $0. Open ${APPS.bank.name}`}
        >
          ⚠️ Overdraft · {remaining(od.minutesLeft)} to get back to $0
        </button>
      )}
    </div>
  );
}

const STATS: { key: 'energy' | 'spark' | 'burnout'; label: string; icon: string; color: string; low: (v: number) => boolean }[] = [
  { key: 'energy', label: 'Energy', icon: '⚡', color: '#46d18b', low: (v) => v < 25 },
  { key: 'spark', label: 'Spark', icon: '✨', color: '#b98cff', low: (v) => v < 25 },
  { key: 'burnout', label: 'Burnout', icon: '🔥', color: '#ff9a52', low: (v) => v >= 70 },
];

/** Top-left glass panel: the real stats as bars, plus mood and Clout on narrow screens (the pill hides them). */
export function NeedsPanel() {
  const p = useGame((g) => g.state?.player ?? null);
  if (!p) return null;
  return (
    <section
      aria-label="Needs"
      className={`hud-glass absolute left-3 z-20 grid w-[118px] gap-[7px] rounded-2xl px-2.5 py-2 text-[11px] sm:w-[150px] sm:px-3 sm:py-2.5 hud-below`}
    >
      <p className="font-semibold leading-tight text-good sm:hidden">
        <span className="sr-only">Mood: </span>
        {moodOf(p)}
      </p>
      <p className="-mt-1 leading-tight text-muted sm:hidden">
        <span aria-hidden>⭐</span> Clout {cloutTier(p.rp)}
      </p>
      {STATS.map((s) => {
        const v = Math.round(p[s.key]);
        return (
          <div key={s.key} className="grid grid-cols-[16px_1fr] items-center gap-1.5">
            <span aria-hidden>{s.icon}</span>
            <div className="grid gap-[3px]">
              <div className="flex justify-between leading-none text-muted">
                <span>{s.label}</span>
                <span className="font-semibold tabular-nums text-ink">{v}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-label={s.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
                <i className="block h-full rounded-full transition-[width] duration-400" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: s.low(v) ? '#ff5f5f' : s.color }} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
