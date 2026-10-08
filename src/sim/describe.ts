// Plain-language activity-log lines for sim events. Returns null for events the log skips.
import { JOBS } from './content/jobs';
import { LEISURE, LOCATIONS } from './content/locations';
import { FESTIVALS } from './content/film';
import type { GameEvent } from './types';
import { formatMoney } from './world';

const pct = (p: number): string => `${Math.round(p * 1000) / 10}%`;

export function describeEvent(e: GameEvent): string | null {
  switch (e.type) {
    case 'ACTION_STARTED':
      return `Started: ${e.activity.label}.`;
    case 'ARRIVED':
      return `Arrived in ${LOCATIONS[e.location].name}.`;
    case 'JOB_PAID':
      return `${JOBS[e.jobId].name} shift done: +${formatMoney(e.amount)}.`;
    case 'NETWORK_GAINED':
      return `Made a contact: Network +${e.amount}.`;
    case 'WOKE_UP':
      return 'Woke up.';
    case 'LEISURE_DONE':
      return `${LEISURE[e.leisureId].name} recharged your Creative Spark.`;
    case 'SKILL_GAINED':
      return `${e.skill[0]!.toUpperCase()}${e.skill.slice(1)} +${e.amount}.`;
    case 'HEADSHOTS_TAKEN':
      return 'Headshots and press photos done. Tier 2+ doors are open.';
    case 'CAR_REPAIRED':
      return 'Car repaired.';
    case 'PREP_DONE':
      return `Prepped ${e.hours}h.`;
    case 'BOOKED':
      return `BOOKED (${pct(e.odds)} odds): ${e.opportunity.title}. +${formatMoney(e.pay)}, +${e.rp} RP.`;
    case 'REJECTED':
      return `Passed on (${pct(e.odds)} odds): ${e.opportunity.title}.`;
    case 'EXPOSED':
      return e.rpLost > 0
        ? `Exposed as out of your depth on ${e.opportunity.title}: −${e.rpLost} RP.`
        : `Exposed as out of your depth on ${e.opportunity.title}. Luckily you had no RP to lose.`;
    case 'BILLS_CHARGED':
      return `06:00 bills: −${formatMoney(e.amount)}.`;
    case 'BOARD_REFRESHED':
      return `${e.count} new opportunities on the board.`;
    case 'TIER_CHANGED':
      return e.to > e.from ? `Clout up: Tier ${e.to}!` : `Clout down: Tier ${e.to}.`;
    case 'GUILD_VOUCHER':
      return e.total >= 3 ? 'Third guild voucher: union rate (2x pay) unlocked!' : `Guild voucher ${e.total}/3.`;
    case 'CREATIVE_BURNOUT_STARTED':
      return 'Creative Burnout: all odds halved until Burnout drops below 30.';
    case 'CREATIVE_BURNOUT_CLEARED':
      return 'Creative Burnout cleared.';
    case 'OVERDRAFT_STARTED':
      return 'Overdraft! Get back to $0 within 3 days or move back home.';
    case 'OVERDRAFT_CLEARED':
      return 'Out of overdraft. Breathe.';
    case 'MOVED_BACK_HOME':
      return 'You moved back home.';
    case 'PROJECT_STARTED':
      return `New project: "${e.project.title}". Start writing.`;
    case 'PROJECT_STAGE':
      return {
        develop: 'Back to the script.',
        finance: 'Script done. Time to find money: pitch investors or self-fund.',
        crew: 'Fully financed! Hire your crew.',
        shoot: 'Crew assembled. Ready to shoot.',
        post: 'Picture wrap. Into the edit.',
        festival: 'Locked cut. Festival season awaits.',
      }[e.stage];
    case 'PROJECT_ABANDONED':
      return `Abandoned "${e.title}". It lives on as a Google Doc.`;
    case 'SESSION_SCORED':
      return `${{ develop: 'Writing session', shoot: 'Shoot day', post: 'Edit session' }[e.stage as 'develop' | 'shoot' | 'post'] ?? 'Session'} scored ${e.score}/100.`;
    case 'PITCHED':
      return e.yes ? `Pitch landed (${pct(e.odds)} odds): +${formatMoney(e.amount)} raised.` : `Pitch passed on (${pct(e.odds)} odds).`;
    case 'SELF_FUNDED':
      return `You put ${formatMoney(e.amount)} of your own money in. Bold.`;
    case 'CREW_HIRED':
      return `Hired ${e.candidate.name} (skill ${e.candidate.skill}) for ${formatMoney(e.candidate.fee)}.`;
    case 'FESTIVAL_SUBMITTED':
      return `Submitted to ${festivalName(e.festivalId)} (${pct(e.odds)} odds, −${formatMoney(e.fee)}). Results in a few days at 06:00.`;
    case 'FESTIVAL_RESULT':
      if (!e.accepted) return `${festivalName(e.festivalId)} passed (${pct(e.odds)} odds).`;
      return [
        `Accepted at ${festivalName(e.festivalId)}! +${e.rp} RP.`,
        e.award ? `Won the ${e.award}.` : '',
        e.offer ? `${e.offer.distributor} offers ${formatMoney(e.offer.amount)} for distribution.` : '',
      ]
        .filter(Boolean)
        .join(' ');
    case 'FILM_RELEASED':
      return e.distributor
        ? `"${e.title}" released by ${e.distributor}: +${formatMoney(e.amount)}.`
        : `"${e.title}" self-released online: +${e.rp} RP.`;
    case 'ACTION_REJECTED':
    case 'HEADLINE':
      return null;
  }
}

const festivalName = (id: string): string => FESTIVALS.find((f) => f.id === id)?.name ?? id;
