import { useState, type KeyboardEvent } from 'react';
import type { Tab } from '../GameScreen';
import { useGame } from '../../store/game';
import { travelOptions, type TravelOption } from '../../sim/actions';
import * as C from '../../sim/constants';
import { LOCATIONS, LOCATION_IDS } from '../../sim/content/locations';
import { ROUTE_TABLE } from '../../sim/content/travel';
import { hourOf, trafficMultiplier } from '../../sim/formulas';
import type { LocationId } from '../../sim/types';
import { Button, Chip, SectionTitle, Sheet } from '../kit';
import { duration, money } from '../format';

/** Hit radius in viewBox units: ≥ 44px once the map is ~320px wide. */
const HIT_R = 7.5;
const NODE_R = 3.6;
/** "You are here" pill size in viewBox units: opaque so it stays legible over route lines. */
const PILL_W = 21;
const PILL_H = 4.6;

interface Badge {
  text: string;
  tone: 'warn' | 'bad' | 'muted';
}

/** Turn a quote into human-readable slowdown badges (text, never colour alone). */
function badgesFor(opt: TravelOption, hour: number): Badge[] {
  const q = opt.quote;
  const out: Badge[] = [];
  const traffic = trafficMultiplier(hour, q.crosses405);
  if (q.crosses405 && traffic === C.RUSH_405_MULTIPLIER) out.push({ text: `405 at rush ×${C.RUSH_405_MULTIPLIER}`, tone: 'bad' });
  else if (traffic === C.RUSH_MULTIPLIER) out.push({ text: `Rush hour ×${C.RUSH_MULTIPLIER}`, tone: 'warn' });
  else if (traffic === C.MIDDAY_MULTIPLIER) out.push({ text: `Midday ×${C.MIDDAY_MULTIPLIER}`, tone: 'muted' });
  if (q.byBus) out.push({ text: `Bus (car dead) ×${C.BUS_MULTIPLIER}`, tone: 'bad' });
  else if (traffic > 0 && Math.abs(q.multiplier / traffic - C.CAR_POOR_MULTIPLIER) < 1e-6)
    out.push({ text: `Weak car ×${C.CAR_POOR_MULTIPLIER}`, tone: 'warn' });
  return out;
}

/** Surface-coloured outline behind label glyphs so route lines don't cut through them. */
const HALO = { strokeWidth: 0.9, strokeLinejoin: 'round', paintOrder: 'stroke' } as const;

const quoteLabel = (o: TravelOption) =>
  `${duration(o.quote.minutes)}, ${o.quote.energy} energy, ${money(o.quote.gas)} gas`;

export function MapScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  const dispatch = useGame((g) => g.dispatch);
  const [selected, setSelected] = useState<LocationId | null>(null);
  const [focused, setFocused] = useState<LocationId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;

  const here = state.player.location;
  const hour = hourOf(state.minute);
  const options = [...travelOptions(state)].sort((a, b) => a.quote.minutes - b.quote.minutes);
  const byId = new Map(options.map((o) => [o.to, o]));
  const sel = selected ? byId.get(selected) ?? null : null;

  const open = (id: LocationId) => {
    setError(null);
    setSelected(id);
  };
  const close = () => {
    setSelected(null);
    setError(null);
  };
  const go = () => {
    if (!sel) return;
    const reason = dispatch({ type: 'TRAVEL', to: sel.to });
    if (reason) {
      setError(reason);
      return;
    }
    close();
    onNavigate('hustle');
  };
  const onKey = (id: LocationId) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(id);
    }
  };

  const crossing = ROUTE_TABLE.filter((r) => r[3]);
  const label405 =
    crossing.length > 0
      ? {
          x: crossing.reduce((s, r) => s + (LOCATIONS[r[0]].x + LOCATIONS[r[1]].x) / 2, 0) / crossing.length,
          y: crossing.reduce((s, r) => s + (LOCATIONS[r[0]].y + LOCATIONS[r[1]].y) / 2, 0) / crossing.length,
        }
      : null;

  const anchorFor = (x: number): 'start' | 'middle' | 'end' => (x < 20 ? 'start' : x > 80 ? 'end' : 'middle');
  const textX = (x: number) => (x < 20 ? x - NODE_R : x > 80 ? x + NODE_R : x);

  return (
    <div>
      <h1 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Greater Los Angeles (abridged)</h1>
      <div className="rounded-2xl border border-line bg-surface p-1">
        <svg
          viewBox="0 0 100 100"
          className="mx-auto block aspect-square max-h-[55vh] w-full"
          role="group"
          aria-label={`Map. You are in ${LOCATIONS[here].name}.`}
        >
          {ROUTE_TABLE.map(([a, b, , crosses405]) => {
            const A = LOCATIONS[a];
            const B = LOCATIONS[b];
            const touchesHere = a === here || b === here;
            return (
              <line
                key={`${a}-${b}`}
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                className={touchesHere ? 'stroke-muted' : 'stroke-line'}
                strokeWidth={touchesHere ? 0.7 : 0.45}
                strokeDasharray={crosses405 ? '2 1.4' : undefined}
                strokeLinecap="round"
                aria-hidden
              />
            );
          })}

          {label405 && (
            <g aria-hidden>
              <rect x={label405.x - 4.5} y={label405.y - 2.6} width={9} height={5.2} rx={1.2} className="fill-surface-2 stroke-warn" strokeWidth={0.35} />
              <text x={label405.x} y={label405.y + 1.3} textAnchor="middle" fontSize={3.4} fontWeight={700} className="fill-warn">
                405
              </text>
            </g>
          )}

          {LOCATION_IDS.map((id) => {
            const L = LOCATIONS[id];
            const isHere = id === here;
            const anchor = anchorFor(L.x);
            const tx = textX(L.x);
            const below = L.y < 90;
            const nameY = below ? L.y + NODE_R + 4.2 : L.y - NODE_R - 1.6;

            if (isHere) {
              // Pill above the node (route lines leave NoHo et al. sideways/down), below if there's no room or the name sits above.
              const pillAbove = below && L.y - NODE_R - 1.6 - PILL_H >= 1;
              const pillY = pillAbove ? L.y - NODE_R - 1.8 - PILL_H : (below ? nameY + 1.4 : L.y + NODE_R + 1.8);
              const pillX = Math.min(100 - PILL_W / 2 - 1, Math.max(PILL_W / 2 + 1, L.x));
              return (
                <g key={id} aria-label={`You are here: ${L.name}`} role="img">
                  <circle cx={L.x} cy={L.y} r={NODE_R + 1.6} className="fill-accent/25" />
                  <circle cx={L.x} cy={L.y} r={NODE_R} className="fill-accent stroke-ink" strokeWidth={0.5} />
                  <text x={tx} y={nameY} textAnchor={anchor} fontSize={3.6} fontWeight={700} className="fill-ink stroke-surface" {...HALO}>
                    {L.short}
                  </text>
                  <rect x={pillX - PILL_W / 2} y={pillY} width={PILL_W} height={PILL_H} rx={PILL_H / 2} className="fill-accent" />
                  <text x={pillX} y={pillY + PILL_H / 2 + 1.05} textAnchor="middle" fontSize={2.9} fontWeight={700} className="fill-accent-ink">
                    You are here
                  </text>
                </g>
              );
            }

            const opt = byId.get(id);
            const isFocused = focused === id;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={opt ? `Travel to ${L.name}: ${quoteLabel(opt)}` : `Travel to ${L.name}`}
                onClick={() => open(id)}
                onKeyDown={onKey(id)}
                onFocus={() => setFocused(id)}
                onBlur={() => setFocused((f) => (f === id ? null : f))}
                className="cursor-pointer outline-none"
              >
                <circle cx={L.x} cy={L.y} r={HIT_R} fill="transparent" />
                {isFocused && <circle cx={L.x} cy={L.y} r={NODE_R + 2} fill="none" className="stroke-accent" strokeWidth={0.7} />}
                <circle cx={L.x} cy={L.y} r={NODE_R} className="fill-surface-2 stroke-muted" strokeWidth={0.5} />
                <text x={tx} y={nameY} textAnchor={anchor} fontSize={3.6} className="fill-ink stroke-surface" {...HALO}>
                  {L.short}
                </text>
                {opt && (
                  <text x={tx} y={below ? nameY + 3.4 : nameY - 3.6} textAnchor={anchor} fontSize={2.7} className="fill-muted stroke-surface" {...HALO}>
                    {duration(opt.quote.minutes)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-1 text-[11px] text-muted">Dashed lines cross the 405. Godspeed.</p>

      <SectionTitle>Where to?</SectionTitle>
      <ul className="flex flex-col gap-2">
        {options.map((o) => {
          const badges = badgesFor(o, hour);
          return (
            <li key={o.to}>
              <button
                type="button"
                onClick={() => open(o.to)}
                aria-label={`Travel to ${o.name}: ${quoteLabel(o)}${badges.length ? `. ${badges.map((b) => b.text).join(', ')}` : ''}`}
                className="block min-h-11 w-full rounded-2xl border border-line bg-surface p-3 text-left active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
              >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{o.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{duration(o.quote.minutes)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span>−{o.quote.energy} Energy</span>
                    <span>{o.quote.byBus ? 'No gas (bus)' : `${money(o.quote.gas)} gas`}</span>
                    {badges.map((b) => (
                      <Chip key={b.text} tone={b.tone}>
                        {b.text}
                      </Chip>
                    ))}
                  </div>
              </button>
            </li>
          );
        })}
      </ul>

      {sel && (
        <Sheet title={`Travel to ${sel.name}?`} onClose={close}>
          <p className="text-sm italic text-muted">{LOCATIONS[sel.to].blurb}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-2 py-2">
              <dt className="text-[11px] text-muted">Time</dt>
              <dd className="font-semibold tabular-nums">{duration(sel.quote.minutes)}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 py-2">
              <dt className="text-[11px] text-muted">Energy</dt>
              <dd className="font-semibold tabular-nums">−{sel.quote.energy}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 py-2">
              <dt className="text-[11px] text-muted">Gas</dt>
              <dd className="font-semibold tabular-nums">{sel.quote.byBus ? 'Bus' : money(sel.quote.gas)}</dd>
            </div>
          </dl>
          {badgesFor(sel, hour).length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-3 text-xs">
              {badgesFor(sel, hour).map((b) => (
                <Chip key={b.text} tone={b.tone}>
                  {b.text}
                </Chip>
              ))}
            </p>
          )}
          {(sel.disabledReason || error) && (
            <p role="alert" className="mt-3 rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-sm text-bad">
              <span className="font-semibold">Can't go: </span>
              {error ?? sel.disabledReason}
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" onClick={go} disabled={!!sel.disabledReason} autoFocus>
              Go
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
