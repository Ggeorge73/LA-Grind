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
      <main className="phone-wallpaper grid h-full place-items-center">
        <p className="bg-gradient-to-r from-accent to-pink bg-clip-text font-[family-name:var(--font-display)] text-3xl font-black text-transparent">LA Grind</p>
      </main>
    );
  }
  return hasGame ? <GameScreen /> : <ArchetypeSelect />;
}
