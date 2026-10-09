import type { ReactNode } from 'react';
import { inboxView, tvView } from '../../sim/actions';
import { MAX_TIER } from '../../sim/constants';
import { APPS, PHONE, type AppId } from '../../sim/content/phoneFlavor';
import { LOCATIONS } from '../../sim/content/locations';
import { cloutTier, tierProgress, tierThreshold } from '../../sim/formulas';
import type { GameState } from '../../sim/types';
import { useGame } from '../../store/game';
import { usePhone } from '../../store/phone';
import { compact, count, day, duration, money, remaining } from '../format';
import { AppGlyph } from './AppIcon';

export const APP_ORDER: readonly AppId[] = ['casting', 'studio', 'bank', 'feed', 'messages', 'rides', 'gigs', 'union', 'settings'];

function Widget({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <section aria-label={label} className={`glass rounded-[1.6rem] p-3 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)] ${className}`}>
      {children}
    </section>
  );
}

function badgeFor(id: AppId, s: GameState): { text: string; label: string; dot?: boolean } | null {
  if (id === 'messages') {
    const n = inboxView(s).unread;
    return n > 0 ? { text: n > 99 ? '99+' : String(n), label: `${n} unread` } : null;
  }
  if (id === 'bank' && s.overdraft) return { text: '!', label: 'Overdraft' };
  if (id === 'casting' && tvView(s).season.active) return { text: '', label: 'Pilot season', dot: true };
  return null;
}

function AppTile({ id, state }: { id: AppId; state: GameState }) {
  const openApp = usePhone((p) => p.openApp);
  const app = APPS[id];
  const badge = badgeFor(id, state);
  const badgeId = `badge-${id}`;
  return (
    <li className="flex justify-center">
      <button
        type="button"
        aria-label={app.name}
        aria-describedby={badge ? badgeId : undefined}
        onClick={() => openApp(id)}
        className="group flex w-[84px] flex-col items-center gap-1.5 rounded-2xl py-1 outline-offset-2 transition active:scale-95"
      >
        <span className="relative">
          <AppGlyph id={id} size={60} />
          {badge && (
            <span
              id={badgeId}
              className={
                badge.dot
                  ? 'absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-tv ring-2 ring-bg'
                  : `absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ring-2 ring-bg ${id === 'bank' ? 'bg-warn text-bg' : 'bg-pink text-white'}`
              }
            >
              <span className={badge.dot ? 'sr-only' : ''} aria-hidden={badge.dot ? undefined : true}>{badge.dot ? badge.label : badge.text}</span>
              {!badge.dot && <span className="sr-only"> {badge.label}</span>}
            </span>
          )}
        </span>
        <span className="max-w-full truncate text-[12px] font-medium text-ink/95 drop-shadow" aria-hidden>
          {app.name}
        </span>
      </button>
    </li>
  );
}

function NowWidget({ state }: { state: GameState }) {
  const dispatch = useGame((g) => g.dispatch);
  const openApp = usePhone((p) => p.openApp);
  const minimized = usePhone((p) => p.sheetsMinimized);
  const unminimize = usePhone((p) => p.setSheetsMinimized);
  const act = state.activity;
  const tv = tvView(state);
  const waiting = minimized && (tv.callback || tv.roomEvent);

  if (waiting) {
    return (
      <Widget label="Now" className="ring-1 ring-tv/50">
        <p className="text-[11px] font-bold uppercase tracking-widest text-tv">Waiting on you</p>
        <p className="mt-0.5 font-semibold leading-snug">{tv.callback ? `Callback: ${tv.callback.showTitle}` : "Writers' room question"}</p>
        <p className="text-xs text-muted">Everything else waits until you answer.</p>
        <button type="button" onClick={() => unminimize(false)} className="mt-2 min-h-11 w-full rounded-xl bg-tv font-bold text-bg active:brightness-90">
          Open
        </button>
      </Widget>
    );
  }

  if (act) {
    const frac = Math.max(0, Math.min(1, (state.minute - act.startMinute) / Math.max(1, act.endMinute - act.startMinute)));
    return (
      <Widget label="Now">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-accent">Now</p>
            <p className="truncate font-semibold">
              <span className="sr-only">Busy: </span>
              {act.label}
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`${act.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}>
              <div className="h-full rounded-full bg-gradient-to-r from-accent to-pink" style={{ width: `${frac * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] tabular-nums text-muted">{duration(Math.max(0, act.endMinute - state.minute))} left</p>
          </div>
          <button
            type="button"
            aria-label="Skip to done"
            onClick={() => dispatch({ type: 'SKIP_TO_DONE' })}
            className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink shadow-[0_6px_16px_-6px_rgb(255_138_61/0.8)] active:brightness-90"
          >
            Skip
          </button>
        </div>
      </Widget>
    );
  }

  const p = state.player;
  const openGigs = state.board.filter((o) => o.status === 'open').length;
  const unread = inboxView(state).unread;
  const ideas: { text: string; app: AppId }[] = [];
  if (p.energy < 25) ideas.push({ text: 'Running on fumes: rest up', app: 'gigs' });
  if (unread > 0) ideas.push({ text: `${unread} unread on ${APPS.messages.name}`, app: 'messages' });
  if (openGigs > 0) ideas.push({ text: `${openGigs} breakdown${openGigs === 1 ? '' : 's'} on ${APPS.casting.name}`, app: 'casting' });
  ideas.push({ text: `Pick up a shift on ${APPS.gigs.name}`, app: 'gigs' });
  if (!state.project) ideas.push({ text: `Start something on ${APPS.studio.name}`, app: 'studio' });

  return (
    <Widget label="Now">
      <p className="text-sm font-semibold">
        <span className="mr-1.5 text-[11px] font-bold uppercase tracking-widest text-good">Free</span>
        Nothing booked. What&apos;s the move?
      </p>
      <ul className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 [mask-image:linear-gradient(90deg,#000_85%,transparent)]">
        {ideas.slice(0, 3).map((i) => (
          <li key={i.text} className="shrink-0">
            <button type="button" onClick={() => openApp(i.app)} className="min-h-11 rounded-full bg-white/10 px-3 text-xs font-semibold active:bg-white/20">
              {i.text}
            </button>
          </li>
        ))}
      </ul>
    </Widget>
  );
}

function StatsWidget({ state }: { state: GameState }) {
  const p = state.player;
  const tier = cloutTier(p.rp);
  const atMax = tier >= MAX_TIER;
  const next = atMax ? null : tierThreshold(tier + 1);
  const progress = tierProgress(p.rp);
  const burn = Math.round(p.burnout);
  return (
    <Widget label="Career stats">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-pink text-accent-ink shadow-[0_8px_20px_-8px_rgb(255_92_147/0.8)]">
          <span className="text-center leading-none">
            <span className="block text-[9px] font-bold uppercase tracking-wider">Clout</span>
            <span className="block font-[family-name:var(--font-display)] text-2xl font-black">{tier}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline justify-between text-xs">
            <span className="font-semibold">Clout Tier {tier}</span>
            <span className="tabular-nums text-muted">
              RP {Math.round(p.rp)} / {next === null ? 'max' : next}
            </span>
          </p>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={`Progress to Clout Tier ${atMax ? tier : tier + 1}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Network</dt>
              <dd className="text-sm font-bold tabular-nums">{Math.round(p.network)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Fans</dt>
              <dd className="text-sm font-bold tabular-nums text-music">
                <span aria-hidden>{compact(p.fans)}</span>
                <span className="sr-only">{count(p.fans)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-muted">Burnout</dt>
              <dd className={`text-sm font-bold tabular-nums ${burn >= 70 ? 'text-bad' : burn >= 40 ? 'text-warn' : ''}`}>{burn}</dd>
            </div>
          </dl>
        </div>
      </div>
      {p.creativeBurnout && <p className="mt-2 text-[11px] font-semibold text-bad">Creative Burnout: your muse has left the chat.</p>}
    </Widget>
  );
}

export function HomeScreen() {
  const state = useGame((g) => g.state);
  const openApp = usePhone((p) => p.openApp);
  if (!state) return null;
  const d = day(state.minute);
  const greeting = PHONE.greetings[(d - 1 + PHONE.greetings.length) % PHONE.greetings.length];
  const od = state.overdraft;

  return (
    <div className="home-in no-scrollbar h-full overflow-y-auto overscroll-contain px-3.5 pb-4 pt-1">
      <h1 className="sr-only">Home screen</h1>
      <div className="px-1 pb-2.5 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent/90">{LOCATIONS[state.player.location].name}</p>
        <p className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight">{greeting}</p>
      </div>

      {od && (
        <button
          type="button"
          onClick={() => openApp('bank')}
          className="mb-2.5 flex min-h-11 w-full items-center gap-2 rounded-2xl bg-bad/20 px-3 py-2 text-left ring-1 ring-bad/50"
        >
          <span aria-hidden className="text-lg">⚠️</span>
          <span className="min-w-0 flex-1 text-xs">
            <span className="block font-bold text-bad">Overdraft · {remaining(od.deadlineMinute - state.minute)} to get back to $0</span>
            <span className="text-ink/80">Cash {money(state.player.cash)}. Open {APPS.bank.name}.</span>
          </span>
        </button>
      )}

      <div className="flex flex-col gap-2.5">
        <NowWidget state={state} />
        <StatsWidget state={state} />
      </div>

      <nav aria-label="Apps" className="mt-3.5">
        <ul className="grid grid-cols-3 gap-y-2">
          {APP_ORDER.map((id) => (
            <AppTile key={id} id={id} state={state} />
          ))}
        </ul>
      </nav>
    </div>
  );
}
