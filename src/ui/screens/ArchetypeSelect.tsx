import { useGame } from '../../store/game';
import { NEW_RUN_NETWORK_KEEP } from '../../sim/constants';
import { ARCHETYPES, ARCHETYPE_IDS } from '../../sim/content/archetypes';
import { LOCATIONS } from '../../sim/content/locations';
import { PHONE } from '../../sim/content/phoneFlavor';
import { cloutTier } from '../../sim/formulas';
import type { Skill } from '../../sim/types';
import { Button, Card } from '../kit';
import { money } from '../format';

const SKILL_LABELS: { id: Skill; label: string }[] = [
  { id: 'acting', label: 'Acting' },
  { id: 'writing', label: 'Writing' },
  { id: 'directing', label: 'Directing' },
  { id: 'music', label: 'Music' },
];

export function ArchetypeSelect() {
  const movedHome = useGame((g) => g.state?.status === 'movedHome');

  return (
    <main className="phone-wallpaper h-full overflow-y-auto overscroll-contain">
      <div className="safe-top safe-bottom mx-auto max-w-xl px-4 pb-6">
        <header className="pb-5 pt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">{PHONE.brand} · new life</p>
          <h1 className="mt-1 bg-gradient-to-r from-accent to-pink bg-clip-text font-[family-name:var(--font-display)] text-5xl font-black tracking-tight text-transparent">LA Grind</h1>
          <p className="mt-1 text-sm text-muted">Pay rent. Chase the dream. Try not to move back home.</p>
        </header>

        {movedHome && (
          <p role="status" className="mb-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
            <span className="font-semibold">New run:</span> you keep {Math.round(NEW_RUN_NETWORK_KEEP * 100)}% of your Network.
            Mom says hi.
          </p>
        )}

        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Pick your origin story</h2>

        <ul className="flex flex-col gap-3">
          {ARCHETYPE_IDS.map((id) => {
            const a = ARCHETYPES[id];
            return (
              <li key={id}>
                <Card>
                  <article aria-labelledby={`arch-${id}`}>
                    <h3 id={`arch-${id}`} className="font-[family-name:var(--font-display)] text-lg font-bold">
                      {a.name}
                    </h3>
                    <p className="text-sm italic text-muted">{a.tagline}</p>

                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted">Starting cash</dt>
                        <dd className="font-semibold tabular-nums">{money(a.cash)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wide text-muted">Clout Tier</dt>
                        <dd className="font-semibold tabular-nums">Tier {cloutTier(a.rp)}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-[11px] uppercase tracking-wide text-muted">Home</dt>
                        <dd>
                          {a.homeName} <span className="text-muted">({LOCATIONS[a.home].name})</span> ·{' '}
                          <span className="tabular-nums">{money(a.rentPerDay)}/day</span>
                        </dd>
                      </div>
                    </dl>

                    <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
                      {SKILL_LABELS.map((s) => (
                        <div key={s.id} className="rounded-lg bg-surface-2 px-1 py-1.5">
                          <dt className="truncate text-[10px] text-muted">{s.label}</dt>
                          <dd className="text-sm font-semibold tabular-nums">{a.skills[s.id]}</dd>
                        </div>
                      ))}
                      <div className="rounded-lg bg-surface-2 px-1 py-1.5">
                        <dt className="truncate text-[10px] text-muted">Network</dt>
                        <dd className="text-sm font-semibold tabular-nums">{a.network}</dd>
                      </div>
                    </dl>

                    <p className="mt-3 text-sm">
                      <span className="font-semibold text-pink">Perk: </span>
                      {a.special}
                    </p>

                    <Button variant="primary" className="mt-3 w-full" onClick={() => useGame.getState().start(id)}>
                      Start as {a.name}
                    </Button>
                  </article>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
