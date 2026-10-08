# LA Grind — Program Increment 1 (Phase 1: Playable Slice)

**PI goal:** a playable single-player vertical slice of LA Grind (film, TV, music) that runs in a browser and packages for iOS and Android from one codebase.
**Source of truth for rules:** Build Prompt v3 (sections 3–7).
**Jira project:** [LA Grind (`LAG`)](https://georgeaolugbenga.atlassian.net/jira/software/projects/LAG/list). Sprints are tracked with the labels `sprint-1` … `sprint-4` and `PI-1` (the Jira connector cannot create board sprints).

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
| E1 (LAG-1) Simulation Core | types, constants, RNG, formulas, clock, reducer |
| E2 (LAG-2) Game Systems | jobs, travel, opportunities, overdraft, The Trades |
| E3 (LAG-3) Platform & Persistence | storage, lifecycle, haptics, saves |
| E4 (LAG-4) Player Interface | screens, HUD, map, panels, feeds |
| E5 (LAG-5) Mobile Packaging | Capacitor, app feel, icons, splash |
| E6 (LAG-6) Quality & Balance | reference tests, balance tool, play-test, docs |

## Sprint plan

### Sprint 1 — "The Engine Room" (foundation and formulas)
| Key | Ticket | Epic | Owner |
|---|---|---|---|
| LAG-7 | Scaffold Vite + React + TS strict + Tailwind + Vitest + Zustand; scripts; CI workflow | E5 | platform |
| LAG-8 | Sim types and single `constants.ts` | E1 | sim |
| LAG-9 | Seeded RNG (`rng.ts`) with determinism tests | E1 | sim |
| LAG-10 | Content tables: archetypes, jobs, locations, travel matrix | E2 | content |
| LAG-11 | Formulas: odds, payouts, clout tiers, commute, burnout | E1 | sim |
| LAG-12 | Reference tests: 11 odds, payouts, commute 120 min, tier thresholds | E6 | qa |

### Sprint 2 — "Clock In" (reducer, clock, systems)
| Key | Ticket | Epic | Owner |
|---|---|---|---|
| LAG-13 | Clock: 1-minute steps, energy/burnout drift, bills at 06:00, board refresh | E1 | sim |
| LAG-14 | Reducer commands: TRAVEL, START_JOB, SLEEP, LEISURE, CLASS, HEADSHOTS, CAR_REPAIR, SKIP_TO_DONE | E1 | sim |
| LAG-15 | Opportunities: templates for film/TV/music, daily board, PREP, SUBMIT, booked/exposed | E2 | sim + content |
| LAG-16 | Overdraft countdown, "Moved Back Home", new run keeping 25% Network | E2 | sim |
| LAG-17 | The Trades: headline templates and NPC headlines | E2 | content |
| LAG-18 | Versioned saves with `migrate()`; invariant tests (ranges, determinism, JSON round-trip) | E6 | qa |
| LAG-19 | `tools/balance.ts`: 4 archetypes × 4 strategies × 30 days | E6 | qa |

### Sprint 3 — "Lights, Camera, Interface" (playable in the browser)
| Key | Ticket | Epic | Owner |
|---|---|---|---|
| LAG-20 | Platform adapters: storage, lifecycle, haptics (web + native) | E3 | platform |
| LAG-21 | Zustand store and timestamp-driven game loop (clamp 5 s/frame, pause on hide) | E3 | frontend |
| LAG-22 | Archetype select screen | E4 | frontend |
| LAG-23 | HUD, speed controls, busy indicator, Skip to done | E4 | frontend |
| LAG-24 | SVG map with live travel time/energy/gas preview | E4 | frontend |
| LAG-25 | Daily Hustle panel with costs, rewards, odds and disabled reasons | E4 | frontend |
| LAG-26 | Opportunity board (Film/TV/Music filter), The Trades feed, activity log | E4 | frontend |
| LAG-27 | Overdraft warning and run summary screen | E4 | frontend |

### Sprint 4 — "Wrap and Ship" (mobile and release readiness)
| Key | Ticket | Epic | Owner |
|---|---|---|---|
| LAG-28 | Capacitor config, `ios/` and `android/` projects, placeholder icon and splash | E5 | platform |
| LAG-29 | App feel: portrait, safe areas, no bounce/zoom/selection, transitions, reduced motion | E5 | frontend |
| LAG-30 | Accessibility pass: keyboard, labels, non-colour state, 44pt targets, 360 px | E6 | qa |
| LAG-31 | Play-test the "Done means" checklist in a phone-sized browser; screenshots | E6 | qa |
| LAG-32 | README (run/test/balance/native builds, balance table) and ARCHITECTURE.md | E6 | tech-lead |

## Out of scope for PI 1 (from the roadmap)

Careers (Phase 2), shared world and accounts (Phase 3), social and co-op (Phase 4), purchases, ads, analytics.
