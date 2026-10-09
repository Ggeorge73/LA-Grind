// Sprint 12 (LAG-94): the glass card at the bottom of the room. Idle line, the selected spot's actions
// (effects, time, disabled reasons, "coming soon"), the walk over, then the running activity with progress
// and "Skip to done". Out on the street it shows the district and the way home.
import { useEffect, useRef } from 'react';
import { homeView, type HotspotAction } from '../../sim/actions';
import { BUSY, HOME_FLAVOR, HOTSPOTS, STREET } from '../../sim/content/homeFlavor';
import { APPS } from '../../sim/content/phoneFlavor';
import { useGame } from '../../store/game';
import { usePhone } from '../../store/phone';
import { useRoom } from '../../store/room';
import { day, duration } from '../format';

function Chip({ text }: { text: string }) {
  const tone = /^\+/.test(text) || /better/i.test(text) ? 'text-good' : /^[−-]/.test(text) ? 'text-[#ff8f8f]' : 'text-ink';
  return <span className={`rounded-full bg-white/[0.08] px-2 py-1 text-[12px] leading-none ${tone}`}>{text}</span>;
}

const btn = 'min-h-11 rounded-xl px-4 text-sm font-bold transition active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100';
const primary = `${btn} bg-gradient-to-br from-accent to-pink text-[#1b1026]`;
const alt = `${btn} border border-white/15 bg-transparent font-semibold text-ink active:bg-white/10`;

function ActionRow({ a, onGo }: { a: HotspotAction; onGo: () => void }) {
  const disabled = a.disabledReason !== null;
  return (
    <li className="flex flex-col gap-1.5 border-t border-white/10 pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <Chip text={`⏱ ${duration(a.minutes)}`} />
          {a.effects.map((e) => (
            <Chip key={e} text={e} />
          ))}
        </div>
        <button type="button" className={`${primary} shrink-0`} disabled={disabled} onClick={onGo}>
          {a.label}
        </button>
      </div>
      {disabled && <p className="text-[12px] text-[#ff8f8f]">{a.disabledReason}</p>}
    </li>
  );
}

function Busy() {
  const state = useGame((g) => g.state);
  const dispatch = useGame((g) => g.dispatch);
  const origin = useRoom((r) => r.origin);
  if (!state?.activity) return null;
  const act = state.activity;
  const frac = Math.max(0, Math.min(1, (state.minute - act.startMinute) / Math.max(1, act.endMinute - act.startMinute)));
  const atHome = state.player.location === state.player.home;
  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight">
        <span className="sr-only">Busy: </span>
        {act.label}
      </h2>
      <p className="mt-1 text-[13px] leading-snug text-muted">
        {BUSY[act.kind] ?? act.label}
        {atHome && origin ? <span className="sr-only"> At the {HOTSPOTS[origin].name}.</span> : null}
      </p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={`${act.label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(frac * 100)}
      >
        <i className="block h-full bg-gradient-to-r from-accent to-pink" style={{ width: `${frac * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[12px] tabular-nums text-muted">{duration(Math.max(0, act.endMinute - state.minute))} left</span>
        <button type="button" className={`${alt} ml-auto`} onClick={() => dispatch({ type: 'SKIP_TO_DONE' })}>
          Skip to done
        </button>
      </div>
    </>
  );
}

function HomeCard() {
  const state = useGame((g) => g.state);
  const selected = useRoom((r) => r.selected);
  const pending = useRoom((r) => r.pending);
  const error = useRoom((r) => r.error);
  const select = useRoom((r) => r.select);
  const go = useRoom((r) => r.go);
  const openApp = usePhone((p) => p.openApp);
  const headRef = useRef<HTMLHeadingElement>(null);

  // Picking a spot from the Room actions list moves keyboard focus to its card.
  useEffect(() => {
    if (!selected) return;
    const a = document.activeElement;
    if (!a || a === document.body || a.closest('[data-room-actions]')) headRef.current?.focus({ preventScroll: true });
  }, [selected]);

  if (!state) return null;
  if (state.activity) return <Busy />;

  if (pending) {
    return (
      <>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight">{HOTSPOTS[pending.spot].name}</h2>
        <p className="mt-1 text-[13px] text-muted">
          On your way: {pending.label}…
        </p>
      </>
    );
  }

  if (!selected) {
    const flavor = HOME_FLAVOR[state.player.archetype];
    const d = day(state.minute);
    return (
      <>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight">
          Day {d} in {flavor.place}
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-muted">{flavor.idle[Math.abs(d) % flavor.idle.length]}</p>
        {error && <p className="mt-2 text-[12px] text-[#ff8f8f]">{error}</p>}
      </>
    );
  }

  const spot = homeView(state).hotspots.find((h) => h.id === selected);
  const info = HOTSPOTS[selected];
  const soonLine = spot?.soon ?? null;
  return (
    <>
      <h2 ref={headRef} tabIndex={-1} className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight outline-none">
        <span aria-hidden className="mr-1.5">
          {info.icon}
        </span>
        {info.name}
      </h2>
      <p className="mt-1 text-[13px] leading-snug text-muted">{info.blurb}</p>
      {error && <p className="mt-2 text-[12px] text-[#ff8f8f]">{error}</p>}
      {spot && spot.actions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2.5" aria-label={`${info.name} actions`}>
          {spot.actions.map((a) => (
            <ActionRow key={a.label} a={a} onGo={() => go(selected, a.command, a.label)} />
          ))}
        </ul>
      )}
      {(!spot || spot.actions.length === 0) && selected !== 'door' && soonLine && (
        <p className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2 text-[12px] leading-snug text-ink/85">{soonLine}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={alt} onClick={() => select(null)}>
          Not now
        </button>
        {selected === 'door' && (
          <button type="button" className={`${primary} ml-auto`} onClick={() => openApp('rides')}>
            Open {APPS.rides.name}
          </button>
        )}
      </div>
    </>
  );
}

function StreetCard() {
  const state = useGame((g) => g.state);
  const setOpen = usePhone((p) => p.setOpen);
  const goHome = usePhone((p) => p.goHome);
  const openApp = usePhone((p) => p.openApp);
  if (!state) return null;
  if (state.activity) return <Busy />;
  const street = STREET[state.player.location];
  return (
    <>
      <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold leading-tight tracking-tight">{street.heading}</h2>
      <p className="mt-1 text-[13px] leading-snug text-muted">{street.line}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className={alt}
          onClick={() => {
            goHome();
            setOpen(true);
          }}
        >
          Open phone
        </button>
        <button type="button" className={`${primary} ml-auto`} onClick={() => openApp('rides')}>
          Head home
        </button>
      </div>
    </>
  );
}

export function ActionCard({ atHome }: { atHome: boolean }) {
  return (
    <section
      aria-label={atHome ? 'Action card' : 'Street'}
      className="safe-bottom-card hud-glass absolute left-1/2 z-20 w-[min(420px,calc(100%-24px))] -translate-x-1/2 rounded-[20px] px-4 py-3.5"
    >
      {atHome ? <HomeCard /> : <StreetCard />}
    </section>
  );
}
