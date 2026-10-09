// Messages app (LAG-90): threads from the people in your LA life. Renders inboxView; opening a thread dispatches its `read` command.
import { useEffect, useRef } from 'react';
import { inboxView, tvView, type ThreadView } from '../../../sim/actions';
import { APPS } from '../../../sim/content/phoneFlavor';
import { useGame } from '../../../store/game';
import { usePhone } from '../../../store/phone';
import { clock, day } from '../../format';

function when(minute: number, now: number): string {
  return day(minute) === day(now) ? clock(minute) : day(minute) === day(now) - 1 ? 'Yesterday' : `Day ${day(minute)}`;
}

function Avatar({ emoji, size = 44 }: { emoji: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-surface-2 to-line ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      {emoji}
    </span>
  );
}

function ThreadList({ threads, now }: { threads: ThreadView[]; now: number }) {
  const openThread = usePhone((p) => p.openThread);
  if (threads.length === 0) return <p className="rounded-2xl bg-white/[0.05] p-4 text-center text-sm text-muted">{APPS.messages.empty}</p>;
  return (
    <ul aria-label="Conversations" className="-mx-1 flex flex-col">
      {threads.map((t) => (
        <li key={t.contact}>
          <button
            type="button"
            onClick={() => openThread(t.contact)}
            aria-label={`${t.name}${t.unread > 0 ? `, ${t.unread} unread` : ''}`}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left active:bg-white/[0.06]"
          >
            <Avatar emoji={t.avatar} />
            <span className="min-w-0 flex-1 border-b border-white/[0.06] pb-2">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate text-[15px] ${t.unread > 0 ? 'font-bold' : 'font-semibold'}`}>{t.name}</span>
                <span className={`shrink-0 text-[11px] tabular-nums ${t.unread > 0 ? 'font-semibold text-pink' : 'text-muted'}`}>{when(t.lastMinute, now)}</span>
              </span>
              <span className="block truncate text-[11px] text-muted">{t.role}</span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className={`line-clamp-1 min-w-0 flex-1 text-[13px] ${t.unread > 0 ? 'text-ink' : 'text-ink/70'}`}>{t.preview}</span>
                {t.unread > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-pink px-1.5 text-[11px] font-bold text-white" aria-hidden>
                    {t.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Chat({ thread, now }: { thread: ThreadView; now: number }) {
  const dispatch = useGame((g) => g.dispatch);
  const state = useGame((g) => g.state);
  const openThread = usePhone((p) => p.openThread);
  const unminimize = usePhone((p) => p.setSheetsMinimized);
  const endRef = useRef<HTMLDivElement>(null);
  const count = thread.messages.length;

  // Opening (and new texts arriving while open) marks the thread read.
  useEffect(() => {
    if (thread.unread > 0) dispatch(thread.read);
  }, [thread.unread, thread.read, dispatch]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count]);

  const tv = state ? tvView(state) : null;
  const pending =
    thread.contact === 'casting' && tv?.callback
      ? { text: `Callback in progress: “${tv.callback.showTitle}”`, button: 'Open callback' }
      : thread.contact === 'showrunner' && tv?.roomEvent
        ? { text: 'The room is waiting on your answer.', button: "Open writers' room" }
        : null;

  let lastDay = -1;
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => openThread(null)}
          aria-label="Back to conversations"
          className="grid min-h-11 min-w-11 place-items-center rounded-full text-accent active:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <Avatar emoji={thread.avatar} size={40} />
        <div className="min-w-0">
          <h2 className="truncate font-bold leading-tight">{thread.name}</h2>
          <p className="truncate text-[11px] text-muted">{thread.role}</p>
        </div>
      </div>

      {pending && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-tv/15 p-2.5 pl-3 ring-1 ring-tv/50">
          <p className="min-w-0 flex-1 text-xs font-semibold">{pending.text}</p>
          <button type="button" onClick={() => unminimize(false)} className="min-h-11 shrink-0 rounded-xl bg-tv px-3 text-sm font-bold text-bg active:brightness-90">
            {pending.button}
          </button>
        </div>
      )}

      <ol aria-label={`Messages from ${thread.name}`} className="flex flex-col gap-1.5">
        {thread.messages.map((m) => {
          const d = day(m.minute);
          const sep = d !== lastDay;
          lastDay = d;
          return (
            <li key={m.id} className="flex flex-col">
              {sep && <p className="my-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted">{d === day(now) ? 'Today' : `Day ${d}`}</p>}
              <div className="max-w-[85%] self-start rounded-[1.25rem] rounded-bl-md bg-surface-2 px-3.5 py-2 shadow-[0_4px_12px_-6px_rgb(0_0_0/0.6)] ring-1 ring-white/[0.06]">
                <p className="text-[14px] leading-snug">{m.text}</p>
                <p className="mt-0.5 text-right text-[10px] tabular-nums text-muted">
                  Day {d} · {clock(m.minute)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={endRef} />
      <p className="mt-4 text-center text-[11px] text-muted">You can&apos;t reply. They know.</p>
    </div>
  );
}

export function MessagesApp() {
  const state = useGame((g) => g.state);
  const contact = usePhone((p) => p.thread);
  if (!state) return null;
  const view = inboxView(state);
  const thread = contact ? view.threads.find((t) => t.contact === contact) : undefined;
  return thread ? <Chat thread={thread} now={state.minute} /> : <ThreadList threads={view.threads} now={state.minute} />;
}
