// Settings app (LAG-90): game speed, new run, about, and the activity log.
import { useState } from 'react';
import { ARCHETYPES } from '../../../sim/content/archetypes';
import { PHONE } from '../../../sim/content/phoneFlavor';
import { useGame } from '../../../store/game';
import { usePhone } from '../../../store/phone';
import { Button, SectionTitle, Sheet } from '../../kit';
import { LogScreen } from '../../screens/LogScreen';
import { SpeedControl } from '../StatusBar';

export function SettingsApp() {
  const archetype = useGame((g) => g.state?.player.archetype);
  const abandon = useGame((g) => g.abandonRun);
  const resetPhone = usePhone((p) => p.reset);
  const [confirm, setConfirm] = useState(false);

  return (
    <div>
      <SectionTitle>Game speed</SectionTitle>
      <div className="rounded-[1.4rem] bg-white/[0.06] p-2 ring-1 ring-white/10">
        <SpeedControl large />
        <p className="mt-1.5 px-1 text-[11px] text-muted">Pause any time. Rent still lands at 06:00.</p>
      </div>

      <SectionTitle>This run</SectionTitle>
      <div className="rounded-[1.4rem] bg-white/[0.06] p-3 ring-1 ring-white/10">
        <p className="text-sm">
          Playing as <span className="font-semibold">{archetype ? ARCHETYPES[archetype].name : '—'}</span>.
        </p>
        <Button variant="danger" className="mt-2 w-full" onClick={() => setConfirm(true)}>
          New run
        </Button>
      </div>

      <SectionTitle>About</SectionTitle>
      <div className="rounded-[1.4rem] bg-white/[0.06] p-3 text-sm ring-1 ring-white/10">
        <p className="font-semibold">{PHONE.brand}</p>
        <p className="text-xs text-muted">LA Grind 0.1 · Pay rent. Chase the dream. Try not to move back home.</p>
        <p className="mt-1 text-xs text-muted">Every app, person, bank and guild in here is made up.</p>
      </div>

      <div className="mt-4">
        <LogScreen />
      </div>

      {confirm && (
        <Sheet title="Start a new run?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-muted">This run ends now and its save is deleted. You pick a new origin story.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button onClick={() => setConfirm(false)} autoFocus>
              Keep playing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetPhone();
                void abandon();
              }}
            >
              End run
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
