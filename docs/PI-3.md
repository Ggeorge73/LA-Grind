# LA Grind — Program Increment 3 (Phase 3: Phone & City)

**PI goal:** keep the game, change how it feels. LA Grind becomes a **simulated-phone life RPG** in the style of Lagos Life: you live inside a phone of apps, look at a 3D low-poly Los Angeles, and click around rooms instead of reading menus.
**Why:** after PI-2 the Product Owner played the build and found it reads like a spreadsheet. The rules (sim) are right; the presentation is wrong. PI-3 rebuilds the presentation and adds the needs rhythm (eat, wash, see people).
**Decisions (Product Owner, PI-3 planning):**
- Low-poly **3D** world (Three.js), camera can rotate. The phone stays crisp DOM UI on top.
- Keep the **fast game clock** (pause / play / fast-forward). Real-time timers come with multiplayer.
- **Multiplayer** (chat, transfers, presence) moves to **PI-4**.
- **Needs** (Hunger, Hygiene, Social) join Energy and Spark in Sprint 14.

**Jira:** project `LAG`, label `PI-3`, sprint labels `sprint-11` … `sprint-14`. Epics: LAG-84 E12 Phone OS, LAG-85 E13 3D City, LAG-86 E14 Rooms & Character, LAG-87 E15 Needs.
**Working agreement:** unchanged (one PR per sprint, merged when CI is green, PO approves each new sprint).

## Design principle: the sim doesn't move

The sim (`src/sim`) stays pure and keeps every rule. PI-3 is mostly a new `src/ui`. Every phone app, map tap and room hotspot sends a command the game already understands (`TRAVEL`, `SUBMIT`, `SLEEP`, `WRITE_SESSION`, …) and shows the read models in `actions.ts`. The sim gains only what the new screens truly need: a bank ledger, a message inbox, appearance, and needs. Each comes with a save migration.

## The screen

| Device | Layout |
|---|---|
| Phone (portrait, the main target) | The 3D world fills the screen with a slim status strip. A phone button (or swipe up) raises **your in-game phone** over about 90% of the screen; swipe down to return to the world. |
| Tablet / desktop | World on the left, the phone pinned on the right as a device frame. |

**About 70% of play happens in the phone.** The world is where you look, travel and click things in rooms.

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

## Sprint 12 — 3D City (E13)

- **Stack:** `three` + `@react-three/fiber` + `@react-three/drei`, **lazy-loaded** so the phone works before the world arrives.
- **Fallback:** when WebGL is unavailable, the current SVG map is shown.
- **Budget:** ≤ 350 KB gzipped for the 3D chunk; ≤ 150 draw calls; aim for 30 fps on a mid-range phone.
- **Accessibility:** `prefers-reduced-motion` turns off camera flights.
- **The city:** six districts (NoHo, Burbank, Hollywood, WeHo, Silver Lake, Santa Monica) as low-poly tiles in their real relative positions, with the 405 as a ribbon and the ocean to the west. Every mesh is procedural (boxes, extrusions, instanced buildings), so no 3D artist is needed. Each district gets one landmark:
  - a hillside sign reading **LA GRIND**, not the trademarked one
  - a backlot water tower
  - a pier with a Ferris wheel
  - the Strip's billboards
  - the reservoir
  - an arts-district warehouse
- **Day and night** follow the game clock: sun angle, sky colour, window lights after 19:00.
- **Interaction:** tap a district to get a card (what's there, open gigs, travel time and cost) with **Ride there**. That dispatches `TRAVEL`, and a car (or bus when the car is dead) drives the road while the clock runs. A pin marks where you are, and traffic on the 405 is drawn heavier at rush hour.

## Sprint 13 — Rooms & Character (E14)

**Character creator** at the start of a new run (cosmetic): body, skin tone, hair style and colour, outfit, one accessory. You see your low-poly avatar in rooms and on the map pin. Save v9 adds `player.appearance`.

**Dioramas:** small 3D rooms seen at an angle, with glowing **hotspots** that dispatch existing commands:

| Place | Hotspots |
|---|---|
| Your apartment (one look per archetype: NoHo couch-surf, Burbank studio, Silver Lake loft, Hollywood Hills guest house) | Bed → Sleep · Desk → Write / Make beat / Deck · Mirror → (S14) Shower · Fridge → (S14) Eat · Door → Rides |
| Coffee shop (WeHo) | Counter → Barista shift |
| Casting office (Hollywood) | Front desk → Send submission for gigs held here |
| Studio lot (Burbank) | Soundstage → Shoot episode · Writers' room → Room day |
| Recording studio | Booth → Record session |
| Beach (Santa Monica) | Boardwalk → Beach walk (Spark) |

Walking into a district with a diorama shows it. The phone still offers every action, so rooms are a faster, nicer way in, never the only way.

## Sprint 14 — Needs & polish (E15)

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
| 12 | 3D City: Three.js world, districts, travel, day/night | E13 LAG-85 (stories at sprint planning) |
| 13 | Rooms & Character: creator, apartment and place dioramas (save v9) | E14 LAG-86 (stories at sprint planning) |
| 14 | Needs & polish: Hunger, Hygiene, Social, food/hangout apps, LAG-83, LAG-77 (save v10) | E15 LAG-87 (stories at sprint planning) |

## Out of PI-3

- **PI-4: Shared world.** Accounts, a server running the same reducer, a shared clock, Feed and Messages between real players, money transfers, leaderboards, presence per district, moderation.
- **Still open:**
  - native simulator runs (LAG-34)
  - Nepo high-tier exposures (LAG-56)
  - open-mic and late-venue items (LAG-70)
