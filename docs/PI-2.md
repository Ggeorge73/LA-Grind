# LA Grind — Program Increment 2 (Phase 2: Careers)

**PI goal:** turn one-off gigs into careers. You don't just *book* a film; you *make* one, release music, and break into a writers' room.
**Order (Product Owner):** Film → Music → TV.
**Jira:** project `LAG`, label `PI-2`, sprint labels `sprint-5` … `sprint-10`. Epics: LAG-35 Project Engine, LAG-36 Film, LAG-37 Music, LAG-38 TV, LAG-39 Guilds & Unions.
**Working agreement:** unchanged from PI-1 (one PR per sprint, merged when CI is green, PO approves each new sprint).

## Design principle: one project engine, three careers

A career is a **Project**: a pipeline of stages tagged by medium. Every stage is one of four reusable kinds, so Music and TV are mostly data rows, not new systems.

| Stage kind | What the player does | Film uses it for | Music will use it for | TV will use it for |
|---|---|---|---|---|
| `work` | Timed sessions; each scores 0–100 from a skill + Spark + luck | Write the script, shoot days, edit | Write songs, record | Write the pilot |
| `raise` | Pitch meetings with odds; success adds money | Financing runs | Label advances | Pitch deck → network |
| `hire` | Pick people from a Network-sized pool; fees come out of the budget | Crew assembly | Band and producer | Writers' room staff |
| `circuit` | Submit to tiered venues; results arrive days later | Festival circuit | Release → streams → showcases | Pilot season |

A project's **quality** is the weighted average of its stage scores. The payoff is a pick of offers, paid in cash, RP and headlines.

## Film career (Sprints 5–6)

**Start a film** from the Projects tab. One active project at a time.

| Scale | Min Clout | Budget | Script sessions | Crew slots | Shoot days | Edit sessions | Best festival tier |
|---|---:|---:|---:|---:|---:|---:|---:|
| Short film | 1 | $2,000 | 2 | 2 | 2 | 1 | 2 |
| Micro-budget feature | 2 | $20,000 | 4 | 4 | 5 | 3 | 3 |
| Indie feature | 4 | $80,000 | 6 | 6 | 10 | 5 | 5 |

1. **Develop.** *Write* session: 3h, −15 Energy, −15 Spark, anywhere. Score `= clamp(20 + 0.6·Writing + 0.2·Spark + rand(0–10))`. Writing +1 per session. **Script quality** is the average score.
2. **Financing runs.** *Pitch* an investor: 2h, −10 Energy, at the investor's neighbourhood, at most one pitch a day.
   - Odds `= logistic((0.5·Script + 10·Clout + 0.3·Network − difficulty) / 12)`, clamped to 5–85%. Difficulty is 45 (short), 60 (micro) or 80 (indie).
   - A yes raises 20–60% of the budget depending on the investor (easy marks give less). *Self-fund* moves your own cash in instantly. The Nepo Baby's shortcut is intended.
3. **Crew assembly.** On entering this stage you get a candidate pool of `3 + Network/20` people (max 8): DP, Sound, Editor, Gaffer, AD, Production Designer and Composer.
   - Each has skill 1–5 and a fee of `budget × (0.04 + 0.03·skill)`, paid from the raised budget.
   - *Hire*: 1h meeting, −5 Energy. Filling every slot unlocks the shoot.
   - **Crew quality** = average skill × 20. Money left in the budget becomes **production value** (up to +10).
4. **Shoot** (Sprint 6). *Shoot day*: 10h, −45 Energy, on set at the project's location, call time 05:00–10:00. Score `= clamp(15 + 0.5·Directing + 0.25·Crew + 0.1·Acting + rand(0–15))`. Directing +1 per day.
5. **Post** (Sprint 6). *Edit*: 4h, −20 Energy, anywhere. Score `= clamp(20 + 0.5·Directing + 4·Editor skill + rand(0–10))`; Editor skill is 0 if you didn't hire one.
6. **Festival circuit** (Sprint 6). Five parody festivals:

   | Tier | Festival | Fee | Wait |
   |---:|---|---:|---:|
   | 1 | NoHo Shorts Night | $25 | 3 days |
   | 2 | Silver Lake Underground | $50 | 5 days |
   | 3 | SlamDunce | $100 | 7 days |
   | 4 | Sunburnt | $150 | 10 days |
   | 5 | Canned | $200 | 14 days |

   - Results land at 06:00.
   - Acceptance odds `= logistic((Quality + 5·Clout − 20 − 15·tier) / 12)`.
   - An acceptance pays RP and a headline, and may bring an award and a **distribution offer** worth `budget × (0.3 + Quality/100) × [0.2, 0.4, 0.8, 1.2, 1.8][tier]`.
   - One submission per festival; the fee is paid up front and the odds are locked when you submit.
   - Award chance `= clamp((Quality − 50 − 5·tier) / 50, 0, 60%)`; an award doubles the festival's RP (60 / 120 / 225 / 375 / 600, raised ×1.5 in the Sprint 6 balance pass so a short film beats chasing Tier-1 gigs for RP).
   - Offer chance on acceptance `= 50% + Quality/200`. Parody distributors make the offers.
   - **Accepting an offer** releases the film: cash in, Network +5, and the project ends as a credit.
   - **Self-release** (once no results are pending): no cash, RP `= Quality × 0.5`.

**Film quality** `= 0.35·Script + 0.40·Shoot + 0.15·Post + 0.10·Crew + production value`, clamped to 0–100.

## Music career (Sprints 7–8)

Same engine, new pipeline: **write → book the studio → crew → record → release week**. Start a record from the Projects tab (one project at a time, film or music).

| Scale | Min Clout | Studio budget | Songs | Crew slots | Studio sessions | Stream multiplier |
|---|---:|---:|---:|---:|---:|---:|
| Single | 1 | $400 | 1 | 1 | 2 | 1× |
| EP | 2 | $4,000 | 4 | 2 | 5 | 2.5× |
| Album | 4 | $15,000 | 10 | 3 | 12 | 6× |

1. **Write songs** (`work`): 3h, −15 Energy, −15 Spark, anywhere. Score `= clamp(20 + 0.6·Music + 0.2·Spark + rand(0–10))`. Music +1 per song.
2. **Book the studio** (`raise`): self-fund the studio budget. (Label advances arrive in Sprint 8.)
3. **Crew** (`hire`): producer, engineer, session players and a feature from a Network-sized pool; fees come out of the studio budget, leftover becomes production value.
4. **Record** (`work`): 4h, −20 Energy, at the studio's neighbourhood. Score `= clamp(15 + 0.5·Music + 0.25·Crew + 0.1·Spark + rand(0–15))`. Music +1 per session.
5. **Release week** (`circuit`): press *Release* any time after recording. For 7 days, at 06:00:
   - Streams `= round((1,000 + 4·Fans) × (Quality/50)² × scale multiplier × 0.75^day × (1 + 0.5·promo))`, where promo is 1 if you promoted the day before.
   - Royalties $0.004 per stream. Fans gained `= streams × 2% × Quality/100`.
   - Chart position on *The Billbored Hot 100* `= 101 − 25·log₁₀(streams / 500)`; above 100 means it didn't chart.
   - *Promo* (2h, −10 Energy, −10 Spark, once a day, anywhere) boosts the next day.
   - After day 7 the record becomes a credit ("Peaked at #N" / "Didn't chart") and pays RP `= 3 × (101 − peak)` if it charted. (LAG-62 balance pass: single budget $600 → $400 and chart RP 2 → 3 per place, so a single is roughly break-even for the Bedroom Producer and beats a Tier-1 gig for RP.)

**Music quality** `= 0.40·Songs + 0.45·Recording + 0.15·Crew + production value`. **Fans** is a new stat that persists across releases (the Bedroom Producer starts with some). Label deals, tours, beat sales and placements are Sprint 8.

### Music business (Sprint 8)

- **Label deals** (in *Book the studio*): pitch a label at its neighbourhood, once a day (2h, −10 Energy).
  - Odds `= logistic((0.5·Songs + 10·Clout + min(40, Fans/100) − difficulty) / 12)`, clamped 5–85%. Difficulty: Single 40, EP 55, Album 75, plus the label's modifier.
  - A yes signs the record: an advance of 40–100% of the studio budget (by label), the label keeps 30–70% of royalties, and marketing multiplies release-week streams by 1.1–2×. One label per record; self-fund the rest.
- **Live shows**: `Play a show` at a venue, 19:00–22:00 start, 3h, −30 Energy, once a night, after your first release.
  - Six venues from a 40-cap open mic (0 Fans needed, $5) to a 6,000-cap arena (20,000 Fans, $40).
  - Tickets `= min(capacity, Fans × 3% × (0.8–1.2))`; you keep 60% of the door. Fans +15% of tickets; RP +1 per 50 tickets.
- **Beat store**: `Make a beat` at home, 2h, −10 Energy, −10 Spark. Quality `= clamp(10 + 0.7·Music + rand(0–20))`. Up to 8 beats.
  - Each 06:00 each beat may lease: chance `= min(40%, Quality/400 + Fans/20,000) × 0.9^leases`, fee `= $20 + 1.5·Quality`.
- **Catalogue and placements**: every finished record joins your catalogue.
  - Each 06:00 each record may be licensed by a parody production: chance `= 2% × Quality/50` (×1.5 if it charted), fee `= $300 × stream multiplier × Quality/50`, +10 RP.
  - In a film's post stage you can put one of your records on the soundtrack (once per film): film quality `+ min(8, record Quality/10)`.

## Sprint plan

| Sprint | Name | Scope |
|---|---|---|
| 5 | **Greenlight** (Film I) — LAG-40…46 | Project engine + save migration v2; Develop, Financing, Crew stages; Projects tab |
| 6 | **Festival Circuit** (Film II) — LAG-47…50 | Shoot, Post, festivals, distribution, film headlines; balance pass incl. LAG-33; film play-test |
| 7 | **The Drop** (Music I) — LAG-51, LAG-57…62 | Write → record → release; Fans and Streams; release-week chart in The Trades |
| 8 | **Deal Memo** (Music II) — LAG-52, LAG-63…69 | Label deal, tour, beat sales, song placements into film and TV projects |
| 9 | **Pilot Season** (TV I) — LAG-53 | Callback mini-game; pilot season circuit |
| 10 | **Writers' Room** (TV II) — LAG-54, LAG-55 | Pitch deck → agent meeting → writers' room; full guild and union membership |

Music and TV get a detailed design at their sprint planning, following the same table format.

## Team (unchanged)

Tech Lead (Claude), Simulation Engineer, Content Designer, Frontend Engineer, Platform Engineer, QA & Balance Engineer.
