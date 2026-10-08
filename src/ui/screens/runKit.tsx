// Small helpers shared by the Projects screen and the Music business section.
import { useState } from 'react';
import type { Command } from '../../sim/types';
import { useGame } from '../../store/game';
import type { Tab } from '../GameScreen';
import { Button } from '../kit';

/** Disabled reasons that are solved by travelling somewhere get a Map shortcut. */
export const needsTravel = (reason: string) => /takes meetings in|the set is in|report to set in/i.test(reason) || / is in [A-Z]/.test(reason);

/** Runs a command and keeps the rejection reason next to the button that caused it. */
export function useRun() {
  const dispatch = useGame((g) => g.dispatch);
  const [error, setError] = useState<string | null>(null);
  return { error, run: (cmd: Command) => setError(dispatch(cmd)) };
}

export function Reason({ id, text, error }: { id: string; text: string | null; error?: string | null }) {
  const shown = text ?? error ?? null;
  if (!shown) return null;
  return (
    <p id={id} className={`mt-1 text-xs ${text ? 'text-warn' : 'text-bad'}`} role={text ? undefined : 'status'}>
      {shown}
    </p>
  );
}

/** A reason line, plus a Map shortcut when the fix is "go somewhere". */
export function ReasonWithMap({ id, text, error, onNavigate }: { id: string; text: string | null; error: string | null; onNavigate: (tab: Tab) => void }) {
  if (!text && !error) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <Reason id={id} text={text} error={error} />
      {text && needsTravel(text) && (
        <Button variant="ghost" className="shrink-0" onClick={() => onNavigate('map')}>
          Map
        </Button>
      )}
    </div>
  );
}

/** A 0–1 share as a whole percent ("30%"). Display only. */
export const wholePct = (share: number): string => `${Math.round(share * 100)}%`;
