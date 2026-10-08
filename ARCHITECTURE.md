# LA Grind: Architecture

The simulation is a calculator and the screen is its display. Every rule lives in pure functions in `src/sim/`. React only shows state and sends commands, and Capacitor only packages the result. That separation lets the same rules be unit-tested, balance-run headless, saved as JSON, and moved to a server in Phase 3 without a rewrite.

## Data model (`src/sim/types.ts`)

| Brief's name | Where it lives | Holds |
|---|---|---|
| **WorldState** | `GameState` | `minute` (absolute game minutes; day = minute / 1440), `seed` + `rngState`, `activity` (what the player is busy doing), `overdraft`, `trades` (The Trades), `log`, `stats`, `status` (`playing` / `movedHome`), `version` |
| **Player** | `GameState.player` | archetype, home, location, cash, Energy, Burnout, Spark, `creativeBurnout` |
| **CareerProgress** | `player.skills`, `player.rp`, `player.network`, `player.guildVouchers` | Acting/Writing/Directing/Music, Reputation Points (Clout Tier is *derived* by `cloutTier(rp)`), Network, guild vouchers |
| **Inventory** | `player.hasHeadshots`, `player.carHealth` | One-time headshots, car condition |
| **Opportunity / JobBoard** | `GameState.board: Opportunity[]` + `content/jobs.ts` | Today's opportunities (medium, skill, tier, location, window, prep, status), and the fixed survival-job table |
| **Location** | `content/locations.ts`, `content/travel.ts` | Six neighbourhoods with map positions, leisure spots, classes, symmetric travel matrix with 405 flags |

| **Project** (PI-2) | `GameState.project`, `GameState.credits` | The one active career project (a medium-tagged pipeline of stages: develop → finance → crew → shoot → post → festival), its scores, budget, crew, festival submissions and distribution offers; finished projects become credits |

Balance numbers live only in `constants.ts` and `content/`. Adding a gig, job, festival or headline means adding a row.

**Project engine (`project.ts`).** Every career stage is one of four reusable kinds: `work` (timed sessions that score 0–100), `raise` (pitches with odds), `hire` (pick from a pool) and `circuit` (submit to tiered venues; results land at 06:00). Film uses all four; Music and TV will be new pipelines over the same kinds. Festival results are resolved by the clock's 06:00 tick, next to bills and the board refresh.

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
- **Events drive feedback:** `BOOKED`, `REJECTED`, `EXPOSED`, `BILLS_CHARGED`, `OVERDRAFT_STARTED`, `TIER_CHANGED` and the rest feed the activity log (`describe.ts`), toasts, haptics and The Trades. In Phase 3 they become the shared feed.
- **Read models for the UI:** `actions.ts` lists the available actions, travel quotes and opportunity odds, so components contain no rules.
- **Time:** the loop (`store/loop.ts`) takes elapsed time from `requestAnimationFrame` timestamps, clamps catch-up to 5 s per frame, and advances whole game minutes. It pauses and saves when the app is backgrounded, and on resume discards the time away, so nothing happens offline.

## Platform adapter (`src/platform/`)

| Interface | Web | iOS / Android (Capacitor) |
|---|---|---|
| `storage` | `localStorage` | Preferences plugin (native key-value store the OS won't clear) |
| `lifecycle` | `visibilitychange` / `pagehide` | App plugin `pause` / `resume` |
| `haptics` | no-op | Haptics plugin (tap, success, warning) |

`index.ts` picks the implementation with `Capacitor.isNativePlatform()`. **Nothing outside `src/platform/` imports a Capacitor plugin.** Saves are versioned JSON strings, and `migrate()` upgrades old versions step by step (v1 → v2 added careers; v2 → v3 added festival submissions and offers).

## Phase 3: moving the rules to a server

The reducer is already the shape a server needs: `(state, command) → (state, events)`, with no I/O, clock or randomness of its own.

1. **Server owns state.** A Supabase Edge Function (or a Postgres RPC) loads the player's `GameState` row, runs the *same* `step()` from a shared package, and writes the new state with the events inside a transaction. Row Level Security limits each player to their own row.
2. **Client sends commands, not results.** `store.dispatch` posts the command. The client may run `step()` locally to show the result instantly (prediction), then accepts the server's state as the truth.
3. **Shared clock.** World time moves to the server. Personal bills are charged only for days the player actually played, so a weekend away is not a game over, and "Skip to done" and the speed controls are removed.
4. **Events become the feed.** The server writes events to a `trades` table, and Supabase Realtime pushes them to everyone as the live shared Trades.
5. **Seeds stay server-side,** so players cannot predict rolls.

Phase 4 (presence, chat, co-op productions) adds rooms keyed by location, plus moderation, reporting and blocking before any player-to-player text ships.
