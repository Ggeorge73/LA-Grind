// Plain-language activity-log lines for sim events. Returns null for events the log skips.
import { JOBS } from './content/jobs';
import { LEISURE, LOCATIONS } from './content/locations';
import { FESTIVALS } from './content/film';
import { GUILD_FLAVOR } from './content/writersFlavor';
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
      return e.total >= 3
        ? `Third ${gn(e.guild)} voucher: you can join at their HQ.`
        : `${gn(e.guild)} voucher ${e.total}/3.`;
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
        record: 'Crew booked. Time to record.',
        release: 'Mastered. Release it when you are ready.',
        deck: 'Spec pilot done. Now build the pitch deck.',
        agent: 'Deck ready. Go meet agencies.',
        staffing: 'You have an agent! Staffing season: they send your spec out every 5 days.',
      }[e.stage];
    case 'PROJECT_ABANDONED':
      return `Abandoned "${e.title}". It lives on as a Google Doc.`;
    case 'SESSION_SCORED':
      return `${{ develop: 'Writing session', shoot: 'Shoot day', post: 'Edit session', record: 'Studio session', deck: 'Deck session' }[e.stage as 'develop' | 'shoot' | 'post' | 'record' | 'deck'] ?? 'Session'} scored ${e.score}/100.`;
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
    case 'RECORD_RELEASED':
      return `"${e.title}" is out (quality ${e.quality}). Release week starts tomorrow at 06:00.`;
    case 'PROMO_DONE':
      return `Promo: ${e.stunt}. Tomorrow's streams get a boost.`;
    case 'RELEASE_DAY':
      return `Release day ${e.day}: ${e.streams.toLocaleString('en-US')} streams, +${e.fans} fans, +${formatMoney(e.royalties)}${e.position === null ? ', not on the chart' : `, chart #${e.position}`}.`;
    case 'RELEASE_WEEK_ENDED':
      return e.peak === null
        ? `Release week over: ${e.totalStreams.toLocaleString('en-US')} streams, never charted.`
        : `Release week over: peaked at #${e.peak}, ${e.totalStreams.toLocaleString('en-US')} streams, +${e.rp} RP.`;
    case 'LABEL_PITCHED':
      return e.yes
        ? `${e.label} signed you (${pct(e.odds)} odds): ${formatMoney(e.advance)} advance.`
        : `${e.label} passed (${pct(e.odds)} odds).`;
    case 'SHOW_PLAYED':
      return `${e.soldOut ? 'SOLD OUT' : 'Played'} ${e.venue}: ${e.tickets} tickets, +${formatMoney(e.pay)}, +${e.fans} fans${e.rp ? `, +${e.rp} RP` : ''}.`;
    case 'BEAT_MADE':
      return `Made a beat: "${e.beat.title}" (quality ${e.beat.quality}). It's in your beat store.`;
    case 'BEAT_LEASED':
      return `Beat leased: "${e.title}" +${formatMoney(e.fee)}.`;
    case 'PLACEMENT':
      return `Sync placement: "${e.title}" in ${e.client}. +${formatMoney(e.fee)}, +${e.rp} RP.`;
    case 'SOUNDTRACK_SET':
      return `"${e.title}" is on the soundtrack: film quality +${e.bonus}.`;
    case 'PILOT_SEASON_OPENED':
      return 'Pilot season is open: pilot auditions are on the Gigs board for the next 10 days.';
    case 'CALLBACK_STARTED':
      return `Callback for "${e.showTitle}" (${e.network}). Three notes from the director: pick your reads.`;
    case 'CALLBACK_READ':
      return `Callback beat ${e.beat}: ${e.right ? 'the room leaned in.' : 'the room checked its phone.'}`;
    case 'CALLBACK_DONE':
      return e.booked
        ? `BOOKED the pilot "${e.showTitle}" (${e.right}/3 reads, ${pct(e.odds)} odds): +${formatMoney(e.pay)}. Network decision in a week.`
        : `Passed on for "${e.showTitle}" (${e.right}/3 reads, ${pct(e.odds)} odds).`;
    case 'PILOT_DECIDED':
      if (!e.pickedUp) return `${e.network} passed on "${e.showTitle}" (${pct(e.odds)} odds).`;
      return e.tookIt
        ? `"${e.showTitle}" PICKED UP by ${e.network}! You're a series regular. Shoot an episode each week in Burbank.`
        : `"${e.showTitle}" got picked up, but you're already on a show. Your agent passed.`;
    case 'EPISODE_SHOT':
      return `Episode ${e.episode} of "${e.showTitle}" in the can: +${e.rp} RP.`;
    case 'EPISODE_WEEK':
      return e.missed
        ? `You missed set on "${e.showTitle}": reduced pay (+${formatMoney(e.pay)}), −${e.rpLost} RP.`
        : `"${e.showTitle}" episode ${e.episode} paid: +${formatMoney(e.pay)}.`;
    case 'SERIES_WRAPPED':
      return `That's a wrap on "${e.showTitle}": ${e.episodes} episodes${e.missed ? ` (${e.missed} missed)` : ''}.`;
    case 'AGENT_PITCHED':
      return e.yes ? `${e.agency} signed you (${pct(e.odds)} odds)!` : `${e.agency} passed (${pct(e.odds)} odds).`;
    case 'STAFFING_ROLLED':
      if (e.staffed) return `STAFFED on "${e.show}" (${e.network}) at ${pct(e.odds)} odds! Do one room day a week in Burbank.`;
      return e.final
        ? `Staffing try ${e.attempt}: no offer (${pct(e.odds)} odds). Staffing season is over.`
        : `Staffing try ${e.attempt}: no offer (${pct(e.odds)} odds). Your agent tries again in 5 days.`;
    case 'ROOM_DAY_DONE':
      return `Room day on "${e.showTitle}" scored ${e.score}/100: +${e.rp} RP.`;
    case 'ROOM_EVENT':
      return `In the room: ${e.prompt}`;
    case 'ROOM_CHOICE_MADE':
      return `You: "${e.text}". Favor ${signed(e.favor)} (now ${e.favorNow}), pages ${signed(e.quality)}.`;
    case 'ROOM_WRAPPED':
      return {
        promoted: `"${e.showTitle}" wrapped after ${e.weeks} weeks. Favor ${e.favor}: promoted to story editor! +${e.rp} RP.`,
        notAskedBack: `"${e.showTitle}" wrapped after ${e.weeks} weeks. Favor ${e.favor}: not asked back. ${e.rp} RP.`,
        normal: `"${e.showTitle}" wrapped after ${e.weeks} weeks. Favor ${e.favor}: they'd have you back.`,
      }[e.outcome];
    case 'GUILD_JOINED':
      return `Joined ${GUILD_FLAVOR[e.guild].name}: −${formatMoney(e.fee)}. Union rate on ${e.guild} gigs; no more non-union work in it.`;
    case 'GUILD_DUES':
      return `Guild dues: −${formatMoney(e.total)}.`;
    case 'HEALTH_PLAN':
      return e.active
        ? `${gn(e.guild)} health plan active: Burnout builds slower.`
        : `${gn(e.guild)} health plan lapsed: not enough union work last cycle.`;
    case 'ACTION_REJECTED':
    case 'HEADLINE':
    case 'MOM_CHECK_IN':
      return null;
  }
}

const gn = (g: keyof typeof GUILD_FLAVOR): string => GUILD_FLAVOR[g].short;
const signed = (n: number): string => (n >= 0 ? `+${n}` : `−${-n}`);
const festivalName = (id: string): string => FESTIVALS.find((f) => f.id === id)?.name ?? id;
