# LA Grind

A satirical life-sim about trying to make it in Los Angeles's film, TV and music industries. Pick an archetype, pay rent, chase gigs, try not to move back home.

**Phase 1: playable single-player slice.** One codebase runs in a web browser and packages as iOS and Android apps with Capacitor.

- Plan and team: [`docs/PI-1.md`](docs/PI-1.md) · Jira project **LAG**
- How it is built: [`ARCHITECTURE.md`](ARCHITECTURE.md)

## Quick start (web)

```bash
npm install
npm run dev          # http://localhost:5173 — open at a phone size in devtools for the intended layout
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the web game with hot reload |
| `npm test` | Run the Vitest suite (reference odds, payouts, commute, tiers, bills, invariants, determinism, saves) |
| `npm run typecheck` | TypeScript strict check |
| `npm run balance` | Headless balance run: 4 archetypes × 4 strategies × 30 days, plus no-income runway |
| `npm run build` | Static production build in `dist/` |
| `npm run cap:sync` | Build, then copy the web build into the iOS and Android projects (`npx cap sync`) |
| `npm run ios` / `npm run android` | Sync, then open the native project in Xcode / Android Studio |

## Running on phones

The web build is the app. Capacitor wraps the same `dist/` folder, and there is no platform-specific game logic.

### iOS Simulator

Needs a **Mac with Xcode** (15+) or a cloud build service such as Ionic Appflow, Codemagic or Bitrise. iOS apps cannot be built on Linux or Windows.

1. `npm install`
2. `npm run ios`: builds, syncs and opens `ios/App/App.xcodeproj` in Xcode. Capacitor 8 uses Swift Package Manager, so no CocoaPods are needed.
3. Pick an iPhone simulator and press **Run**. The app is locked to portrait and respects the notch and home indicator.
4. To install on a real device, set your **Signing Team** under *Signing & Capabilities*.

### Android Emulator

Needs **Android Studio** (with an SDK and an emulator image) and JDK 21.

1. `npm install`
2. `npm run android`: builds, syncs and opens `android/` in Android Studio.
3. Let Gradle sync, choose an emulator, and press **Run**. Command line alternative: `cd android && ./gradlew assembleDebug`.

### Placeholders to replace before store submission

| Item | Where | Now |
|---|---|---|
| Bundle / application ID | `capacitor.config.ts` (`appId`) | `com.example.lagrind` |
| App name | `capacitor.config.ts` (`appName`) | `LA Grind` |
| Icon and splash sources | `assets/icon-*.png`, `assets/splash*.png` | Placeholder sunset art. Regenerate the native sets with `npx @capacitor/assets generate` |
| Web icon | `public/icon.svg`, `public/icons/` | Placeholder |

## How to play (in 30 seconds)

- **Hustle** tab: what you can do *here, now*, with time, costs, rewards, and why a button is disabled.
- **Map** tab: tap a neighbourhood to see the live travel time, energy and gas before you go. Crossing the 405 at rush hour costs triple.
- **Gigs** tab: today's film, TV and music opportunities. Prep raises your odds; the odds are shown before you submit. Tier 2+ needs headshots (Hollywood, $400).
- **Trades** tab: the satirical trade paper. Your bookings, rejections and exposures land here.
- Bills of rent + $20 food + $10 car are charged at **06:00**. Below $0 starts a 3-day overdraft countdown, and if it runs out you've **Moved Back Home**.
- **Pause / 1x / 4x** in the header; **Skip to done** finishes the current action instantly.

## Balance (output of `npm run balance`)

30 in-game days, seed 2026.

| Archetype | Strategy | End cash | Lowest cash | Tier | Bookings | Went broke | Moved home |
|---|---|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | No job | $20,800 | $20,800 | 3 | 0 | — | — |
| The Nepo Baby | Barista 5 days/week | $23,790 | $23,660 | 3 | 0 | — | — |
| The Nepo Baby | Bar back + 1 music gig/day | $24,931 | $24,908 | 3 | 1 | — | — |
| The Nepo Baby | PA when rested + 1 screen gig/day | $24,492 | $24,492 | 3 | 3 | — | — |
| The Midwest Transplant | No job | -$175 | -$175 | 1 | 0 | day 23 | day 26 |
| The Midwest Transplant | Barista 5 days/week | $2,360 | $1,196 | 1 | 0 | — | — |
| The Midwest Transplant | Bar back + 1 music gig/day | $1,530 | $1,160 | 2 | 4 | — | — |
| The Midwest Transplant | PA when rested + 1 screen gig/day | $2,946 | $1,158 | 2 | 2 | — | — |
| The Indie Hustler | No job | $1,000 | $1,000 | 1 | 0 | — | — |
| The Indie Hustler | Barista 5 days/week | $3,810 | $3,636 | 1 | 0 | — | — |
| The Indie Hustler | Bar back + 1 music gig/day | $5,290 | $3,996 | 3 | 10 | — | — |
| The Indie Hustler | PA when rested + 1 screen gig/day | $5,523 | $3,958 | 3 | 10 | — | — |
| The Bedroom Producer | No job | $400 | $400 | 1 | 0 | — | — |
| The Bedroom Producer | Barista 5 days/week | $3,210 | $2,496 | 1 | 0 | — | — |
| The Bedroom Producer | Bar back + 1 music gig/day | $4,658 | $2,460 | 2 | 10 | — | — |
| The Bedroom Producer | PA when rested + 1 screen gig/day | $4,468 | $2,456 | 2 | 5 | — | — |

No-income runway (days before cash first drops below $0):

| Archetype | Runway | Target |
|---|---:|---:|
| The Nepo Baby | 179 days | ~179 days |
| The Midwest Transplant | 22 days | ~22 days |
| The Indie Hustler | 41 days | ~40 days |
| The Bedroom Producer | 36 days | ~36 days |

**Reading it:** the Midwest Transplant is the only archetype that cannot coast, and running dry on day 23 matches the target. Every strategy that works keeps everyone afloat. The Nepo Baby barely needs a job. Strategies that skip headshots never book above Tier 1. Follow-ups are tracked in Jira LAG-33.

## Assumptions (where the brief left a choice)

- **Clock:** a new game starts on day 1 at 08:00, so the first bills land on day 2 at 06:00. One game minute = 1 real second at 1x.
- **Energy gate:** jobs, classes, prep and submissions need Energy ≥ 5. Sleep, leisure and **travel are always allowed**, so you can always get home.
- **Money:** discretionary spending (classes, leisure, headshots, repair, submission fees) needs the cash up front. Gas and daily bills can push you into overdraft.
- **Travel:** gas is `$2 × ceil(base minutes / 15)` and travel energy is `ceil(minutes / 10)`. Under 20 Car Health the trip takes 1.5×. At 0 you take the **bus**: 2.5× time, no gas, no car wear, and no rideshare.
- **Places:** the mechanic is in North Hollywood. Headshots and all classes are in Hollywood. Headshots take 2 hours.
- **Leisure:** the −4 Burnout comes from the −2/hr leisure recovery over its 2 hours.
- **Opportunities:** windows are the full span: Film/TV 09:00–17:00, Music 19:00–23:00. A submission must start and finish inside the window, at the opportunity's location. Odds are locked when you submit (the number you were shown). An opportunity can be submitted once, and the board is replaced at 06:00.
- **Exposure:** RP never goes below 0. If you have no RP, an exposure costs nothing but still makes the papers.
- **Overdraft:** "Moved Back Home" fires exactly 3 game days after cash first drops below $0, unless you get back to $0 first.
- **Saves:** written on every player action, each new day, and whenever the app is backgrounded or the tab hidden. No time passes while closed.

## Deliberately missing (Phase 1 scope)

- Careers, pipelines, pilot season, record releases, labels, tours (**Phase 2**)
- Accounts, server-side rules, shared Trades feed, leaderboards, shared clock (**Phase 3**)
- Presence, chat, co-op productions (**Phase 4**)
- Purchases, ads, analytics, account deletion, moderation tools: not needed until accounts and social features exist
- Real store assets, privacy policy and age rating: placeholders only
- Sound and music

## What has and hasn't been verified

- **Verified here:** typecheck, all tests, production build, `npx cap sync` for both platforms, and scripted play-tests in headless Chromium at 390×844, 360×740 and desktop sizes (see `docs/PI-1.md` and the Sprint PRs).
- **Not verified here:** running inside the iOS Simulator (needs macOS and Xcode) and the Android Emulator or Gradle build (no Android SDK in the cloud workspace). Both native projects are generated, synced and configured for portrait. A first run on each is still owed.

## Project layout

```
src/sim/        pure game rules (no React, DOM, Capacitor, Math.random or Date.now)
  content/      data tables: archetypes, jobs, locations, travel, opportunities, headlines
src/platform/   storage, lifecycle, haptics: web + native implementations
src/store/      Zustand store + timestamp-driven game loop
src/ui/         React components: read state, dispatch commands
tools/          balance.ts (headless strategies)
ios/ android/   Capacitor native projects
assets/         icon + splash sources
```
