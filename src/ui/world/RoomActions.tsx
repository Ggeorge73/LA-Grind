// Sprint 12 (LAG-94): every hotspot as a real button, for keyboard, screen readers, play-tests and the
// no-WebGL fallback. Always in the DOM; visually tucked away behind a small "Room actions" toggle until
// opened or focused. Choosing a spot here is exactly the same as tapping its marker.
import { HOTSPOTS } from '../../sim/content/homeFlavor';
import { useRoom } from '../../store/room';
import { HOTSPOT_ORDER } from './spots';

export function RoomActions({ fallback }: { fallback: boolean }) {
  const listOpen = useRoom((r) => r.listOpen);
  const setListOpen = useRoom((r) => r.setListOpen);
  const select = useRoom((r) => r.select);
  const selected = useRoom((r) => r.selected);
  const shown = fallback || listOpen;

  return (
    <div className={`absolute right-3 z-20 flex flex-col items-end gap-2 hud-below ${fallback ? 'left-[calc(118px+1.5rem)] sm:left-auto' : ''}`}>
      {!fallback && (
        <button
          type="button"
          aria-expanded={listOpen}
          aria-controls="room-actions"
          onClick={() => setListOpen(!listOpen)}
          className="hud-glass flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold active:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Room actions
        </button>
      )}
      <nav
        id="room-actions"
        data-room-actions
        aria-label="Room actions"
        className={
          shown
            ? 'hud-glass w-[min(220px,100%)] rounded-2xl p-1.5'
            : 'sr-only focus-within:not-sr-only focus-within:hud-glass focus-within:w-[220px] focus-within:rounded-2xl focus-within:p-1.5'
        }
      >
        {fallback && <p className="px-2 pb-1 pt-1.5 text-[12px] leading-snug text-muted">3D isn’t available on this device. Pick a spot in your apartment:</p>}
        <ul className="grid gap-0.5">
          {HOTSPOT_ORDER.map((id) => (
            <li key={id}>
              <button
                type="button"
                aria-current={selected === id ? 'true' : undefined}
                onClick={() => {
                  select(id);
                  setListOpen(false);
                }}
                className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-semibold active:bg-white/10 ${selected === id ? 'bg-white/10' : ''}`}
              >
                <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-white text-[15px] ring-2 ring-accent">
                  {HOTSPOTS[id].icon}
                </span>
                {HOTSPOTS[id].name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
