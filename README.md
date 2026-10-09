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
- **Projects** tab: make your own film. Write the script, pitch investors or self-fund, hire a crew, shoot on set (call time 05:00–10:00), edit, then submit to festivals. Results land at 06:00 days later; take a distribution offer or self-release. Or make music: write songs, book a studio, hire a studio crew, record, then release it and ride a 7-day release week (streams, royalties, Fans and a chart position every 06:00; promo once a day boosts tomorrow). Pitch record labels for a studio advance (they keep a cut). One project at a time.
- **Music business** (Projects tab): play live shows once you have a record out (bigger rooms open as Fans grow), make beats at home that lease out each morning, and grow a catalogue that earns sync placements, or put one of your songs on your own film's soundtrack.
- **TV** (Gigs and Projects tabs): pilot season runs days 8–17 of every 30. Book a pilot through a three-beat callback, wait a week for the network, and if it's picked up you're a series regular: shoot one episode a week at the Burbank lot.
- **Writers' room** (Projects tab): start a **Spec pilot** (any Clout, no budget). Write 3 drafts, build a 2-session pitch deck, then meet talent agencies (one a day, each in its own neighbourhood). Once one signs you, your agent tries to get you staffed at 06:00 every 5 days, up to 3 times. Staffed, you're a staff writer on a show at your Clout tier ($500–3,500 a week for 6–10 weeks): one 8-hour room day a week at the lot, then answer the room's politics question. Favor 70+ at wrap gets you promoted to story editor (big RP); under 30 and you're not asked back.
- **Guilds** (Hustle tab): one per skill. Earn 3 vouchers from union work in that skill (Tier 2+ bookings, a booked pilot, getting staffed, a label signing, a festival acceptance), then join at the guild's HQ for $1,000. Members earn 2× on gigs in that skill and +25% on series and staff-writer contracts, pay $100 dues every 30 days, and get a health plan (Burnout builds 25% slower) after a $2,000 month of union work. Global Rule One: members can't take Tier 1 (non-union) gigs in their skill.
- **Trades** tab: the satirical trade paper. Your bookings, rejections and exposures land here.
- Bills of rent + $20 food + $10 car are charged at **06:00**. Below $0 starts a 3-day overdraft countdown, and if it runs out you've **Moved Back Home**.
- **Pause / 1x / 4x** in the header; **Skip to done** finishes the current action instantly.

## Balance (output of `npm run balance`)

Every table below is regenerated from `npm run balance` at the end of PI-2 (Sprint 10, LAG-77 item 3 / LAG-82). Seed 2026 (override with `BALANCE_SEED=n`); the pilot-season and writers'-room tables average 10 seeds (`PILOT_SEEDS`, `WRITER_SEEDS`, `WRITER_DAYS`). Since Sprint 9 pilots share the daily board and RNG with everything else, so single-seed rows move by seed noise from sprint to sprint; read them as examples, not targets.

30 in-game days, every archetype × six scripted strategies:

| Archetype | Strategy | End cash | Lowest cash | Tier | Bookings | Top tier booked | Exposed | Went broke | Moved home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | No job | $20,800 | $20,800 | 3 | 0 | — | 0 | — | — |
| The Nepo Baby | Barista 5 days/week | $23,790 | $23,660 | 3 | 0 | — | 0 | — | — |
| The Nepo Baby | Bar back + 1 music gig/day | $25,006 | $24,935 | 3 | 2 | 1 | 0 | — | — |
| The Nepo Baby | PA when rested + 1 screen gig/day | $24,065 | $23,955 | 3 | 3 | 1 | 0 | — | — |
| The Nepo Baby | Headshots + bar back + 1 screen gig/day | $23,952 | $23,851 | 3 | 3 | 1 | 0 | — | — |
| The Nepo Baby | Make a short film + barista | $22,096 | $21,966 | 3 | 0 | — | 0 | — | — |
| The Midwest Transplant | No job | -$175 | -$175 | 1 | 0 | — | 0 | day 23 | day 26 |
| The Midwest Transplant | Barista 5 days/week | $2,360 | $1,196 | 1 | 0 | — | 0 | — | — |
| The Midwest Transplant | Bar back + 1 music gig/day | $800 | $800 | 1 | 2 | 1 | 0 | — | — |
| The Midwest Transplant | PA when rested + 1 screen gig/day | $3,004 | $1,158 | 2 | 4 | 1 | 0 | — | — |
| The Midwest Transplant | Headshots + bar back + 1 screen gig/day | $2,302 | $1,158 | 2 | 5 | 1 | 0 | — | — |
| The Midwest Transplant | Make a short film + barista | $1,556 | $231 | 2 | 0 | — | 0 | — | — |
| The Indie Hustler | No job | $1,000 | $1,000 | 1 | 0 | — | 0 | — | — |
| The Indie Hustler | Barista 5 days/week | $3,810 | $3,636 | 1 | 0 | — | 0 | — | — |
| The Indie Hustler | Bar back + 1 music gig/day | $5,188 | $3,996 | 2 | 8 | 1 | 0 | — | — |
| The Indie Hustler | PA when rested + 1 screen gig/day | $5,131 | $3,958 | 2 | 7 | 1 | 0 | — | — |
| The Indie Hustler | Headshots + bar back + 1 screen gig/day | $11,306 | $3,958 | 4 | 15 | 3 | 0 | — | — |
| The Indie Hustler | Make a short film + barista | $1,491 | $1,317 | 1 | 0 | — | 0 | — | — |
| The Bedroom Producer | No job | $400 | $400 | 1 | 0 | — | 0 | — | — |
| The Bedroom Producer | Barista 5 days/week | $3,210 | $2,496 | 1 | 0 | — | 0 | — | — |
| The Bedroom Producer | Bar back + 1 music gig/day | $4,853 | $2,460 | 2 | 11 | 1 | 6 | — | — |
| The Bedroom Producer | PA when rested + 1 screen gig/day | $4,734 | $2,456 | 2 | 6 | 1 | 2 | — | — |
| The Bedroom Producer | Headshots + bar back + 1 screen gig/day | $8,058 | $2,456 | 3 | 12 | 3 | 0 | — | — |
| The Bedroom Producer | Make a short film + barista | $891 | $297 | 1 | 0 | — | 0 | — | — |

Film runs: one film next to a weekday barista job, stopping at release (max 60 days). "Out of pocket" is self-funding plus festival fees; "Cash vs barista-only" compares end cash with barista alone over the same days.

| Archetype | Film | Days to release | Quality | Festivals (in/sent, awards) | Outcome | Film RP | Tier after | Out of pocket | Offer | Cash vs barista-only |
|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|
| The Nepo Baby | Short film | 7.9 | 51 | 2/2 | distribution deal | 180 | 3 | $2,075 | $649 | -$1,824 |
| The Nepo Baby | Micro-budget feature | 14.9 | 48 | 2/3 | distribution deal | 180 | 3 | $20,175 | $6,265 | -$14,464 |
| The Midwest Transplant | Short film | 14.9 | 46 | 2/2 | distribution deal | 180 | 2 | $1,101 | $611 | -$804 |
| The Indie Hustler | Short film | 7.9 | 69 | 1/2 | self-released | 95 | 1 | $2,075 | $0 | -$2,319 |
| The Bedroom Producer | Short film | 7.9 | 53 | 0/2 | self-released | 27 | 1 | $2,053 | $0 | -$2,319 |

Music runs: one record next to a weekday barista job, stopping at the end of release week (max 60 days). Studio budget is self-funded. The EP strategy keeps releasing singles until Clout 2, then saves up for the $4,000 studio.

| Archetype | Strategy | Days to week end | Quality | Peak | Streams | Fans gained | Royalties | Studio cost | Music RP | Tier after | Cash vs barista-only |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | Single + promo | 7.9 | 63 | #75 | 22,417 | 283 | $89 | $400 | 78 | 3 | -$471 |
| The Nepo Baby | Single, no promo | 7.9 | 63 | #77 | 16,533 | 208 | $66 | $400 | 72 | 3 | -$480 |
| The Nepo Baby | EP + promo | 10.9 | 62 | #65 | 54,981 | 685 | $220 | $4,000 | 108 | 3 | -$3,976 |
| The Midwest Transplant | Single + promo | 8.9 | 61 | #88 | 7,079 | 88 | $29 | $400 | 39 | 1 | -$379 |
| The Midwest Transplant | Single, no promo | 8.9 | 61 | #89 | 5,224 | 63 | $21 | $400 | 36 | 1 | -$375 |
| The Midwest Transplant | EP + promo (after 3 singles) | > 60 | — | — | 26,273 | 308 | $108 | $1,200 | 141 | 2 | -$1,150 |
| The Indie Hustler | Single + promo | 9.0 | 64 | #82 | 12,318 | 158 | $50 | $400 | 57 | 1 | -$494 |
| The Indie Hustler | Single, no promo | 8.9 | 64 | #83 | 9,086 | 117 | $35 | $400 | 54 | 1 | -$373 |
| The Indie Hustler | EP + promo (after 2 singles) | > 60 | — | — | 28,627 | 362 | $117 | $800 | 123 | 2 | -$739 |
| The Bedroom Producer | Single + promo | 8.9 | 73 | #65 | 58,098 | 847 | $232 | $400 | 108 | 2 | -$176 |
| The Bedroom Producer | Single, no promo | 8.9 | 73 | #66 | 42,851 | 625 | $172 | $400 | 105 | 2 | -$224 |
| The Bedroom Producer | EP + promo (after 1 single) | > 60 | — | — | 58,098 | 847 | $232 | $400 | 108 | 2 | -$180 |

Music business (LAG-69): 45 days next to a weekday barista job, compared with barista alone. **Signed EP** puts out singles (one label meeting each, self-funding on a no) until Clout 2, then shops the EP to labels daily until one signs and self-funds what the advance leaves. **Beat grinder** makes a beat a day at home until the store holds 8. **Gig the catalogue** releases a single, then plays the best venue it can book every night.

| Archetype | Strategy | Cash vs barista-only | Advances / leases / door | Fans | RP | Clout | EP released | Notes |
|---|---|---:|---:|---:|---:|---:|---|---|
| The Nepo Baby | Signed EP | -$607 | $2,425 | 1,139 | 515 | 3 | day 11 | EP: Garage Press Records; 1 label meeting in all; placements $885 |
| The Nepo Baby | Beat grinder | $979 | $993 | 500 | 400 | 3 | — | 8 beats, avg Q26; $22/day avg, $10/day over the last 10 days |
| The Nepo Baby | Gig the catalogue | $2,102 | $2,739 | 875 | 478 | 3 | — | 37 shows, $74/show avg, best $90 |
| The Midwest Transplant | Signed EP | -$1,126 | $3,680 | 639 | 253 | 2 | day 40 | EP: Garage Press Records; 6 label meetings in all; placements $336 |
| The Midwest Transplant | Beat grinder | $1,087 | $1,097 | 0 | 0 | 1 | — | 8 beats, avg Q31; $24/day avg, $24/day over the last 10 days |
| The Midwest Transplant | Gig the catalogue | -$338 | $171 | 88 | 39 | 1 | — | 36 shows, $5/show avg, best $5 |
| The Indie Hustler | Signed EP | -$748 | $2,887 | 1,067 | 264 | 2 | day 33 | EP: Garage Press Records; 5 label meetings in all; placements $1,098 |
| The Indie Hustler | Beat grinder | $675 | $689 | 150 | 0 | 1 | — | 8 beats, avg Q26; $15/day avg, $17/day over the last 10 days |
| The Indie Hustler | Gig the catalogue | $601 | $1,099 | 344 | 57 | 1 | — | 36 shows, $31/show avg, best $36 |
| The Bedroom Producer | Signed EP | $426 | $3,156 | 4,861 | 271 | 2 | day 20 | EP: Tape Hiss Tapes; 2 label meetings in all; placements $960 |
| The Bedroom Producer | Beat grinder | $2,236 | $2,254 | 1,200 | 0 | 1 | — | 8 beats, avg Q48; $50/day avg, $60/day over the last 10 days |
| The Bedroom Producer | Gig the catalogue | $9,833 | $9,395 | 2,255 | 134 | 2 | — | 31 shows, $303/show avg, best $358; placements $876 |

Pilot season (LAG-76): 60 days (two seasons, days 8–17 and 38–47) next to a weekday barista job. Every season day the strategy preps 2h and submits to the best pilot it can afford (buying headshots once Tier 2 pilots show up) and shoots every episode. One seed:

| Archetype | Pilots sent / booked | Pickups | Episodes shot / weeks | Pilot fees | Series pay | Cash vs barista-only | RP | Clout | Credit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| The Nepo Baby | 18 / 2 | 1/2 | 4 / 4 | $1,350 | $1,200 | $770 | 536 | 3 | Web series, Q100 |
| The Midwest Transplant | 18 / 1 | 0/1 | 0 / 0 | $270 | $0 | -$432 | 32 | 1 | — |
| The Indie Hustler | 18 / 3 | 0/3 | 0 / 0 | $810 | $0 | $798 | 96 | 1 | — |
| The Bedroom Producer | 18 / 0 | 0/0 | 0 / 0 | $0 | $0 | -$728 | 0 | 1 | — |

Over 10 seeds, picking the read its Acting senses, otherwise read 0 ("sensed or 0", a player guessing), or always the right read ("perfect", a player who reads the director's notes):

| Archetype | Reads | Booked a pilot in season 1 | Right reads | Pickup odds (avg) | Pickup rate | Runs with a series | Episodes shot / weeks | Cash vs barista-only (avg / min / max) | RP (avg) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | sensed or 0 | 80% | 1.4 / 3 | 38% | 9/27 (33%) | 6/10 | 25 / 21 | $2,049 / -$1,228 / $12,936 | 571 |
| The Nepo Baby | perfect | 100% | 3.0 / 3 | 45% | 31/59 (53%) | 9/10 | 55 / 47 | $8,555 / $646 / $16,176 | 847 |
| The Midwest Transplant | sensed or 0 | 80% | 1.5 / 3 | 35% | 5/16 (31%) | 5/10 | 18 / 17 | -$207 / -$698 / $560 | 69 |
| The Midwest Transplant | perfect | 90% | 3.0 / 3 | 44% | 20/47 (43%) | 9/10 | 48 / 40 | $1,313 / -$676 / $3,368 | 222 |
| The Indie Hustler | sensed or 0 | 40% | 1.5 / 3 | 33% | 6/16 (38%) | 4/10 | 16 / 14 | $635 / -$20 / $2,158 | 70 |
| The Indie Hustler | perfect | 80% | 3.0 / 3 | 44% | 16/43 (37%) | 9/10 | 36 / 32 | $1,432 / $294 / $3,244 | 180 |
| The Bedroom Producer | sensed or 0 | 50% | 1.4 / 3 | 34% | 3/9 (33%) | 3/10 | 12 / 12 | -$313 / -$728 / $496 | 41 |
| The Bedroom Producer | perfect | 90% | 3.0 / 3 | 43% | 18/43 (42%) | 8/10 | 45 / 37 | $1,310 / -$184 / $4,018 | 208 |

Writers' room (LAG-82): 90 days next to a weekday barista job, 10 seeds. The writer starts a spec pilot at once (and another whenever it is free and not on a show), writes 3 drafts and 2 deck sessions in the afternoons, meets the agency with the best odds × staffing value once a day, waits out staffing season, then does each week's room day first thing and answers every politics event either for **Favor** or for **the pages** (quality). The guild variant also chases one writing gig a day (Tier 2+ once headshots are affordable) and joins the Writing guild as soon as it has 3 vouchers and $1,000; the control row does the same without ever writing a spec. "Staffing tries won" counts every 06:00 roll; a season is up to 3 tries.

| Archetype | Strategy | Staffed | Day staffed (avg, range) | Agency meetings / run | Staffing tries won | Seasons staffed / failed | Weekly pay | Room days / weeks | Wrapped: promoted / asked back / not asked back | Favor at end (on a show) | Joined guild | Cash vs barista-only (avg / min / max) | RP (avg) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| The Nepo Baby | Writer, answers for Favor | 10/10 | 12 (8–35) | 2.7 | 17/27 (63%) | 17 / 1 | $2,000–$2,000 | 106 / 98 | 9 / 0 / 0 | 64 (8 runs) | — | $18,455 / $15,874 / $19,850 | 853 |
| The Nepo Baby | Writer, answers for the pages | 10/10 | 12 (8–35) | 2.7 | 17/27 (63%) | 17 / 1 | $2,000–$2,000 | 106 / 98 | 0 / 3 / 6 | 41 (8 runs) | — | $18,455 / $15,874 / $19,850 | 700 |
| The Nepo Baby | Writer + writing gigs, joins the guild | 10/10 | 13 (8–41) | 2.6 | 19/28 (68%) | 19 / 2 | $2,000–$2,000 | 107 / 97 | 9 / 0 / 0 | 63 (10 runs) | 6/10, day 76 (54–90) | $17,803 / $14,984 / $19,211 | 982 |
| The Nepo Baby | Control: writing gigs + guild, no spec | 0/10 | — | 0.0 | — | 0 / 0 | — | 0 / 0 | 0 / 0 / 0 | — | 0/10 | -$465 / -$578 / -$403 | 408 |
| The Midwest Transplant | Writer, answers for Favor | 10/10 | 26 (10–56) | 5.0 | 16/52 (31%) | 16 / 7 | $500–$1,000 | 82 / 75 | 9 / 0 / 0 | 82 (7 runs) | — | $3,669 / $2,146 / $6,984 | 149 |
| The Midwest Transplant | Writer, answers for the pages | 10/10 | 26 (10–56) | 5.4 | 17/53 (32%) | 17 / 7 | $500–$500 | 82 / 74 | 0 / 2 / 7 | 35 (8 runs) | — | $2,845 / $2,146 / $4,984 | 75 |
| The Midwest Transplant | Writer + writing gigs, joins the guild | 10/10 | 24 (10–50) | 5.2 | 18/48 (38%) | 18 / 6 | $500–$1,250 | 82 / 73 | 9 / 0 / 0 | 74 (9 runs) | 5/10, day 77 (66–88) | $365 / -$1,694 / $2,070 | 279 |
| The Midwest Transplant | Control: writing gigs + guild, no spec | 0/10 | — | 0.0 | — | 0 / 0 | — | 0 / 0 | 0 / 0 / 0 | — | 0/10 | -$2,281 / -$3,383 / -$1,657 | 53 |
| The Indie Hustler | Writer, answers for Favor | 10/10 | 17 (9–27) | 3.2 | 20/40 (50%) | 20 / 2 | $500–$1,000 | 99 / 89 | 10 / 0 / 0 | 83 (10 runs) | — | $4,957 / $2,048 / $6,982 | 188 |
| The Indie Hustler | Writer, answers for the pages | 10/10 | 17 (9–27) | 3.7 | 19/45 (42%) | 19 / 4 | $500–$500 | 93 / 84 | 0 / 0 / 10 | 29 (9 runs) | — | $3,266 / $2,050 / $4,982 | 83 |
| The Indie Hustler | Writer + writing gigs, joins the guild | 10/10 | 12 (9–19) | 2.9 | 20/26 (77%) | 20 / 0 | $2,500–$4,375 | 105 / 95 | 10 / 0 / 0 | 83 (10 runs) | 10/10, day 32 (17–41) | $47,811 / $28,441 / $75,080 | 2101 |
| The Indie Hustler | Control: writing gigs + guild, no spec | 0/10 | — | 0.0 | — | 0 / 0 | — | 0 / 0 | 0 / 0 / 0 | — | 10/10, day 55 (24–80) | $7,603 / -$411 / $20,051 | 918 |
| The Bedroom Producer | Writer, answers for Favor | 10/10 | 27 (10–53) | 4.1 | 18/53 (34%) | 18 / 7 | $500–$1,000 | 86 / 77 | 9 / 0 / 0 | 83 (9 runs) | — | $3,769 / $1,674 / $6,346 | 157 |
| The Bedroom Producer | Writer, answers for the pages | 10/10 | 27 (10–53) | 5.3 | 17/60 (28%) | 17 / 9 | $500–$500 | 77 / 69 | 0 / 1 / 8 | 29 (8 runs) | — | $2,580 / $1,674 / $3,204 | 69 |
| The Bedroom Producer | Writer + writing gigs, joins the guild | 10/10 | 24 (10–50) | 4.4 | 17/41 (41%) | 17 / 6 | $500–$2,500 | 88 / 79 | 8 / 0 / 0 | 87 (9 runs) | 10/10, day 61 (34–87) | $8,123 / -$100 / $29,214 | 712 |
| The Bedroom Producer | Control: writing gigs + guild, no spec | 0/10 | — | 0.0 | — | 0 / 0 | — | 0 / 0 | 0 / 0 / 0 | — | 0/10 | -$1,804 / -$3,028 / $12 | 154 |

| Strategy (all archetypes) | Staffed | Promoted (of wraps) | Cash vs barista-only (avg) |
|---|---:|---:|---:|
| Writer, answers for Favor | 100% (40/40) | 100% (37/37) | $7,712 |
| Writer, answers for the pages | 100% (40/40) | 0% (0/37) | $6,786 |
| Writer + writing gigs, joins the guild | 100% (40/40) | 100% (36/36) | $18,525 |
| Control: writing gigs + guild, no spec | 0% (0/40) | — | $763 |

No-income runway (days before cash first drops below $0):

| Archetype | Runway | Target |
|---|---:|---:|
| The Nepo Baby | 179 days | ~179 days |
| The Midwest Transplant | 22 days | ~22 days |
| The Indie Hustler | 41 days | ~40 days |
| The Bedroom Producer | 36 days | ~36 days |

**Reading it.** The Midwest Transplant is the only archetype that cannot coast (broke on day 23, home on day 26, matching the target). Headshots plus one screen gig a day is still the best 30-day hustle for the Indie Hustler and Bedroom Producer (Tier 3–4 bookings, $8–11k by day 30); without headshots nobody books above Tier 1. A short film takes 8–15 days, costs ~$1–2k out of pocket and pays 27–180 RP depending on the festivals; the Nepo Baby's micro-budget feature is a ~$14.5k money sink. A single takes ~8–9 days, costs ~$180–500 net and pays 36–108 RP; only the Nepo Baby can self-fund an EP inside 60 days, and label advances get everyone else there by day 20–40. Beats are pocket money ($15–50/day); shows pay once you have Fans (the Bedroom Producer's club nights ~$300). Pilot season adds ~$1.3k over 60 days for a newcomer who reads the notes and roughly breaks even when guessing; the Nepo Baby leads at +$8.6k.

**The writers' room** is the most reliable TV path: every run in 40 lands an agent (3–5 meetings) and gets staffed, newcomers by day 17–27 on average and the Nepo Baby by day 12; per 06:00 roll the odds are ~30–35% for the Midwest Transplant and Bedroom Producer, ~50% for the Indie Hustler and ~65% for the Nepo Baby, and 70–100% of staffing seasons end in a job. A newcomer's web-series room adds +$3–5k over 90 days next to the barista job (more than pilots, less than the headshots gig hustle); the Nepo Baby starts at Clout 3, so their first room is a $2,000/week streaming room (+$18k). Answering politics for Favor gets promoted in every wrap (37/37); answering for the pages never does (0/37, mostly "not asked back"), and newcomers end ~$0.8–1.7k poorer because the promotion RP would have lifted their next room's tier. Joining the Writing guild (day 32–77 when it happens) pays off hugely only when writing gigs have already pushed Clout to 4: the Indie Hustler's network rooms at $4,375/week (+25% scale) make it the single best strategy in the game (+$48k avg, +$75k max over 90 days). The follow-ups this table raised are listed under "PI-2 wrap-up" in `docs/PI-2.md`. Open balance items stay in Jira LAG-33.

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
