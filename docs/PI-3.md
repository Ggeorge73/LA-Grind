# LA Grind — Program Increment 3 (Phase 3: Phone & City)

**PI goal:** keep the game, change how it feels. LA Grind becomes a **simulated-phone life RPG** in the style of Lagos Life: you live inside a phone of apps, look at a 3D low-poly Los Angeles, and click around rooms instead of reading menus.
**Why:** after PI-2 the Product Owner played the build and found it reads like a spreadsheet. The rules (sim) are right; the presentation is wrong. PI-3 rebuilds the presentation and adds the needs rhythm (eat, wash, see people).
**Decisions (Product Owner, PI-3 planning):**
- Low-poly **3D** world (Three.js), camera can rotate. The phone stays crisp DOM UI on top.
- Keep the **fast game clock** (pause / play / fast-forward). Real-time timers come with multiplayer.
- **Multiplayer** (chat, transfers, presence) moves to **PI-4**.
- **Needs** (Hunger, Hygiene, Social) join Energy and Spark in Sprint 14.

**Jira:** project `LAG`, label `PI-3`, sprint labels `sprint-11` … `sprint-14`. Epics: LAG-84 E12 Phone OS, LAG-85 E13 3D Home, LAG-86 E14 Commute Runner, LAG-87 E15 City, You & Needs.
**Working agreement:** unchanged (one PR per sprint, merged when CI is green, PO approves each new sprint).

## Design principle: the sim doesn't move

The sim (`src/sim`) stays pure and keeps every rule. PI-3 is mostly a new `src/ui`. Every phone app, map tap and room hotspot sends a command the game already understands (`TRAVEL`, `SUBMIT`, `SLEEP`, `WRITE_SESSION`, …) and shows the read models in `actions.ts`. The sim gains only what the new screens truly need: a bank ledger, a message inbox, appearance, and needs. Each comes with a save migration.

## The screen (revised after the Sprint 11 review)

The Product Owner played Sprint 11 and redirected again with a Lagos Life screenshot: **the 3D room is the game, and the phone is a pocket tool.** A cutaway "dollhouse" apartment fills the screen. Your character lives in it and walks to tap-to-act spots. A slim floating bar on top shows the day, time, mood, Clout and cash, plus a phone button with an unread badge. The phone slides up over the room only when you pull it out.

The approved look is `prototypes/home-and-runner.html`: a grounded, dark-walled, warm-lit low-poly room and a golden-hour LA boulevard. A bright cartoon variant (`prototypes/toon-home-and-runner.html`) was tried and rejected.

## Sprint 11 — Phone OS (E12)

A phone home screen with a status bar (clock, cash, Energy, Spark; later the needs), app icons with unread badges, a home gesture/button, and notification banners. Banners replace toasts and are driven by the same sim events.

| App | Replaces | Contents |
|---|---|---|
| **Casting** | Gigs board | Today's board, odds, prep, pilot season, callbacks. |
| **Studio** | Projects tab | Film / music / spec pilot projects, crew, festivals, release week, beat store, catalogue. |
| **Bank** | HUD cash, overdraft banner | Balance, overdraft countdown, **transaction history** (new ledger), upcoming bills. |
| **Feed** | The Trades | Headlines as a social timeline; your posts badged. |
| **Messages** | Log + scattered offers | Threads with your agent, casting directors, A&Rs, the landlord, the network. Callbacks and room politics open from their thread. |
| **Rides** | Map tab + travel | Destinations with drive/bus time and cost. Rideshare *driving* lives here too (the job). |
| **Gigs** (side hustles) | Hustle tab jobs | Barista, PA, bar back, rideshare shifts, classes. |
| **Union** | Guilds section | Vouchers, join, dues, health plan. |
| **Settings** | — | Speed, new run, about. |

**Sim additions (save v8):**
- `ledger`: the last 200 money movements `{minute, amount, label, kind}`. Every cash change already has an event; the reducer now also writes a ledger row (an invariant test enforces this).
- `inbox`: message threads `{id, from, title, messages[], unread}` written by the sim when events happen (callback started, agent signed, label offer, pilot decision, staffing roll, dues, overdraft). Read/unread is a command (`READ_THREAD`).

## Sprint 12: 3D Home (E13, LAG-85)

- **Main screen:** the apartment from the prototype becomes the game's main screen when you're at home. Elsewhere, a street placeholder shows until Sprint 14's district interiors.
- **Stack:** `three` is lazy-loaded, so the phone works before the room arrives. When WebGL is unavailable, an accessible fallback list of the room's actions replaces it.
- **Character:** walks to a spot, then plays its action while the real activity runs. It lies down for sleep and sits for desk work.
- **Hotspots** come from `homeView()` in `actions.ts`; each dispatches real commands:

| Spot | Actions |
|---|---|
| Bed | Sleep 8h |
| Desk | Write the script / song / draft, Build the deck, Edit the cut (depending on your project stage), Make a beat |
| Ring light | Prep 1h for today's open audition with the best odds |
| TV | "Prestige TV binge", a new home leisure: 2h, free, +12 Spark (half of going out) |
| Front door | Opens Merge (Rides) until the runner arrives in Sprint 13 |
| Fridge, shower, table | Shown as "coming with Needs" until Sprint 14 |

- **HUD:** the slim top bar shows the day and time, mood, Clout, cash and the phone button with its unread badge. Next to it is the speed control, and a small panel shows Energy, Spark and Burnout. An action card at the bottom shows the selected spot's actions with effects, costs and disabled reasons, then a progress bar and "Skip to done".
- **Phone:** the Sprint 11 phone becomes the pocket overlay: closed by default, raised by the button. Notifications still drop in over the room.
- **Accessibility:** every spot is also a real button in an off-canvas list, reachable by keyboard and screen reader. The play-tests use that list too.

## Sprint 13: Commute Runner (E14, LAG-86)

- Every trip by car becomes the runner from the prototype, down a golden-hour LA boulevard:
  - three lanes: dodge cars, jump cones, roll under low-clearance signs;
  - coins to grab, and a parking officer who closes in after each bump.
- **Run length** comes from the real commute minutes; rush hour (07–10 and 16–19) adds traffic.
- **Results:**
  - coins become tips in the ledger;
  - arriving on time gives +5 Spark;
  - three bumps gets you ticketed: −$35, and you arrive late. "Late" lowers that day's audition odds at the destination.
- **"Take the bus"** keeps the old instant travel, for players who don't want to run.
- The sim gains a `COMMUTE_RESULT` command validated by the reducer: coin counts are capped by the run length, so the client can't mint money.

## Sprint 14: City, You & Needs (E15, LAG-87)

- **A 3D LA map** to pick destinations: the six districts with landmarks.
- **District interiors** with hotspots: casting office (Hollywood), studio lot (Burbank), coffee shop (WeHo), recording studio, and the beach.
- **A character creator** at the start of a run (cosmetic; save version bump).
- **The needs**, as below.

Three new needs join Energy and Spark. Each runs 0–100 and starts at 80.

| Need | Drains | Restored by | When low (< 25) |
|---|---|---|---|
| **Hunger** (fullness) | −4/h awake, −2/h asleep | Fridge snack (home, 30 min, $8, +30) · Food delivery app ($25, arrives in 45 min, +60) · Eat out at a district spot (1h, $15–40, +50, +10 Social) | Energy drains 25% faster; at 0, Energy is capped at 50. |
| **Hygiene** | −2.5/h awake; a work shift or shoot costs −10 more | Shower at home (30 min, +70) | Auditions and pitches −15% odds ("casting can smell desperation"). |
| **Social** | −1.5/h | Hangout app (2h, $0–30, +30, small Network chance) · eating out · playing a show · networking jobs | Spark regenerates at half speed. |

Needs show in the status bar and on the phone home screen. Save v10. The balance tool gains "ignores needs" vs "keeps needs above 50" strategies; target: ignoring needs should cost roughly 20–30% of income, not end the run by itself.

**Also in Sprint 14:**
- **LAG-83:** the writers'-room balance pass (staffing penalty per tier, room pay at or below series-regular pay, room quality feeding the wrap verdict).
- **LAG-77 item 2:** board marking for auto-resolved callbacks.

## Sprint plan

| Sprint | Theme | Jira |
|---|---|---|
| 11 | Phone OS: shell, apps, ledger, inbox (save v8) | E12 LAG-84 · LAG-88 sim · LAG-89 shell · LAG-90 apps · LAG-91 content · LAG-92 QA |
| 12 | 3D Home: the apartment is the main screen; hotspots run real commands; pocket phone | E13 LAG-85 (stories at sprint planning) |
| 13 | Commute Runner: every trip by car is the runner; tips, lateness, "Take the bus" | E14 LAG-86 |
| 14 | City, You & Needs: 3D map, district interiors, character creator, Hunger/Hygiene/Social, LAG-83, LAG-77 | E15 LAG-87 |

## Out of PI-3

- **PI-4: Shared world.** Accounts, a server running the same reducer, a shared clock, Feed and Messages between real players, money transfers, leaderboards, presence per district, moderation.
- **Still open:**
  - native simulator runs (LAG-34)
  - Nepo high-tier exposures (LAG-56)
  - open-mic and late-venue items (LAG-70)
