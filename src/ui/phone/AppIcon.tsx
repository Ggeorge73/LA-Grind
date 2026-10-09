import { APPS, type AppId } from '../../sim/content/phoneFlavor';

/** The rounded app tile: brand colour, a soft top sheen and the white glyph. Decorative; the label lives on the button. */
export function AppGlyph({ id, size = 60 }: { id: AppId; size?: number }) {
  const app = APPS[id];
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center overflow-hidden shadow-[0_6px_16px_-6px_rgb(0_0_0/0.7),inset_0_1px_0_rgb(255_255_255/0.25)]"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(160deg, color-mix(in srgb, ${app.bg} 78%, white) 0%, ${app.bg} 48%, color-mix(in srgb, ${app.bg} 70%, black) 100%)`,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="white" fillRule="evenodd" className="drop-shadow-[0_1px_1px_rgb(0_0_0/0.35)]">
        <path d={app.glyph} />
      </svg>
    </span>
  );
}
