// Sprint 12 (LAG-94): React wrapper for the 3D apartment. Mounts one canvas and one renderer for the life of
// the game screen, lazy-loads three (its own chunk), and feeds the scene from the stores without re-rendering.
// Hotspot actions walk the character over, then dispatch; running activities pose the character.
import { useEffect, useRef, useState } from 'react';
import { homeView, type HotspotId } from '../../sim/actions';
import { HOTSPOTS } from '../../sim/content/homeFlavor';
import type { Activity, Command, GameState } from '../../sim/types';
import { useGame } from '../../store/game';
import { useRoom } from '../../store/room';
import type { HomeScene } from './HomeScene';
import { poseFor, webglAvailable } from './spots';

export type HomeStatus = 'loading' | 'ready' | 'fallback';

const ICONS = Object.fromEntries(Object.entries(HOTSPOTS).map(([id, h]) => [id, h.icon])) as Record<HotspotId, string>;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Spots with nothing to do right now (their rings glow dimmer). Recomputed only when the board changes. */
let dimCache: { board: unknown; atMinuteDay: number; dim: HotspotId[] } | null = null;
function dimSpots(s: GameState): HotspotId[] {
  const d = Math.floor(s.minute / 1440);
  if (dimCache && dimCache.board === s.board && dimCache.atMinuteDay === d) return dimCache.dim;
  const dim = homeView(s)
    .hotspots.filter((h) => h.actions.length === 0 && h.id !== 'door')
    .map((h) => h.id);
  dimCache = { board: s.board, atMinuteDay: d, dim };
  return dim;
}

/** Run a hotspot command once the character arrives. Clears `pending` first, so store listeners can't re-enter. */
function arrive(spot: HotspotId, command: Command) {
  useRoom.setState({ pending: null, origin: spot, error: null });
  const err = useGame.getState().dispatch(command);
  if (err) useRoom.setState({ origin: null, error: err });
  else useRoom.getState().select(null);
}

export function HomeWorld({ shown, active, onStatus }: { shown: boolean; active: boolean; onStatus(s: HomeStatus): void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HomeScene | null>(null);
  const [status, setStatus] = useState<HomeStatus>(() => (webglAvailable() ? 'loading' : 'fallback'));
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  useEffect(() => onStatusRef.current(status), [status]);

  // Create the scene once (the dynamic import keeps three out of the main chunk).
  useEffect(() => {
    if (status === 'fallback') return;
    let cancelled = false;
    let scene: HomeScene | null = null;
    import('./HomeScene')
      .then((m) => {
        if (cancelled || !canvasRef.current) return;
        try {
          scene = m.createHomeScene(canvasRef.current, {
            icons: ICONS,
            reducedMotion: reducedMotion(),
            onPick: (id) => useRoom.getState().select(id),
          });
          sceneRef.current = scene;
          setStatus('ready');
        } catch {
          setStatus('fallback');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('fallback');
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [status === 'fallback']); // eslint-disable-line react-hooks/exhaustive-deps

  // Feed the scene from the stores (no React re-render per game minute).
  useEffect(() => {
    if (status !== 'ready') return;
    const scene = sceneRef.current;
    if (!scene) return;
    let lastAct: Activity | null = null;
    const sync = () => {
      const s = useGame.getState().state;
      if (!s) return;
      const room = useRoom.getState();
      const act = s.activity;
      if (lastAct && !act && room.origin) {
        lastAct = act;
        room.clearOrigin(); // re-enters sync with origin cleared
        return;
      }
      lastAct = act;
      const atHome = s.player.location === s.player.home;
      scene.update({
        minute: s.minute,
        busy: !!act || !!room.pending,
        selected: room.selected,
        dim: dimSpots(s),
        tvOn: act?.kind === 'leisure' && act.leisureId === 'tv',
      });
      if (!atHome || room.pending) return;
      scene.pose(act ? poseFor(act, room.origin) : null);
    };
    // A chosen action: walk there, then run it.
    let walking: object | null = null;
    const walk = () => {
      const p = useRoom.getState().pending;
      if (!p || walking === p) return;
      walking = p;
      scene.walkTo(p.spot, () => {
        if (useRoom.getState().pending === p) arrive(p.spot, p.command);
        walking = null;
      });
    };
    const offGame = useGame.subscribe(sync);
    const offRoom = useRoom.subscribe(() => {
      walk();
      sync();
    });
    walk();
    sync();
    return () => {
      offGame();
      offRoom();
    };
  }, [status]);

  // No scene (still loading, or no WebGL): actions run right away.
  useEffect(() => {
    if (status === 'ready') return;
    const run = () => {
      const p = useRoom.getState().pending;
      if (p) arrive(p.spot, p.command);
    };
    run();
    return useRoom.subscribe(run);
  }, [status]);

  useEffect(() => {
    sceneRef.current?.setActive(shown && active);
  }, [shown, active, status]);

  if (status === 'fallback') return null;
  return (
    <div className={`absolute inset-0 ${shown ? '' : 'invisible'}`} aria-hidden={!shown}>
      {status === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_80%_at_50%_30%,#3b2a5c_0%,#1a1029_60%,#120d1f_100%)]">
          <p className="animate-pulse text-sm text-muted">Unlocking your apartment…</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="home-canvas absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Your apartment, a cutaway 3D room. Tap a glowing spot to do something there, or use Room actions."
      />
    </div>
  );
}
