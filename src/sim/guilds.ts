// Guilds & unions (Sprint 10): per-guild vouchers, membership, dues, scale minimums, the health plan and Global Rule One.
import * as C from './constants';
import { GUILD_SKILLS } from './content/guilds';
import { GUILD_FLAVOR, WRITERS_HEADLINES } from './content/writersFlavor';
import type { Rng } from './rng';
import type { GameEvent, GameState, GuildState, Player, Skill } from './types';
import { addHeadline, fillTemplate, who } from './world';

export const emptyGuilds = (): Record<Skill, GuildState> =>
  Object.fromEntries(
    GUILD_SKILLS.map((g) => [g, { vouchers: 0, member: false, joinedMinute: null, earnedThisCycle: 0, healthPlan: false }]),
  ) as Record<Skill, GuildState>;

export const isMember = (p: Player, skill: Skill): boolean => p.guilds[skill].member;
export const hasHealthPlan = (p: Player): boolean => GUILD_SKILLS.some((g) => p.guilds[g].member && p.guilds[g].healthPlan);
export const guildName = (skill: Skill): string => GUILD_FLAVOR[skill].short;

/** Tier 1 gigs are non-union. Members of that skill's guild can't take them (Global Rule One). */
export const isNonUnionTier = (tier: number): boolean => tier < C.GUILD_VOUCHER_MIN_TIER;

/** A qualifying job in a skill earns a voucher toward that guild (up to the 3 needed to join). */
export function grantVoucher(s: GameState, events: GameEvent[], skill: Skill): void {
  const g = s.player.guilds[skill];
  if (g.member || g.vouchers >= C.GUILD_VOUCHERS_NEEDED) return;
  g.vouchers += 1;
  events.push({ type: 'GUILD_VOUCHER', guild: skill, total: g.vouchers });
}

/** Union pay counts toward the member's health-plan threshold. */
export function recordUnionEarnings(s: GameState, skill: Skill, amount: number): void {
  const g = s.player.guilds[skill];
  if (g.member && amount > 0) g.earnedThisCycle += amount;
}

/** Contract scale minimum: members are paid at least GUILD_CONTRACT_MINIMUM × the offer. */
export const contractPay = (p: Player, skill: Skill, weeklyPay: number): number =>
  Math.round(weeklyPay * (isMember(p, skill) ? C.GUILD_CONTRACT_MINIMUM : 1));

export function joinGuild(s: GameState, rng: Rng, skill: Skill, events: GameEvent[]): void {
  const g = s.player.guilds[skill];
  g.member = true;
  g.joinedMinute = s.minute;
  g.earnedThisCycle = 0;
  g.healthPlan = false;
  events.push({ type: 'GUILD_JOINED', guild: skill, fee: C.GUILD_JOIN_FEE });
  addHeadline(s, events, fillTemplate(rng.pick(WRITERS_HEADLINES.guildJoined), { who: who(s), guild: guildName(skill) }), true);
}

/** 06:00 on days 31, 61, …: dues for every membership, and the health plan for the next cycle. */
export function resolveDues(s: GameState, events: GameEvent[], day: number): void {
  if (day <= 1 || (day - 1) % C.GUILD_DUES_CYCLE_DAYS !== 0) return;
  const members = GUILD_SKILLS.filter((g) => s.player.guilds[g].member);
  if (members.length === 0) return;
  for (const skill of members) {
    const g = s.player.guilds[skill];
    const covered = g.earnedThisCycle >= C.HEALTH_PLAN_THRESHOLD;
    if (covered !== g.healthPlan) events.push({ type: 'HEALTH_PLAN', guild: skill, active: covered });
    g.healthPlan = covered;
    g.earnedThisCycle = 0;
  }
  const total = C.GUILD_DUES * members.length;
  s.player.cash -= total;
  events.push({ type: 'GUILD_DUES', guilds: members, total });
}
