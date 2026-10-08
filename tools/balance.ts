// Headless balance run: every archetype × four scripted strategies × 30 in-game days.
// Usage: npm run balance
import { ARCHETYPES, ARCHETYPE_IDS } from '../src/sim/content/archetypes';
import { oddsFor } from '../src/sim/board';
import { bookingPayout, cloutTier, dayOf, hourOf } from '../src/sim/formulas';
import { newGame, step, whyNot } from '../src/sim/reducer';
import type { ArchetypeId, Command, GameState, Medium, Opportunity } from '../src/sim/types';

const DAYS = 30;
const SEED = 2026;
const IDLE_MINUTES = 30;

type Policy = (s: GameState) => Command | null;

const hour = (s: GameState) => hourOf(s.minute);
const day = (s: GameState) => dayOf(s.minute);
const go = (s: GameState, to: GameState['player']['location']): Command | null =>
  s.player.location === to ? null : { type: 'TRAVEL', to };

/** Go home and sleep until `wakeHour` (bounded to 1–10 hours). */
function sleepUntil(s: GameState, wakeHour: number): Command {
  const travel = go(s, s.player.home);
  if (travel) return travel;
  const hours = Math.max(1, Math.min(10, (wakeHour - hour(s) + 24) % 24 || 8));
  return { type: 'SLEEP', hours };
}

/** Best open opportunity in these media by expected pay, skipping tier 2+ without headshots. */
function bestOpp(s: GameState, media: Medium[]): Opportunity | null {
  const options = s.board.filter(
    (o) => o.status === 'open' && media.includes(o.medium) && (o.tier < 2 || s.player.hasHeadshots),
  );
  let best: Opportunity | null = null;
  let bestValue = -1;
  for (const o of options) {
    const value = oddsFor(s.player, o, 2) * bookingPayout(o.medium, o.tier).pay;
    if (value > bestValue) [best, bestValue] = [o, value];
  }
  return best;
}

/** Prep (2h if Spark allows) → travel → submit inside the window. Returns null when nothing to do yet. */
function chaseOpp(s: GameState, opp: Opportunity, prepByHour: number): Command | null {
  const h = hour(s);
  if (opp.prepHours < 2 && h < prepByHour && s.player.spark >= 20 && s.player.energy > 30)
    return { type: 'PREP', opportunityId: opp.id, hours: 2 };
  if (h >= opp.windowStart - 2 && h < opp.windowEnd - 1) {
    const travel = go(s, opp.location);
    if (travel) return travel;
    if (h >= opp.windowStart) return { type: 'SUBMIT', opportunityId: opp.id };
  }
  return null;
}

function noJob(): Policy {
  return (s) => (hour(s) >= 22 || hour(s) < 6 ? sleepUntil(s, 6) : null);
}

function baristaWeekdays(): Policy {
  let workedDay = -1;
  return (s) => {
    const h = hour(s);
    if (h >= 22 || h < 6) return sleepUntil(s, 6);
    const workday = day(s) % 7 >= 1 && day(s) % 7 <= 5;
    if (workday && workedDay !== day(s) && h >= 6 && h <= 11) {
      const travel = go(s, 'weho');
      if (travel) return travel;
      workedDay = day(s);
      return { type: 'START_JOB', jobId: 'barista' };
    }
    return go(s, s.player.home);
  };
}

function barbackPlusMusic(): Policy {
  let oppDay = -1;
  let workedDay = -1;
  return (s) => {
    const h = hour(s);
    // Night shift ends 01:00–03:00: sleep through the morning.
    if (h >= 1 && h < 11) return sleepUntil(s, 11);
    const d = h < 6 ? day(s) - 1 : day(s);
    // Commit to tonight's gig first; the bar shift only happens if there is still time after.
    if (oppDay !== d && h >= 11 && h < 22) {
      const opp = bestOpp(s, ['music']);
      if (!opp || h >= opp.windowEnd - 1) oppDay = d;
      else {
        const cmd = chaseOpp(s, opp, 17);
        if (cmd?.type === 'SUBMIT') oppDay = d;
        return cmd;
      }
    }
    if (workedDay !== d && h >= 18 && h <= 20) {
      const travel = go(s, 'weho');
      if (travel) return travel;
      workedDay = d;
      return { type: 'START_JOB', jobId: 'barback' };
    }
    if (h >= 21 || h < 1) return sleepUntil(s, 11);
    return null;
  };
}

function paPlusScreen(): Policy {
  let paDay = -1;
  let oppDay = -1;
  return (s) => {
    const h = hour(s);
    const d = day(s);
    // A PA day needs a rested body and no PA yesterday (14-hour days back to back burn people out).
    if (h >= 4 && h <= 6 && paDay !== d && paDay !== d - 1 && s.player.energy >= 80) {
      const travel = go(s, 'burbank');
      if (travel) return travel;
      if (h >= 5) {
        paDay = d;
        return { type: 'START_JOB', jobId: 'pa' };
      }
      return null;
    }
    if (h >= 21 || h < 4) return sleepUntil(s, 4);
    if (paDay !== d && oppDay !== d && h >= 6 && h < 17) {
      const opp = bestOpp(s, ['film', 'tv']);
      if (opp) {
        const cmd = chaseOpp(s, opp, 7);
        if (cmd?.type === 'SUBMIT') oppDay = d;
        if (cmd) return cmd;
        return null;
      }
    }
    return go(s, s.player.home);
  };
}

const STRATEGIES: Array<[string, () => Policy]> = [
  ['No job', noJob],
  ['Barista 5 days/week', baristaWeekdays],
  ['Bar back + 1 music gig/day', barbackPlusMusic],
  ['PA when rested + 1 screen gig/day', paPlusScreen],
];

interface Result {
  endCash: number;
  lowestCash: number;
  tier: number;
  bookings: number;
  brokeDay: number | null;
  movedHomeDay: number | null;
}

function simulate(archetype: ArchetypeId, makePolicy: () => Policy, days: number): Result {
  let s = newGame(archetype, SEED);
  const policy = makePolicy();
  const endMinute = s.minute + days * 1440;
  let lowest = s.player.cash;
  while (s.status === 'playing' && s.minute < endMinute) {
    let cmd: Command | null = s.activity ? { type: 'SKIP_TO_DONE' } : policy(s);
    if (!cmd || whyNot(s, cmd)) cmd = { type: 'ADVANCE', minutes: Math.min(IDLE_MINUTES, endMinute - s.minute) };
    s = step(s, cmd).state;
    lowest = Math.min(lowest, s.player.cash);
  }
  return {
    endCash: Math.round(s.player.cash),
    lowestCash: Math.round(lowest),
    tier: cloutTier(s.player.rp),
    bookings: s.stats.bookings,
    brokeDay: s.stats.brokeMinute === null ? null : dayOf(s.stats.brokeMinute),
    movedHomeDay: s.status === 'movedHome' ? dayOf(s.minute) : null,
  };
}

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US')}`;

console.log(`\nLA Grind balance run — ${DAYS} in-game days, seed ${SEED}\n`);
console.log('| Archetype | Strategy | End cash | Lowest cash | Tier | Bookings | Went broke | Moved home |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|');
for (const id of ARCHETYPE_IDS) {
  for (const [name, policy] of STRATEGIES) {
    const r = simulate(id, policy, DAYS);
    console.log(
      `| ${ARCHETYPES[id].name} | ${name} | ${money(r.endCash)} | ${money(r.lowestCash)} | ${r.tier} | ${r.bookings} | ${r.brokeDay === null ? '—' : `day ${r.brokeDay}`} | ${r.movedHomeDay === null ? '—' : `day ${r.movedHomeDay}`} |`,
    );
  }
}

console.log('\nNo-income runway (days before cash first drops below $0):\n');
console.log('| Archetype | Runway | Target |');
console.log('|---|---:|---:|');
const TARGET: Record<ArchetypeId, number> = { midwest: 22, producer: 36, indie: 40, nepo: 179 };
for (const id of ARCHETYPE_IDS) {
  const r = simulate(id, noJob, 400);
  const runway = r.brokeDay === null ? 'never' : `${r.brokeDay - 1} days`;
  console.log(`| ${ARCHETYPES[id].name} | ${runway} | ~${TARGET[id]} days |`);
}
console.log('');
