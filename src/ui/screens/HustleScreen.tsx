import { useState, type ReactNode } from 'react';
import { listActions, tvView, type ActionOption } from '../../sim/actions';
import { LOCATIONS } from '../../sim/content/locations';
import { APPS } from '../../sim/content/phoneFlavor';
import { useGame } from '../../store/game';
import { duration } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card, Chip, SectionTitle } from '../kit';
import { YourShowCard } from './tvKit';

export const RIDESHARE_HOURS = [1, 2, 4, 6, 8] as const;
const SLEEP_HOURS = [1, 4, 6, 8, 10] as const;

const GROUPS: { id: ActionOption['group']; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'rest', label: 'Rest & recharge' },
  { id: 'grow', label: 'Level up' },
];

export function HoursPicker({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (h: number) => void;
}) {
  return (
    <div role="group" aria-label={label} className="mt-2 flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs text-muted">{label}:</span>
      {options.map((h) => (
        <button
          key={h}
          type="button"
          aria-pressed={value === h}
          onClick={() => onChange(h)}
          className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm tabular-nums ${
            value === h ? 'border-accent bg-accent/15 font-semibold text-accent' : 'border-line bg-surface-2 text-ink'
          }`}
        >
          {h}h
        </button>
      ))}
    </div>
  );
}

export function ActionCard({
  option,
  picker,
}: {
  option: ActionOption;
  picker?: ReactNode;
}) {
  const dispatch = useGame((g) => g.dispatch);
  const [error, setError] = useState<string | null>(null);
  const reasonId = `${option.id}-reason`;
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 font-semibold leading-snug">{option.title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-muted" aria-label={`Takes ${duration(option.minutes)}`}>
          {duration(option.minutes)}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">{option.detail}</p>
      {(option.costs.length > 0 || option.rewards.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {option.costs.length > 0 && <span className="text-xs text-muted">Costs:</span>}
          {option.costs.map((c) => (
            <Chip key={c} tone="bad">
              {c}
            </Chip>
          ))}
          {option.rewards.length > 0 && <span className="text-xs text-muted">Rewards:</span>}
          {option.rewards.map((r) => (
            <Chip key={r} tone="good">
              {r}
            </Chip>
          ))}
        </div>
      )}
      {picker}
      <div className="mt-2">
        <Button
          variant="primary"
          className="w-full"
          disabled={option.disabledReason !== null}
          aria-describedby={option.disabledReason || error ? reasonId : undefined}
          aria-label={`Start ${option.title}`}
          onClick={() => setError(dispatch(option.command))}
        >
          Start
        </Button>
        {(option.disabledReason || error) && (
          <p id={reasonId} className="mt-1 text-xs text-warn" role={error ? 'status' : undefined}>
            {option.disabledReason ?? error}
          </p>
        )}
      </div>
    </Card>
  );
}

export function HustleScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  const [rideshareHours, setRideshareHours] = useState(4);
  const [sleepHours, setSleepHours] = useState(8);
  if (!state) return null;

  const location = LOCATIONS[state.player.location];
  const actions = listActions(state, rideshareHours, sleepHours);
  const show = tvView(state).contract;

  const pickerFor = (o: ActionOption) => {
    if (o.command.type === 'START_JOB' && o.command.hours !== undefined) {
      return <HoursPicker label="Hours to drive" options={RIDESHARE_HOURS} value={rideshareHours} onChange={setRideshareHours} />;
    }
    if (o.command.type === 'SLEEP') {
      return <HoursPicker label="Hours to sleep" options={SLEEP_HOURS} value={sleepHours} onChange={setSleepHours} />;
    }
    return undefined;
  };

  return (
    <div>
      <header className="mb-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Daily Hustle · {location.name}</h2>
        <p className="text-sm text-muted">{location.blurb}</p>
      </header>

      {show && <YourShowCard contract={show} onNavigate={onNavigate} idPrefix="hustle" />}

      {GROUPS.map((g) => {
        const items = actions.filter((a) => a.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id} aria-label={g.label}>
            <SectionTitle>{g.label}</SectionTitle>
            <ul className="flex flex-col gap-2">
              {items.map((o) => (
                <li key={o.id}>
                  <ActionCard option={o} picker={pickerFor(o)} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button onClick={() => onNavigate('casting')}>Open {APPS.casting.name}</Button>
        <Button onClick={() => onNavigate('rides')}>Open {APPS.rides.name}</Button>
      </div>
    </div>
  );
}
