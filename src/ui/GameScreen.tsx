// PI-3 Sprint 11 (LAG-89): the phone OS. A full-screen world with the in-game phone over it
// (a raised sheet on phones, a pinned device frame on tablet/desktop).
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { tvView } from '../sim/actions';
import { PHONE, type AppId } from '../sim/content/phoneFlavor';
import type { GameState } from '../sim/types';
import { useGame } from '../store/game';
import { usePhone } from '../store/phone';
import { Notifications } from './phone/Notifications';
import { PhoneScreen } from './phone/Phone';
import { World } from './phone/World';
import { RunSummary } from './screens/RunSummary';

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
      className={`absolute inset-x-0 bottom-0 h-[92%] overflow-hidden rounded-t-[2.2rem] shadow-[0_-20px_50px_-10px_rgb(0_0_0/0.7)] ring-1 ring-white/10 ${drag ? '' : 'phone-sheet'}`}
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
  return (
    <div className="relative shrink-0 rounded-[3.2rem] bg-gradient-to-b from-[#3a2d5c] via-[#1c1530] to-[#2d2348] p-[11px] shadow-[0_40px_80px_-20px_rgb(0_0_0/0.85),inset_0_0_0_1px_rgb(255_255_255/0.12)]" style={{ height: 'min(800px, calc(100dvh - 40px))', width: 'calc(min(800px, calc(100dvh - 40px)) * 0.5)' }}>
      <span aria-hidden className="absolute -left-[3px] top-28 h-14 w-[3px] rounded-l bg-[#4a3a74]" />
      <span aria-hidden className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r bg-[#4a3a74]" />
      <div role="group" aria-label="Phone" className="relative h-full overflow-hidden rounded-[2.5rem] bg-bg">
        <PhoneScreen
          chrome={
            <div className="flex h-7 items-start justify-center pt-1.5" aria-hidden>
              <span className="flex h-5 w-24 items-center justify-end rounded-full bg-black pr-2.5">
                <span className="h-2 w-2 rounded-full bg-[#1d2440] ring-1 ring-[#2c3560]" />
              </span>
            </div>
          }
        />
      </div>
      <p className="absolute inset-x-0 -bottom-7 text-center text-[11px] tracking-widest text-white/35" aria-hidden>
        {PHONE.brand}
      </p>
    </div>
  );
}

/** A callback or writers'-room question is waiting on the player. */
function hasPendingSheet(state: GameState | null): boolean {
  if (!state) return false;
  const tv = tvView(state);
  return tv.callback !== null || tv.roomEvent !== null;
}

export function GameScreen() {
  const wide = useWide();
  const movedHome = useGame((g) => g.state?.status === 'movedHome');
  const pending = useGame((g) => hasPendingSheet(g.state));
  const phoneOpen = usePhone((p) => p.open);
  const minimized = usePhone((p) => p.sheetsMinimized);
  const setOpen = usePhone((p) => p.setOpen);
  const setMinimized = usePhone((p) => p.setSheetsMinimized);

  // A callback / room question lives in the phone: raise it. Once nothing is pending, the next one opens normally.
  useEffect(() => {
    if (pending && !minimized) setOpen(true);
    if (!pending && minimized) setMinimized(false);
  }, [pending, minimized, setOpen, setMinimized]);

  if (wide) {
    return (
      <div className="relative flex h-full overflow-hidden">
        <main className="relative min-w-0 flex-1" aria-label="World">
          <World wide />
        </main>
        <div className="relative z-10 flex items-center justify-center bg-gradient-to-l from-black/40 to-transparent px-10 pb-6 xl:px-16">
          <DesktopPhone />
        </div>
        {movedHome && <RunSummary />}
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      <main className="absolute inset-0" aria-label="World" inert={phoneOpen}>
        <World wide={false} />
      </main>
      {!phoneOpen && <Notifications className="safe-top absolute inset-x-0 top-10" />}
      <MobilePhone />
      {movedHome && <RunSummary />}
    </div>
  );
}
