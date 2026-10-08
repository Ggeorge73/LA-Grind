import { useState } from 'react';
import { useGame } from '../store/game';
import { Hud } from './Hud';
import { OverdraftBanner } from './OverdraftBanner';
import { Toast } from './Toast';
import { BoardScreen } from './screens/BoardScreen';
import { HustleScreen } from './screens/HustleScreen';
import { LogScreen } from './screens/LogScreen';
import { MapScreen } from './screens/MapScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { RunSummary } from './screens/RunSummary';
import { TradesScreen } from './screens/TradesScreen';
import { CallbackSheet } from './screens/tvKit';

export type Tab = 'hustle' | 'map' | 'board' | 'projects' | 'trades' | 'log';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hustle', label: 'Hustle', icon: 'M4 7h16M4 12h16M4 17h10' },
  { id: 'map', label: 'Map', icon: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14' },
  { id: 'board', label: 'Gigs', icon: 'M4 5h16v14H4zM4 9h16M9 9v10' },
  { id: 'projects', label: 'Projects', icon: 'M4 10h16v10H4zM4 10l1-5 15-1 0 5M8.5 4.6 7 9.6M13.5 4.3 12 9.3' },
  { id: 'trades', label: 'Trades', icon: 'M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5' },
  { id: 'log', label: 'Log', icon: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z' },
];

export function GameScreen() {
  const [tab, setTab] = useState<Tab>('hustle');
  const movedHome = useGame((g) => g.state?.status === 'movedHome');

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col">
      <Hud />
      <OverdraftBanner />
      <main key={tab} className="screen-in min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        {tab === 'hustle' && <HustleScreen onNavigate={setTab} />}
        {tab === 'map' && <MapScreen onNavigate={setTab} />}
        {tab === 'board' && <BoardScreen onNavigate={setTab} />}
        {tab === 'projects' && <ProjectsScreen onNavigate={setTab} />}
        {tab === 'trades' && <TradesScreen />}
        {tab === 'log' && <LogScreen />}
      </main>
      <nav className="safe-bottom border-t border-line bg-surface" aria-label="Main">
        <ul className="grid grid-cols-6">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] ${tab === t.id ? 'text-accent' : 'text-muted'}`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.icon} />
                </svg>
                <span className={tab === t.id ? 'font-semibold' : ''}>{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <Toast />
      <CallbackSheet />
      {movedHome && <RunSummary />}
    </div>
  );
}
