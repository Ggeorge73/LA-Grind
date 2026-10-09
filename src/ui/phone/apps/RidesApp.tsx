// Rides app (LAG-90): where you are, the map + destinations (MapScreen), and rideshare driving (the job).
import { useState } from 'react';
import { listActions } from '../../../sim/actions';
import { CAR_POOR_THRESHOLD } from '../../../sim/constants';
import { LOCATIONS } from '../../../sim/content/locations';
import { useGame } from '../../../store/game';
import type { Tab } from '../../GameScreen';
import { SectionTitle } from '../../kit';
import { ActionCard, HoursPicker, RIDESHARE_HOURS } from '../../screens/HustleScreen';
import { MapScreen } from '../../screens/MapScreen';

export function RidesApp({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  const [hours, setHours] = useState(4);
  if (!state) return null;
  const p = state.player;
  const here = LOCATIONS[p.location];
  const car = Math.round(p.carHealth);
  const bus = car <= 0;
  const rideshare = listActions(state, hours).find((a) => a.command.type === 'START_JOB' && a.command.hours !== undefined);

  return (
    <div>
      <section aria-label="Current location" className="mb-3 flex items-center gap-3 rounded-[1.4rem] bg-white/[0.06] p-3 ring-1 ring-white/10">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/20 text-xl ring-1 ring-accent/50" aria-hidden>
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">You are in</p>
          <p className="truncate font-bold">{here.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted">{bus ? 'Car dead · bus' : 'Car health'}</p>
          <p className={`font-bold tabular-nums ${bus ? 'text-bad' : car < CAR_POOR_THRESHOLD ? 'text-warn' : 'text-good'}`}>{bus ? '🚌' : `${car}/100`}</p>
        </div>
      </section>

      <MapScreen onNavigate={onNavigate} />

      {rideshare && (
        <section aria-label="Drive for rideshare">
          <SectionTitle>Drive for rideshare</SectionTitle>
          <ActionCard option={rideshare} picker={<HoursPicker label="Hours to drive" options={RIDESHARE_HOURS} value={hours} onChange={setHours} />} />
        </section>
      )}
    </div>
  );
}
