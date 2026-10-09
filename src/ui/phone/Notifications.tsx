import { useEffect } from 'react';
import { APPS, CONTACTS } from '../../sim/content/phoneFlavor';
import { useGame, type Toast } from '../../store/game';
import { usePhone } from '../../store/phone';
import { AppGlyph } from './AppIcon';

const NOTICE_MS = 4000;

const TONE_RING: Record<Toast['tone'], string> = {
  good: 'ring-good/40',
  bad: 'ring-bad/50',
  info: 'ring-white/15',
};
const TONE_BAR: Record<Toast['tone'], string> = { good: 'bg-good', bad: 'bg-bad', info: 'bg-accent' };

function Banner({ n }: { n: Toast }) {
  const dismiss = useGame((g) => g.dismissNotice);
  const openApp = usePhone((p) => p.openApp);
  const goHome = usePhone((p) => p.goHome);
  const setOpen = usePhone((p) => p.setOpen);

  useEffect(() => {
    const t = setTimeout(() => dismiss(n.id), NOTICE_MS);
    return () => clearTimeout(t);
  }, [n.id, dismiss]);

  const contact = n.contact ? CONTACTS[n.contact] : null;
  const title = n.title ?? (n.app ? APPS[n.app].name : 'LA Grind');
  const open = () => {
    dismiss(n.id);
    if (n.app) openApp(n.app, n.contact ?? null);
    else {
      goHome();
      setOpen(true);
    }
  };

  return (
    <li className="notif-in pointer-events-auto relative overflow-hidden rounded-[1.4rem] bg-[#251a40]/95 shadow-[0_12px_30px_-8px_rgb(0_0_0/0.8)] ring-1 backdrop-blur-xl">
      <div className={`flex items-stretch ${TONE_RING[n.tone]} rounded-[1.4rem] ring-1`}>
        <button
          type="button"
          onClick={open}
          aria-label={`${title}: ${n.text.replace(/[.!?…]+$/, "")}. Open ${n.app ? APPS[n.app].name : 'home screen'}`}
          className="flex min-h-14 min-w-0 flex-1 items-start gap-2.5 py-2.5 pl-3 pr-1 text-left"
        >
          {contact ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-lg" aria-hidden>
              {contact.avatar}
            </span>
          ) : n.app ? (
            <AppGlyph id={n.app} size={36} />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-accent to-pink text-sm font-black text-accent-ink" aria-hidden>
              LA
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-bold">{title}</span>
              <span className="shrink-0 text-[10px] text-muted">now</span>
            </span>
            <span className="line-clamp-2 text-[13px] leading-snug text-ink/90">{n.text}</span>
          </span>
        </button>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(n.id)} className="grid min-h-11 w-10 shrink-0 place-items-center text-muted">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <span aria-hidden className={`notif-timer absolute bottom-0 left-0 h-0.5 w-full opacity-70 ${TONE_BAR[n.tone]}`} style={{ animationDuration: `${NOTICE_MS}ms` }} />
    </li>
  );
}

/** Phone notification banners: drop from the top, newest on top, max two, auto-dismiss after 4s. */
export function Notifications({ className = '' }: { className?: string }) {
  const notices = useGame((g) => g.notices);
  return (
    <div role="status" aria-live="polite" aria-label="Notifications" className={`pointer-events-none z-30 px-2 ${className}`}>
      <ul className="flex flex-col gap-1.5">
        {[...notices].reverse().map((n) => (
          <Banner key={n.id} n={n} />
        ))}
      </ul>
    </div>
  );
}
