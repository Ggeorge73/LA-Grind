# LA Grind — Program Increment 1 (Phase 1: Playable Slice)

**PI goal:** a playable single-player vertical slice of LA Grind (film, TV, music) that runs in a browser and packages for iOS and Android from one codebase.
**Source of truth for rules:** Build Prompt v3 (sections 3–7).
**Jira project:** LA Grind (`LAG`). Ticket keys are filled in once the project exists.

## Working agreement

- One sprint = one pull request from `claude/great-brahmagupta-7ff1zn` into `main`. Each ticket = one or more commits whose message starts with its key.
- **Green** = CI passes (typecheck, tests, build) on the PR head. Green sprint PRs are merged; the ticket then moves to Done.
- The Product Owner approves the start of every sprint after Sprint 1.
- Definition of Done: code in `main`, tests for any rule it adds, no rule logic outside `src/sim/`, no Capacitor import outside `src/platform/`.

## Development team

| Role | Owns | Label in Jira |
|---|---|---|
| Product Owner | Priorities, sprint approval | — (you) |
| Tech Lead / Scrum Master | Architecture, reviews, merges, docs | `team-tech-lead` |
| Simulation Engineer | `src/sim/` rules, reducer, clock | `team-sim` |
| Content Designer | Data tables, satire copy, parody names | `team-content` |
| Frontend Engineer | React UI, store, HUD, map | `team-frontend` |
| Platform Engineer | Tooling, CI, adapters, Capacitor | `team-platform` |
| QA & Balance Engineer | Tests, balance tool, play-testing, a11y | `team-qa` |

The engineers are Claude agents working in parallel; Jira assignee is the PO account (the only Jira user), with the owning role in the label.

## Epics

| Epic | Scope |
|---|---|
| E1 Simulation Core | types, constants, RNG, formulas, clock, reducer |
| E2 Game Systems | jobs, travel, opportunities, overdraft, The Trades |
| E3 Platform & Persistence | storage, lifecycle, haptics, saves |
| E4 Player Interface | screens, HUD, map, panels, feeds |
| E5 Mobile Packaging | Capacitor, app feel, icons, splash |
| E6 Quality & Balance | reference tests, balance tool, play-test, docs |

## Sprint plan

### Sprint 1 — "The Engine Room" (foundation and formulas)
| # | Ticket | Epic | Owner |
|---|---|---|---|
| 1.1 | Scaffold Vite + React + TS strict + Tailwind + Vitest + Zustand; scripts; CI workflow | E5 | platform |
| 1.2 | Sim types and single `constants.ts` | E1 | sim |
| 1.3 | Seeded RNG (`rng.ts`) with determinism tests | E1 | sim |
| 1.4 | Content tables: archetypes, jobs, locations, travel matrix | E2 | content |
| 1.5 | Formulas: odds, payouts, clout tiers, commute, burnout | E1 | sim |
| 1.6 | Reference tests: 11 odds, payouts, commute 120 min, tier thresholds | E6 | qa |

### Sprint 2 — "Clock In" (reducer, clock, systems)
| # | Ticket | Epic | Owner |
|---|---|---|---|
| 2.1 | Clock: 1-minute steps, energy/burnout drift, bills at 06:00, board refresh | E1 | sim |
| 2.2 | Reducer commands: TRAVEL, START_JOB, SLEEP, LEISURE, CLASS, HEADSHOTS, CAR_REPAIR, SKIP_TO_DONE | E1 | sim |
| 2.3 | Opportunities: templates for film/TV/music, daily board, PREP, SUBMIT, booked/exposed | E2 | sim + content |
| 2.4 | Overdraft countdown, "Moved Back Home", new run keeping 25% Network | E2 | sim |
| 2.5 | The Trades: headline templates and NPC headlines | E2 | content |
| 2.6 | Versioned saves with `migrate()`; invariant tests (ranges, determinism, JSON round-trip) | E6 | qa |
| 2.7 | `tools/balance.ts`: 4 archetypes × 4 strategies × 30 days | E6 | qa |

### Sprint 3 — "Lights, Camera, Interface" (playable in the browser)
| # | Ticket | Epic | Owner |
|---|---|---|---|
| 3.1 | Platform adapters: storage, lifecycle, haptics (web + native) | E3 | platform |
| 3.2 | Zustand store and timestamp-driven game loop (clamp 5 s/frame, pause on hide) | E3 | frontend |
| 3.3 | Archetype select screen | E4 | frontend |
| 3.4 | HUD, speed controls, busy indicator, Skip to done | E4 | frontend |
| 3.5 | SVG map with live travel time/energy/gas preview | E4 | frontend |
| 3.6 | Daily Hustle panel with costs, rewards, odds and disabled reasons | E4 | frontend |
| 3.7 | Opportunity board (Film/TV/Music filter), The Trades feed, activity log | E4 | frontend |
| 3.8 | Overdraft warning and run summary screen | E4 | frontend |

### Sprint 4 — "Wrap and Ship" (mobile and release readiness)
| # | Ticket | Epic | Owner |
|---|---|---|---|
| 4.1 | Capacitor config, `ios/` and `android/` projects, placeholder icon and splash | E5 | platform |
| 4.2 | App feel: portrait, safe areas, no bounce/zoom/selection, transitions, reduced motion | E5 | frontend |
| 4.3 | Accessibility pass: keyboard, labels, non-colour state, 44pt targets, 360 px | E6 | qa |
| 4.4 | Play-test the "Done means" checklist in a phone-sized browser; screenshots | E6 | qa |
| 4.5 | README (run/test/balance/native builds, balance table) and ARCHITECTURE.md | E6 | tech-lead |

## Out of scope for PI 1 (from the roadmap)

Careers (Phase 2), shared world and accounts (Phase 3), social and co-op (Phase 4), purchases, ads, analytics.
