// The in-game phone (LAG-89): status bar, notification banners, home screen or an app, and the home bar.
import { useEffect, useRef, type ReactNode } from 'react';
import { APPS, type AppId } from '../../sim/content/phoneFlavor';
import { usePhone } from '../../store/phone';
import type { Tab } from '../GameScreen';
import { BoardScreen } from '../screens/BoardScreen';
import { GuildsSection } from '../screens/GuildsSection';
import { HustleScreen } from '../screens/HustleScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { CallbackSheet, RoomEventSheet } from '../screens/tvKit';
import { AppGlyph } from './AppIcon';
import { BankApp } from './apps/BankApp';
import { FeedApp } from './apps/FeedApp';
import { MessagesApp } from './apps/MessagesApp';
import { RidesApp } from './apps/RidesApp';
import { SettingsApp } from './apps/SettingsApp';
import { HomeScreen } from './HomeScreen';
import { Notifications } from './Notifications';
import { ActivityStrip, StatusBar } from './StatusBar';

export function useNavigate(): (tab: Tab) => void {
  const openApp = usePhone((p) => p.openApp);
  const goHome = usePhone((p) => p.goHome);
  return (tab) => (tab === 'home' ? goHome() : openApp(tab));
}

function AppContent({ id }: { id: AppId }) {
  const nav = useNavigate();
  switch (id) {
    case 'casting':
      return <BoardScreen onNavigate={nav} />;
    case 'studio':
      return <ProjectsScreen onNavigate={nav} />;
    case 'bank':
      return <BankApp />;
    case 'feed':
      return <FeedApp />;
    case 'messages':
      return <MessagesApp />;
    case 'rides':
      return <RidesApp onNavigate={nav} />;
    case 'gigs':
      return <HustleScreen onNavigate={nav} />;
    case 'union':
      return <GuildsSection onNavigate={nav} />;
    case 'settings':
      return <SettingsApp />;
  }
}

function AppFrame({ id }: { id: AppId }) {
  const goHome = usePhone((p) => p.goHome);
  const thread = usePhone((p) => p.thread);
  const app = APPS[id];
  const titleRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [id]);
  // A new chat (or back to the list) starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [thread]);

  return (
    <section role="region" aria-label={app.name} className="app-open flex h-full min-h-0 flex-col">
      <div
        className="relative flex items-center gap-2 px-2 pb-2 pt-0.5"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${app.bg} 26%, transparent), transparent)` }}
      >
        <button
          type="button"
          onClick={goHome}
          aria-label="Back to home"
          className="grid min-h-11 min-w-11 place-items-center rounded-full text-ink active:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <AppGlyph id={id} size={34} />
        <div className="min-w-0 flex-1">
          <h1 ref={titleRef} tabIndex={-1} className="truncate font-[family-name:var(--font-display)] text-lg font-bold leading-tight outline-none">
            {app.name}
          </h1>
          <p className="truncate text-[11px] text-muted">{app.tagline}</p>
        </div>
      </div>
      <ActivityStrip />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-6 pt-2">
        <AppContent id={id} />
      </div>
    </section>
  );
}

function HomeBar() {
  const goHome = usePhone((p) => p.goHome);
  return (
    <div className="safe-bottom flex justify-center">
      <button type="button" data-phone-focus aria-label="Home" onClick={goHome} className="group grid h-7 w-40 place-items-center rounded-full">
        <span className="block h-[5px] w-32 rounded-full bg-ink/70 transition group-active:w-24 group-active:bg-ink" aria-hidden />
      </button>
    </div>
  );
}

/** The phone's screen. `chrome` renders above the status bar (the notch / drag handle). */
export function PhoneScreen({ chrome }: { chrome?: ReactNode }) {
  const app = usePhone((p) => p.app);
  const lastApp = useRef<AppId | null>(null);
  const homeRef = useRef<HTMLDivElement>(null);

  // Back on the home screen, put keyboard focus on the tile of the app you just left.
  useEffect(() => {
    if (app === null && lastApp.current) {
      homeRef.current?.querySelector<HTMLElement>(`button[aria-label="${APPS[lastApp.current].name}"]`)?.focus({ preventScroll: true });
    }
    lastApp.current = app;
  }, [app]);

  return (
    <div className="phone-wallpaper relative flex h-full flex-col overflow-hidden text-ink [contain:layout_paint]">
      {chrome}
      <StatusBar />
      <div className="relative z-30 h-0">
        <Notifications className="absolute inset-x-0 top-0" />
      </div>
      <div ref={homeRef} className="relative min-h-0 flex-1">
        {app ? <AppFrame key={app} id={app} /> : <HomeScreen />}
      </div>
      <HomeBar />
      <CallbackSheet />
      <RoomEventSheet />
    </div>
  );
}
