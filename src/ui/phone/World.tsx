// The "world" layer (placeholder for the Sprint 12 3D city): a sky that follows the game clock,
// a neighbourhood skyline, where you are and what you're doing.
import { useMemo } from 'react';
import { MINUTES_PER_DAY } from '../../sim/constants';
import { LOCATIONS } from '../../sim/content/locations';
import type { LocationId } from '../../sim/types';
import { useGame } from '../../store/game';
import { usePhone } from '../../store/phone';
import { clock, day, duration, money } from '../format';
import { SpeedControl } from './StatusBar';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Sky stops by hour: [hour, top, middle, horizon]. */
const SKY: [number, string, string, string][] = [
  [0, '#070614', '#120c2e', '#2a1440'],
  [5, '#0d0b2a', '#2a1a4f', '#5a2a5a'],
  [6.5, '#2b2a6b', '#c4527a', '#ffb36b'],
  [8, '#3d6fb0', '#7fa7d6', '#f3c79a'],
  [12, '#2f6fc0', '#6ea8e0', '#cfe3f2'],
  [16, '#3a64a8', '#8aa6d0', '#f6c08a'],
  [18.5, '#3b2a6e', '#d4587a', '#ffa24c'],
  [20, '#1a1440', '#4a2463', '#a8456a'],
  [22, '#0b0a22', '#1a1238', '#3a1a4a'],
  [24, '#070614', '#120c2e', '#2a1440'],
];

function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * t)).join(' ')})`;
}

function skyAt(hour: number): { top: string; mid: string; low: string; night: number } {
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1]![0] <= hour) i++;
  const [h0, t0, m0, l0] = SKY[i]!;
  const [h1, t1, m1, l1] = SKY[i + 1]!;
  const t = Math.max(0, Math.min(1, (hour - h0) / (h1 - h0)));
  // 1 at deep night, 0 in daylight.
  const night = hour < 5 || hour >= 21 ? 1 : hour < 7 ? (7 - hour) / 2 : hour >= 19 ? (hour - 19) / 2 : 0;
  return { top: mix(t0, t1, t), mid: mix(m0, m1, t), low: mix(l0, l1, t), night };
}

/** Deterministic skyline per neighbourhood. */
function skyline(loc: LocationId) {
  let seed = [...loc].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const low = loc === 'santamonica' || loc === 'silverlake';
  const tall = loc === 'burbank' || loc === 'hollywood';
  const buildings: { x: number; w: number; h: number; windows: { x: number; y: number }[] }[] = [];
  let x = -2;
  while (x < 400) {
    const w = 14 + rnd() * 26;
    const h = (low ? 18 : 26) + rnd() * (tall ? 90 : low ? 34 : 58);
    const windows: { x: number; y: number }[] = [];
    for (let wy = 160 - h + 6; wy < 154; wy += 7) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (rnd() < 0.35) windows.push({ x: wx, y: wy });
    buildings.push({ x, w, h, windows });
    x += w + rnd() * 6;
  }
  const palms = Array.from({ length: low ? 6 : 4 }, () => ({ x: 10 + rnd() * 380, h: 40 + rnd() * 34 }));
  return { buildings, palms, ocean: loc === 'santamonica' };
}

function Skyline({ loc, night }: { loc: LocationId; night: number }) {
  const s = useMemo(() => skyline(loc), [loc]);
  return (
    <svg viewBox="0 0 400 160" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[42%] w-full" aria-hidden>
      <defs>
        <linearGradient id="hill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1b1235" />
          <stop offset="1" stopColor="#0b0716" />
        </linearGradient>
      </defs>
      <path d="M0 110 C60 70 120 92 170 80 S280 60 330 84 400 90 400 90 V160 H0Z" fill="url(#hill)" opacity={0.75} />
      {s.ocean && <rect x="0" y="146" width="400" height="14" fill="#123a5a" opacity={0.8} />}
      {s.buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={160 - b.h} width={b.w} height={b.h} fill="#0d0a1c" />
          {b.windows.map((w, j) => (
            <rect key={j} x={w.x} y={w.y} width={2.6} height={3} fill="#ffcf7a" opacity={0.15 + night * 0.75} />
          ))}
        </g>
      ))}
      {s.palms.map((p, i) => (
        <g key={i} fill="#0a0716" stroke="#0a0716">
          <path d={`M${p.x} 160 q2 ${-p.h / 2} ${3} ${-p.h}`} strokeWidth={2} fill="none" />
          <path
            d={`M${p.x + 3} ${160 - p.h} q-12 -2 -16 8 q8 -8 16 -8 q-6 -10 -16 -8 q10 -2 16 8 q4 -10 14 -10 q-10 4 -14 10 q10 -4 16 6 q-8 -6 -16 -6z`}
            strokeWidth={1.2}
          />
        </g>
      ))}
    </svg>
  );
}

export function World({ wide }: { wide: boolean }) {
  const state = useGame((g) => g.state);
  const dispatch = useGame((g) => g.dispatch);
  const phoneOpen = usePhone((p) => p.open);
  const setOpen = usePhone((p) => p.setOpen);
  if (!state) return null;

  const p = state.player;
  const loc = LOCATIONS[p.location];
  const hour = (state.minute % MINUTES_PER_DAY) / 60;
  const sky = skyAt(hour);
  const sunUp = hour >= 6 && hour < 19.5;
  // Sun / moon arc across the sky.
  const arcT = sunUp ? (hour - 6) / 13.5 : ((hour + 24 - 19.5) % 24) / 10.5;
  const bodyX = 8 + arcT * 84;
  const bodyY = 46 - Math.sin(arcT * Math.PI) * 34;
  const act = state.activity;
  const frac = act ? Math.max(0, Math.min(1, (state.minute - act.startMinute) / Math.max(1, act.endMinute - act.startMinute))) : 0;
  const lowered = !wide && !phoneOpen;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 55%, ${sky.low} 100%)` }}>
      {/* stars */}
      <div aria-hidden className="absolute inset-0" style={{ opacity: sky.night }}>
        {Array.from({ length: 40 }, (_, i) => (
          <span
            key={i}
            className="twinkle absolute h-[2px] w-[2px] rounded-full bg-white"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 55}%`, animationDelay: `${(i % 7) * 0.45}s` }}
          />
        ))}
      </div>
      {/* sun / moon */}
      <span
        aria-hidden
        className="absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: `${bodyX}%`,
          top: `${bodyY}%`,
          background: sunUp ? 'radial-gradient(circle, #fff3c4 0%, #ffb347 45%, rgb(255 138 61 / 0) 70%)' : 'radial-gradient(circle, #f4f1ff 0%, #c9c2ff 38%, rgb(201 194 255 / 0) 66%)',
          width: sunUp ? 96 : 64,
          height: sunUp ? 96 : 64,
        }}
      />
      <Skyline loc={p.location} night={sky.night} />

      {/* slim status strip (always visible above the phone on mobile) */}
      <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 pb-1 text-white">
        <p className="flex min-w-0 items-baseline gap-2 text-sm drop-shadow-[0_1px_2px_rgb(0_0_0/0.6)]">
          <span className="truncate font-bold">📍 {loc.short}</span>
          <span className="shrink-0 tabular-nums text-white/85">
            Day {day(state.minute)} · {clock(state.minute)}
          </span>
        </p>
        {lowered && <SpeedControl />}
      </div>

      {(wide || lowered) && (
        <div className={`absolute inset-x-0 flex flex-col gap-3 px-4 ${wide ? 'top-1/2 mx-auto max-w-md -translate-y-1/2' : 'top-[4.5rem]'}`}>
          <section aria-label="Where you are" className="rounded-[1.6rem] bg-black/35 p-4 text-white ring-1 ring-white/15 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">You are in</p>
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-black leading-tight">{loc.name}</h2>
            <p className="mt-1 text-sm text-white/80">{loc.blurb}</p>
            <p className="mt-2 text-xs text-white/70">
              Cash <span className={`font-bold tabular-nums ${p.cash < 0 ? 'text-[#ffb3c1]' : 'text-white'}`}>{money(p.cash)}</span> · Energy{' '}
              <span className="font-bold tabular-nums text-white">{Math.round(p.energy)}</span>
            </p>
          </section>

          <section aria-label="Current activity" className="rounded-[1.6rem] bg-black/35 p-4 text-white ring-1 ring-white/15 backdrop-blur-md">
            {act ? (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    <span className="sr-only">Busy: </span>
                    {act.label}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={`${act.label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(frac * 100)}>
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-pink" style={{ width: `${frac * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-white/70">{duration(Math.max(0, act.endMinute - state.minute))} left</p>
                </div>
                <button type="button" aria-label="Skip to done" onClick={() => dispatch({ type: 'SKIP_TO_DONE' })} className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink active:brightness-90">
                  Skip
                </button>
              </div>
            ) : (
              <p className="text-sm">
                <span className="font-semibold">Free.</span> <span className="text-white/75">The city is yours. Check your phone.</span>
              </p>
            )}
          </section>
        </div>
      )}

      {lowered && (
        <div className="safe-bottom absolute inset-x-0 bottom-0 flex justify-center px-6 pb-6">
          <button
            type="button"
            data-open-phone
            onClick={() => setOpen(true)}
            className="flex min-h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-pink text-base font-bold text-accent-ink shadow-[0_12px_30px_-8px_rgb(255_92_147/0.8)] active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
              <rect x="6" y="2.5" width="12" height="19" rx="3" />
              <path d="M10 18.5h4" strokeLinecap="round" />
            </svg>
            Open phone
          </button>
        </div>
      )}
    </div>
  );
}
