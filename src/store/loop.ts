// Drives the clock from real timestamps (never from interval counts), so throttled or
// suspended frames cannot drift the game. Pauses and saves when the app is backgrounded;
// on return it resumes from the saved moment with no offline catch-up.
import { lifecycle } from '../platform';
import { useGame } from './game';

export function startGameLoop(): () => void {
  let frame = 0;
  let last: number | null = null;
  let running = true;

  const loop = (t: number) => {
    if (!running) return;
    if (last !== null) useGame.getState().tick(t - last);
    last = t;
    frame = requestAnimationFrame(loop);
  };

  const pause = () => {
    running = false;
    cancelAnimationFrame(frame);
    last = null;
    void useGame.getState().save();
  };
  const resume = () => {
    if (running) return;
    running = true;
    last = null; // time spent away never reaches the sim
    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);
  const offPause = lifecycle.onPause(pause);
  const offResume = lifecycle.onResume(resume);
  return () => {
    pause();
    offPause();
    offResume();
  };
}
