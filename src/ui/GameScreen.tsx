// PI-3 Sprint 12 (LAG-94): the 3D apartment is the game; the Sprint 11 phone is a pocket overlay over it
// (a sheet that slides up on phones, a device frame at the bottom right on tablet/desktop). Closed by default.
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent } from 'react';
import { bankView, tvView } from '../sim/actions';
import { PHONE, type AppId } from '../sim/content/phoneFlavor';
import type { GameState } from '../sim/types';
import { useGame } from '../store/game';
import { usePhone } from '../store/phone';
import { Notifications } from './phone/Notifications';
import { PhoneScreen } from './phone/Phone';
import { RunSummary } from './screens/RunSummary';
import { ActionCard } from './world/ActionCard';
import { HomeWorld, type HomeStatus } from './world/HomeWorld';
import { NeedsPanel, TopBar } from './world/Hud';
import { RoomActions } from './world/RoomActions';
import { Street } from './world/Street';

/** Where a screen can send the player: an app, or the phone's home screen. */
export type Tab = AppId | 'home';

const WIDE_QUERY = '(min-width: 900px)';
const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia(WIDE_QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE_QUERY).matches, () => false);

/** Drag distance (px) past which letting go lowers the phone. */
const LOWER_AT = 110;

function MobilePhone() {
  const open = usePhone((p) => p.open);
  const setOpen = usePhone((p) => p.setOpen);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef(0);
  const lowerRef = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);

  // Keyboard users keep their place (LAG-92): lowering makes the phone inert and raising unmounts "Open phone",
  // which would drop focus to <body>. Move it to the matching control instead.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = requestAnimationFrame(() => {
      const active = document.activeElement;
      // Only when focus was lost: on <body>, or still on a control that just went inert.
      if (active && active !== document.body && !active.closest('[inert]')) return;
      if (open) lowerRef.current?.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>('[data-open-phone]')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = e.clientY;
    setDrag(0);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag !== null) setDrag(Math.max(0, e.clientY - start.current));
  };
  const up = () => {
    if (drag !== null && drag > LOWER_AT) setOpen(false);
    setDrag(null);
  };

  const handle = (
    <div className="relative z-20 flex items-center justify-center pt-1.5">
      <div
        className="flex h-6 w-36 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-hidden
      >
        <span className="block h-1.5 w-12 rounded-full bg-white/30" />
      </div>
      <button
        ref={lowerRef}
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Lower phone"
        className="absolute right-2 top-0.5 grid min-h-11 min-w-11 place-items-center rounded-full text-muted active:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );

  const y = !open ? 'translateY(105%)' : drag ? `translateY(${drag}px)` : 'translateY(0)';
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-50 h-[88%] overflow-hidden rounded-t-[2.2rem] shadow-[0_-20px_50px_-10px_rgb(0_0_0/0.7)] ring-1 ring-white/10 ${drag ? '' : 'phone-sheet'}`}
      style={{ transform: y }}
      inert={!open}
      aria-label="Phone"
      role="group"
    >
      <PhoneScreen chrome={handle} />
    </div>
  );
}

function DesktopPhone() {
  const open = usePhone((p) => p.open);
  const setOpen = usePhone((p) => p.setOpen);
  // Clear of the HUD pill and the Room actions toggle; the brand line sits under the frame.
  const h = 'min(720px, calc(100dvh - 150px))';
  return (
    <div
      className="phone-sheet absolute bottom-9 right-5 z-50 xl:right-10"
      style={{ transform: open ? 'none' : 'translateY(calc(100% + 40px))' }}
      inert={!open}
    >
    <div className="relative shrink-0 rounded-[3.2rem] bg-gradient-to-b from-[#3a2d5c] via-[#1c1530] to-[#2d2348] p-[11px] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.85),inset_0_0_0_1px_rgb(255_255_255/0.12)]" style={{ height: h, width: `calc(${h} * 0.5)` }}>
      <span aria-hidden className="absolute -left-[3px] top-28 h-14 w-[3px] rounded-l bg-[#4a3a74]" />
      <span aria-hidden className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#4a3a74]" />
      <div role="group" aria-label="Phone" className="relative h-full overflow-hidden rounded-[2.5rem] bg-bg">
        <PhoneScreen
          chrome={
            <div className="relative flex h-7 items-start justify-center pt-1.5">
              <span aria-hidden className="flex h-5 w-24 items-center justify-end rounded-full bg-black pr-2.5">
                <span className="h-2 w-2 rounded-full bg-[#1d2440] ring-1 ring-[#2c3560]" />
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Lower phone"
                className="absolute right-3 top-0.5 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-white/10 active:bg-white/10"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          }
        />
      </div>
      <p className="absolute inset-x-0 -bottom-7 text-center text-[11px] tracking-widest text-white/35" aria-hidden>
        {PHONE.brand}
      </p>
    </div>
    </div>
  );
}

/** A callback or writers'-room question is waiting on the player. */
function hasPendingSheet(state: GameState | null): boolean {
  if (!state) return false;
  const tv = tvView(state);
  return tv.callback !== null || tv.roomEvent !== null;
}

/** The mobile sheet covers the room: stop rendering it once the slide-up has finished. */
function useCovered(open: boolean, wide: boolean): boolean {
  const [covered, setCovered] = useState(false);
  useEffect(() => {
    if (wide || !open) {
      setCovered(false);
      return;
    }
    const t = setTimeout(() => setCovered(true), 400);
    return () => clearTimeout(t);
  }, [open, wide]);
  return covered;
}

export function GameScreen() {
  const wide = useWide();
  const movedHome = useGame((g) => g.state?.status === 'movedHome');
  const pending = useGame((g) => hasPendingSheet(g.state));
  const atHome = useGame((g) => (g.state ? g.state.player.location === g.state.player.home : true));
  const overdraft = useGame((g) => (g.state ? bankView(g.state).overdraft !== null : false));
  const phoneOpen = usePhone((p) => p.open);
  const minimized = usePhone((p) => p.sheetsMinimized);
  const setOpen = usePhone((p) => p.setOpen);
  const setMinimized = usePhone((p) => p.setSheetsMinimized);
  const [home, setHome] = useState<HomeStatus>('loading');
  const covered = useCovered(phoneOpen, wide);

  // A callback / room question lives in the phone: raise it. Once nothing is pending, the next one opens normally.
  useEffect(() => {
    if (pending && !minimized) setOpen(true);
    if (!pending && minimized) setMinimized(false);
  }, [pending, minimized, setOpen, setMinimized]);

  // Escape puts the phone away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && usePhone.getState().open && !document.querySelector('[role=dialog]')) {
        setOpen(false);
        document.querySelector<HTMLElement>('[data-open-phone]')?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  return (
    <div className="relative h-full overflow-hidden bg-[#120d1f]" style={{ '--hud-extra': overdraft ? '38px' : '0px' } as CSSProperties}>
      <TopBar />
      {!phoneOpen && (
        <div className="hud-below pointer-events-none absolute inset-x-0 z-[45] mx-auto max-w-[440px]">
          <Notifications />
        </div>
      )}
      <main className="absolute inset-0" aria-label="World" inert={!wide && phoneOpen}>
        <HomeWorld shown={atHome} active={!covered} onStatus={setHome} />
        {!atHome && <Street />}
        {(wide || !phoneOpen) && <NeedsPanel />}
        {atHome && (wide || !phoneOpen) && <RoomActions fallback={home === 'fallback'} />}
        <ActionCard atHome={atHome} />
        {atHome && home === 'ready' && !phoneOpen && (
          <p aria-hidden className="pointer-events-none absolute bottom-5 right-4 z-10 hidden text-[11px] text-muted xl:block">
            Drag to turn the room · scroll to zoom
          </p>
        )}
      </main>
      {wide ? <DesktopPhone /> : <MobilePhone />}
      {movedHome && <RunSummary />}
    </div>
  );
}
