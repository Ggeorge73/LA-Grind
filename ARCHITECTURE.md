# LA Grind: Architecture

The simulation is a calculator and the screen is its display. Every rule lives in pure functions in `src/sim/`. React only shows state and sends commands, and Capacitor only packages the result. That separation lets the same rules be unit-tested, balance-run headless, saved as JSON, and moved to a server in Phase 3 without a rewrite.

## Data model (`src/sim/types.ts`)

| Brief's name | Where it lives | Holds |
|---|---|---|
| **WorldState** | `GameState` | `minute` (absolute game minutes; day = minute / 1440), `seed` + `rngState`, `activity` (what the player is busy doing), `overdraft`, `trades` (The Trades), `log`, `stats`, `status` (`playing` / `movedHome`), `version` |
| **Player** | `GameState.player` | archetype, home, location, cash, Energy, Burnout, Spark, `creativeBurnout`, `fans` (music) |
| **CareerProgress** | `player.skills`, `player.rp`, `player.network`, `player.guilds` | Acting/Writing/Directing/Music, Reputation Points (Clout Tier is *derived* by `cloutTier(rp)`), Network, per-guild vouchers and membership |
| **Inventory** | `player.hasHeadshots`, `player.carHealth` | One-time headshots, car condition |
| **Opportunity / JobBoard** | `GameState.board: Opportunity[]` + `content/jobs.ts` | Today's opportunities (medium, skill, tier, location, window, prep, status), and the fixed survival-job table |
| **Location** | `content/locations.ts`, `content/travel.ts` | Six neighbourhoods with map positions, leisure spots, classes, symmetric travel matrix with 405 flags |

| **Project** (PI-2) | `GameState.project`, `GameState.credits` | The one active career project (a medium-tagged pipeline of stages: develop → finance → crew → shoot → post → festival), its scores, budget, crew, festival submissions and distribution offers; finished projects become credits |

Balance numbers live only in `constants.ts` and `content/`. Adding a gig, job, festival or headline means adding a row.

**Project engine (`project.ts`).** Every career stage is one of four reusable kinds: `work` (timed sessions that score 0–100), `raise` (pitches with odds), `hire` (pick from a pool) and `circuit` (submit to tiered venues; results land at 06:00). Film and music both use all four; TV's spec pilot (write → deck → agent → staffing) is a third pipeline with no budget or crew. `content/projects.ts` is the single registry of pipelines, scales and crew roles per medium; scale ids are unique across media, so `START_PROJECT { scale }` also picks the medium. Music's release week is a `circuit` resolved day by day at 06:00 (streams, royalties, Fans, chart position). Around the record, `musicBiz.ts` runs the music business that is not a project stage: label deals (a `raise` variant in *Book the studio*), live shows (an evening activity gated by Fans), the beat store and the catalogue, whose daily lease and sync-placement rolls also happen in the 06:00 tick. A catalogue record can be put on a film's soundtrack, the first cross-career link.

**TV, the actor's side (`tv.ts`).** Pilot season is a calendar rule (days 8–17 of each 30-day cycle) that adds pilot rows to the normal opportunity board. Submitting to a pilot doesn't roll at once: it opens a `callback` in `GameState`, a small blocking state machine of three director notes answered with `CALLBACK_PICK`. While a callback is open, `whyNot` refuses everything else, and an unfinished one resolves at the next 06:00. Booked pilots wait a week for a network decision; a pickup becomes a `contract` with a weekly 06:00 payday and an episode duty (`SHOOT_EPISODE`). Festival results are resolved by the clock's 06:00 tick, next to bills and the board refresh.

**TV, the writer's side and guilds (`tv.ts`, `guilds.ts`).** A spec pilot's staffing season rolls at 06:00 every 5 days; a yes becomes the same `contract`, with `kind: 'writer'`. A writer's weekly duty is `ROOM_DAY`, which ends by opening a `roomEvent`: a second small blocking state (like the callback) answered with `ROOM_CHOICE` and auto-answered at 06:00. Choices move `favor`, which decides the wrap (promoted, asked back, not asked back). `guilds.ts` holds the four guilds: jobs in a skill grant that guild's vouchers; `JOIN_GUILD` at the guild's HQ makes you a member (union rate in that skill, ×1.25 contract minimum, Global Rule One in `whyNot`). The 06:00 tick charges dues every 30 days and sets the health plan, which slows Burnout.

## Command → event flow

```
UI tap ──► store.dispatch(Command) ──► step(state, cmd) ──► { state', events[] }
                                         │
                       whyNot(state, cmd) ── rejects with a reason (also used to grey out buttons)
                                         │
                       begin(): pay up-front costs, set state.activity (actions occupy time)
                                         │
Game loop ──► ADVANCE n minutes ──► clock.tick() × n:
                 energy/burnout/spark drift → activity completes (pay, odds roll, RP, headlines)
                 → 06:00 bills + new board + NPC headlines → overdraft check
```

- **Deterministic:** randomness comes only from a seeded mulberry32 whose state is stored in `GameState`. The same seed and the same commands give the same result, which is tested.
- **Events drive feedback:** `BOOKED`, `REJECTED`, `EXPOSED`, `BILLS_CHARGED`, `OVERDRAFT_STARTED`, `TIER_CHANGED` and the rest feed the activity log (`describe.ts`), the phone's notification banners, haptics and The Trades. At the end of every `step()`, `inbox.ts` also turns events into text messages from your contacts. In PI-4 they become the shared feed.
- **Money has a paper trail:** every cash change goes through `earn()` or `spend()` in `world.ts`, which write a labelled `ledger` row for the Bank app. A test checks that the cash change equals the sum of the new rows after every step.
- **Read models for the UI:** `actions.ts` lists the available actions, travel quotes and opportunity odds, so components contain no rules.
- **Time:** the loop (`store/loop.ts`) takes elapsed time from `requestAnimationFrame` timestamps, clamps catch-up to 5 s per frame, and advances whole game minutes. It pauses and saves when the app is backgrounded, and on resume discards the time away, so nothing happens offline.

## The phone UI (`src/ui/phone/`, PI-3)

The game is played through an in-game smartphone. `GameScreen` lays out a **world** layer (a 2D sky placeholder until the Sprint 12 3D city) and the **phone**. On a phone-sized screen the phone is a sheet raised over the world; at 900px and wider, the world is on the left and the phone sits in a device frame. The phone has a status bar, a home screen and nine apps (`content/phoneFlavor.ts` names them), and each app wraps the old screen components, so every rule still comes from the `actions.ts` read models. Phone navigation (which app is open, which thread) is UI-only state in `store/phone.ts`; it is not saved and not part of the sim.

## Platform adapter (`src/platform/`)

| Interface | Web | iOS / Android (Capacitor) |
|---|---|---|
| `storage` | `localStorage` | Preferences plugin (native key-value store the OS won't clear) |
| `lifecycle` | `visibilitychange` / `pagehide` | App plugin `pause` / `resume` |
| `haptics` | no-op | Haptics plugin (tap, success, warning) |

`index.ts` picks the implementation with `Capacitor.isNativePlatform()`. **Nothing outside `src/platform/` imports a Capacitor plugin.** Saves are versioned JSON strings, and `migrate()` upgrades old versions step by step (v1 → v2 added careers; v2 → v3 festival submissions and offers; v3 → v4 music: Fans, studio and release week; v4 → v5 music business: beats, catalogue, label and soundtrack; v5 → v6 TV: callback, pending pilots, series contract; v6 → v7 writers' room and guilds: old vouchers become Acting vouchers; v7 → v8 the phone: an empty ledger and inbox).

## Phase 3: moving the rules to a server

The reducer is already the shape a server needs: `(state, command) → (state, events)`, with no I/O, clock or randomness of its own.

1. **Server owns state.** A Supabase Edge Function (or a Postgres RPC) loads the player's `GameState` row, runs the *same* `step()` from a shared package, and writes the new state with the events inside a transaction. Row Level Security limits each player to their own row.
2. **Client sends commands, not results.** `store.dispatch` posts the command. The client may run `step()` locally to show the result instantly (prediction), then accepts the server's state as the truth.
3. **Shared clock.** World time moves to the server. Personal bills are charged only for days the player actually played, so a weekend away is not a game over, and "Skip to done" and the speed controls are removed.
4. **Events become the feed.** The server writes events to a `trades` table, and Supabase Realtime pushes them to everyone as the live shared Trades.
5. **Seeds stay server-side,** so players cannot predict rolls.

Phase 4 (presence, chat, co-op productions) adds rooms keyed by location, plus moderation, reporting and blocking before any player-to-player text ships.
