# LA Grind

A satirical life-sim about trying to make it in Los Angeles's film, TV and music industries. Pick an archetype, pay rent, chase gigs, try not to move back home.

**Phase 1: playable single-player slice**, plus **Phase 2 careers in progress**: you can make a film from script to festival release, and record and release music onto the charts. One codebase runs in a web browser and packages as iOS and Android apps with Capacitor.

- Plans and team: [`docs/PI-1.md`](docs/PI-1.md) (Phase 1) · [`docs/PI-2.md`](docs/PI-2.md) (careers: Film → Music → TV) · Jira project **LAG**
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
| `npm run balance` | Headless balance run: 4 archetypes × 6 strategies × 30 days, film, music and music-business tables, plus no-income runway |
| `node tools/acceptance-playtest.cjs shots` | With `npm run dev` running: plays every "Done means" item for all 4 archetypes through the UI (needs Playwright + Chromium) |
| `node tools/film-playtest.cjs shots` | With `npm run dev` running: takes a short film from script to release for all 4 archetypes through the Projects tab |
| `node tools/music-playtest.cjs shots` | With `npm run dev` running: takes a single from songwriting to the end of release week for all 4 archetypes |
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
- **Projects** tab: make your own film. Write the script, pitch investors or self-fund, hire a crew, shoot on set (call time 05:00–10:00), edit, then submit to festivals. Results land at 06:00 days later; take a distribution offer or self-release. Or make music: write songs, book a studio, hire a studio crew, record, then release it and ride a 7-day release week (streams, royalties, Fans and a chart position every 06:00; promo once a day boosts tomorrow). One project at a time.
- **Trades** tab: the satirical trade paper. Your bookings, rejections and exposures land here.
- Bills of rent + $20 food + $10 car are charged at **06:00**. Below $0 starts a 3-day overdraft countdown, and if it runs out you've **Moved Back Home**.
- **Pause / 1x / 4x** in the header; **Skip to done** finishes the current action instantly.

## Balance (output of `npm run balance`)

30 in-game days, seed 2026 (override with `BALANCE_SEED=n npm run balance`).

| Archetype | Strategy | End cash | Lowest cash | Tier | Bookings | Top tier booked | Exposed | Went broke | Moved home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | No job | $20,800 | $20,800 | 3 | 0 | — | 0 | — | — |
| The Nepo Baby | Barista 5 days/week | $23,790 | $23,660 | 3 | 0 | — | 0 | — | — |
| The Nepo Baby | Bar back + 1 music gig/day | $24,931 | $24,908 | 3 | 1 | 1 | 0 | — | — |
| The Nepo Baby | PA when rested + 1 screen gig/day | $24,492 | $24,492 | 3 | 3 | 1 | 0 | — | — |
| The Nepo Baby | Headshots + bar back + 1 screen gig/day | $24,321 | $24,321 | 3 | 1 | 1 | 0 | — | — |
| The Nepo Baby | Make a short film + barista | $22,096 | $21,966 | 3 | 0 | — | 0 | — | — |
| The Midwest Transplant | No job | -$175 | -$175 | 1 | 0 | — | 0 | day 23 | day 26 |
| The Midwest Transplant | Barista 5 days/week | $2,360 | $1,196 | 1 | 0 | — | 0 | — | — |
| The Midwest Transplant | Bar back + 1 music gig/day | $1,530 | $1,160 | 2 | 4 | 1 | 0 | — | — |
| The Midwest Transplant | PA when rested + 1 screen gig/day | $2,946 | $1,158 | 2 | 2 | 1 | 0 | — | — |
| The Midwest Transplant | Headshots + bar back + 1 screen gig/day | $2,730 | $1,158 | 1 | 2 | 1 | 0 | — | — |
| The Midwest Transplant | Make a short film + barista | $1,589 | $225 | 2 | 0 | — | 0 | — | — |
| The Indie Hustler | No job | $1,000 | $1,000 | 1 | 0 | — | 0 | — | — |
| The Indie Hustler | Barista 5 days/week | $3,810 | $3,636 | 1 | 0 | — | 0 | — | — |
| The Indie Hustler | Bar back + 1 music gig/day | $5,290 | $3,996 | 3 | 10 | 1 | 0 | — | — |
| The Indie Hustler | PA when rested + 1 screen gig/day | $5,523 | $3,958 | 3 | 10 | 1 | 0 | — | — |
| The Indie Hustler | Headshots + bar back + 1 screen gig/day | $9,592 | $3,958 | 3 | 13 | 3 | 0 | — | — |
| The Indie Hustler | Make a short film + barista | $2,282 | $1,587 | 2 | 0 | — | 0 | — | — |
| The Bedroom Producer | No job | $400 | $400 | 1 | 0 | — | 0 | — | — |
| The Bedroom Producer | Barista 5 days/week | $3,210 | $2,496 | 1 | 0 | — | 0 | — | — |
| The Bedroom Producer | Bar back + 1 music gig/day | $4,658 | $2,460 | 2 | 10 | 1 | 9 | — | — |
| The Bedroom Producer | PA when rested + 1 screen gig/day | $4,468 | $2,456 | 2 | 5 | 1 | 3 | — | — |
| The Bedroom Producer | Headshots + bar back + 1 screen gig/day | $10,732 | $2,456 | 3 | 11 | 3 | 0 | — | — |
| The Bedroom Producer | Make a short film + barista | $1,556 | $297 | 2 | 0 | — | 0 | — | — |

Film runs: one film next to a weekday barista job, stopping at release (max 60 days). "Out of pocket" is self-funding plus festival fees; "Cash vs barista-only" compares end cash with barista alone over the same days.

| Archetype | Film | Days to release | Quality | Festivals (in/sent, awards) | Outcome | Film RP | Tier after | Out of pocket | Offer | Cash vs barista-only |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|
| The Nepo Baby | Short film | 7.9 | 51 | 2/2 | distribution deal | 180 | 3 | $2,075 | $649 | -$1,824 |
| The Nepo Baby | Micro-budget feature | 14.9 | 48 | 3/3 | distribution deal | 405 | 3 | $20,175 | $6,243 | -$14,486 |
| The Midwest Transplant | Short film | 14.9 | 51 | 2/2 | distribution deal | 180 | 2 | $1,101 | $650 | -$767 |
| The Indie Hustler | Short film | 7.9 | 69 | 2/2 | distribution deal | 180 | 2 | $2,075 | $791 | -$1,528 |
| The Bedroom Producer | Short film | 7.9 | 53 | 1/2 | distribution deal | 120 | 2 | $2,053 | $665 | -$1,654 |

Music runs: one record next to a weekday barista job, stopping at the end of release week (max 60 days). Studio budget is self-funded; "Cash vs barista-only" compares end cash with barista alone over the same days. The EP strategy keeps releasing singles until Clout 2, then saves up for the $4,000 studio.

| Archetype | Strategy | Days to week end | Quality | Peak | Streams | Fans gained | Royalties | Music RP | Cash vs barista-only |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | Single + promo | 7.9 | 63 | #74 | 26,220 | 331 | $104 | 81 | -$456 |
| The Nepo Baby | Single, no promo | 7.9 | 63 | #77 | 18,520 | 234 | $73 | 72 | -$473 |
| The Nepo Baby | EP + promo | 10.9 | 62 | #64 | 80,554 | 1,006 | $322 | 111 | -$3,874 |
| The Midwest Transplant | Single + promo | 8.9 | 61 | #87 | 8,159 | 99 | $33 | 42 | -$375 |
| The Midwest Transplant | Single, no promo | 8.9 | 61 | #89 | 5,791 | 70 | $23 | 36 | -$373 |
| The Indie Hustler | Single + promo | 9.0 | 64 | #81 | 14,529 | 187 | $58 | 60 | -$486 |
| The Indie Hustler | Single, no promo | 8.9 | 64 | #83 | 10,233 | 131 | $40 | 54 | -$368 |
| The Bedroom Producer | Single + promo | 8.9 | 73 | #64 | 74,102 | 1,081 | $295 | 111 | -$113 |
| The Bedroom Producer | Single, no promo | 8.9 | 73 | #66 | 51,089 | 746 | $204 | 105 | -$192 |

A single takes ~8–9 days for everyone (most of it is the 7-day release week), costs $100–500 net and pays 36–111 RP; the Bedroom Producer's 1,200 starting fans make it the strongest (#64 peak, ~1,000 new fans, Clout 2 from one single). Daily promo adds ~40% streams and fans but is optional. Only the Nepo Baby can self-fund an EP in 60 days: the others reach Clout 2 (after 1–3 singles) but cannot save $4,000 on barista pay, which label advances (Sprint 8) are meant to solve. Tuned in LAG-62: single budget $600 → $400, chart RP 2 → 3 per place.

Music business (LAG-69): 45 days next to a weekday barista job, compared with barista alone. **Signed EP** puts out singles (one label meeting each, self-funding on a no) until Clout 2, then shops the EP to labels daily until one signs and self-funds what the advance leaves. **Beat grinder** makes a beat a day at home until the store holds 8. **Gig the catalogue** releases a single, then plays the best venue it can book every night.

| Archetype | Strategy | Cash vs barista-only | Advances / leases / door | Fans | Clout | EP released | Notes |
|---|---|---:|---:|---:|---:|---|---|
| The Nepo Baby | Signed EP | -$539 | $2,425 | 1,412 | 3 | day 11 | Garage Press, 1 meeting |
| The Nepo Baby | Beat grinder | $919 | $933 | 500 | 3 | — | avg Q26, $21/day |
| The Nepo Baby | Gig the catalogue | $2,363 | $2,985 | 933 | 3 | — | basement, $81/show |
| The Midwest Transplant | Signed EP | -$883 | $3,072 | 656 | 2 | day 34 | Garage Press, 7 meetings in all |
| The Midwest Transplant | Beat grinder | $882 | $892 | 0 | 1 | — | avg Q31, $20/day |
| The Midwest Transplant | Gig the catalogue | $41 | $180 | 99 | 1 | — | open mic, $5/show |
| The Indie Hustler | Signed EP | -$1,718 | $2,978 | 1,023 | 2 | day 30 | Garage Press, 3 meetings |
| The Indie Hustler | Beat grinder | $1,076 | $1,090 | 150 | 1 | — | avg Q26, $24/day |
| The Indie Hustler | Gig the catalogue | $1,070 | $1,176 | 373 | 1 | — | basement, $33/show |
| The Bedroom Producer | Signed EP | $1,553 | $2,737 | 7,638 | 2 | day 20 | Tape Hiss, 2 meetings |
| The Bedroom Producer | Beat grinder | $2,419 | $2,437 | 1,200 | 1 | — | avg Q48, $54/day |
| The Bedroom Producer | Gig the catalogue | $9,969 | $9,906 | 2,505 | 2 | — | club, $320/show |

With a label every archetype finishes an EP inside ~40 days (day 11–41 over 8 seeds; the Midwest Transplant is slowest at day 33–41). Beats are pocket money: $20–30/day for most, ~$55/day for the Bedroom Producer, under one $130 barista shift. Shows scale with Fans: the club pays ~$135 at 1,000 Fans and ~$400 at 3,000, but an act with a few hundred Fans earns almost nothing. Placements ($300–1,100) land in roughly half of the runs. Tuned in LAG-69: show draw 3% → 2% and door split 60% → 45% (2,000 Fans at the club was ~$540 a night); beat lease cap 40% → 20%, Fans divisor 20,000 → 50,000, fee $20 + 1.5·Q → $10 + 1.2·Q; placement chance 2% → 1%; label advances 40–100% → 60–100% and marketing ×1.1–2 → ×1.1–1.5.

No-income runway (days before cash first drops below $0):

| Archetype | Runway | Target |
|---|---:|---:|
| The Nepo Baby | 179 days | ~179 days |
| The Midwest Transplant | 22 days | ~22 days |
| The Indie Hustler | 41 days | ~40 days |
| The Bedroom Producer | 36 days | ~36 days |

**Reading it:** the Midwest Transplant is the only archetype that cannot coast, and running dry on day 23 matches the target. Buying headshots once Clout 2 shows Tier 2 rows is now the best-paying strategy for the Indie Hustler and Bedroom Producer (Tier 3 bookings, ~$10k by day 30); without headshots nobody books above Tier 1. A short film releases in 8–15 days for every archetype, costs ~$0.8–2k net, and earns 120–300 RP (one Clout tier for a newcomer). The Nepo Baby can bankroll a micro-budget feature on day 1 (~$14.5k net cost, 405 RP); a film is their main money sink. Open items stay in Jira LAG-33.

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

- Label deals, tours, beat sales, TV careers, pilot season, guild membership (**Phase 2, Sprints 8–10**)
- Accounts, server-side rules, shared Trades feed, leaderboards, shared clock (**Phase 3**)
- Presence, chat, co-op productions (**Phase 4**)
- Purchases, ads, analytics, account deletion, moderation tools: not needed until accounts and social features exist
- Real store assets, privacy policy and age rating: placeholders only
- Sound and music

## What has and hasn't been verified

- **Verified here:** typecheck, all tests, production build, `npx cap sync` for both platforms, and the acceptance play-test in headless Chromium at 390×844: 56/56 checks over all four archetypes, covering every job; film, TV and music submissions with results in The Trades; the tripled 405 commute; day-plus-night energy cost; reload restoring the identical state; and going broke then restarting. An accessibility pass covered contrast, keyboard, focus, 44 px targets, 360 px width and reduced motion.
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
