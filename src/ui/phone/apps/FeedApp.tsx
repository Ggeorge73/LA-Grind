// Feed app (LAG-90): the Trades headlines as a social timeline. Your own headlines are badged.
import { APPS } from '../../../sim/content/phoneFlavor';
import type { Headline } from '../../../sim/types';
import { useGame } from '../../../store/game';
import { clock, compact, day } from '../../format';

/** Stable pseudo-engagement from the post id, display only. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const OUTLETS = [
  { name: 'The Trades', handle: '@thetrades', avatar: '📰', tint: 'from-[#BF360C] to-[#ff8a3d]' },
  { name: 'Coverage Wire', handle: '@coveragewire', avatar: '⏰', tint: 'from-[#6A1B9A] to-[#ff5c93]' },
  { name: 'Biz Buzz Daily', handle: '@bizbuzz', avatar: '🐝', tint: 'from-[#1565C0] to-[#38bdf8]' },
] as const;

function Post({ h, now }: { h: Headline; now: number }) {
  const n = hash(h.id);
  const outlet = OUTLETS[n % OUTLETS.length]!;
  const likes = (n % 900) + (h.own ? 1200 : 40);
  const reposts = Math.round(likes / (4 + (n % 5)));
  const ago = now - h.minute;
  const stamp = ago < 60 ? `${Math.max(1, Math.round(ago))}m` : ago < 1440 ? `${Math.floor(ago / 60)}h` : `Day ${day(h.minute)}`;
  return (
    <article
      aria-label={h.own ? `About you: ${h.text}` : h.text}
      className={`rounded-[1.4rem] p-3.5 ring-1 ${h.own ? 'bg-accent/[0.10] ring-accent/50' : 'bg-white/[0.05] ring-white/10'}`}
    >
      <header className="flex items-center gap-2.5">
        <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-base ${outlet.tint}`}>
          {outlet.avatar}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <span className="truncate">{outlet.name}</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-tv" fill="currentColor" aria-hidden>
              <path d="M12 2l2.4 2.2 3.2-.4.9 3.1 2.9 1.5-1 3.1 1 3.1-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1-3.1-1-3.1 2.9-1.5.9-3.1 3.2.4zm-1.2 13.4 5.6-5.6-1.4-1.4-4.2 4.2-2-2-1.4 1.4z" />
            </svg>
          </p>
          <p className="text-[11px] text-muted">
            {outlet.handle} · <time>{stamp}</time>
            <span className="sr-only">
              , Day {day(h.minute)} {clock(h.minute)}
            </span>
          </p>
        </div>
        {h.own && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-ink" aria-hidden>
            You
          </span>
        )}
      </header>
      <p className={`mt-2 font-[family-name:var(--font-display)] text-[15px] leading-snug ${h.own ? 'font-bold' : 'font-semibold'}`}>{h.text}</p>
      <footer className="mt-2.5 flex gap-5 text-[11px] text-muted" aria-hidden>
        <span>♥ {compact(likes)}</span>
        <span>⟳ {compact(reposts)}</span>
        <span>💬 {compact(Math.round(reposts / 2))}</span>
      </footer>
    </article>
  );
}

export function FeedApp() {
  const trades = useGame((g) => g.state?.trades);
  const now = useGame((g) => g.state?.minute ?? 0);
  if (!trades) return null;
  const items = [...trades].sort((a, b) => b.minute - a.minute);
  if (items.length === 0) return <p className="rounded-2xl bg-white/[0.05] p-4 text-center text-sm text-muted">{APPS.feed.empty}</p>;
  return (
    <ol aria-label="Timeline" className="flex flex-col gap-2.5">
      {items.map((h) => (
        <li key={h.id}>
          <Post h={h} now={now} />
        </li>
      ))}
    </ol>
  );
}
