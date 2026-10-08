import { useEffect } from 'react';
import { startGameLoop } from '../store/loop';
import { useGame } from '../store/game';
import { GameScreen } from './GameScreen';
import { ArchetypeSelect } from './screens/ArchetypeSelect';

export function App() {
  const loaded = useGame((g) => g.loaded);
  const hasGame = useGame((g) => g.state !== null);

  useEffect(() => {
    void useGame.getState().load();
    return startGameLoop();
  }, []);

  if (!loaded) {
    return (
      <main className="grid h-full place-items-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-accent">LA Grind</p>
      </main>
    );
  }
  return hasGame ? <GameScreen /> : <ArchetypeSelect />;
}
