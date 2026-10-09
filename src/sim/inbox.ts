// Messages app (PI-3 Sprint 11): sim events become text messages from the people in your LA life.
// One thread per contact; the reducer posts after every step, so nothing here touches the rules.
import * as C from './constants';
import { FESTIVALS } from './content/film';
import { GUILD_FLAVOR } from './content/writersFlavor';
import { INBOX_SENDER, INBOX_TEMPLATES } from './content/phoneFlavor';
import type { Rng } from './rng';
import type { ContactId, GameEvent, GameState, InboxKind } from './types';
import { fillTemplate, formatMoney, newId } from './world';

type Vars = Record<string, string | number>;
type Post = { kind: InboxKind; vars: Vars };

const festivalName = (id: string): string => FESTIVALS.find((f) => f.id === id)?.name ?? 'the festival';

/** Which messages (if any) an event sends. Pure: everything comes from the event (the state is kept in the signature for future context). */
export function messagesFor(_s: GameState, e: GameEvent): Post[] {
  switch (e.type) {
    case 'PILOT_SEASON_OPENED':
      return [{ kind: 'pilotSeasonOpen', vars: {} }];
    case 'CALLBACK_STARTED':
      return [{ kind: 'callbackStarted', vars: { show: e.showTitle, network: e.network, role: e.role } }];
    case 'CALLBACK_DONE':
      return [e.booked ? { kind: 'callbackBooked', vars: { show: e.showTitle, pay: formatMoney(e.pay) } } : { kind: 'callbackPassed', vars: { show: e.showTitle } }];
    case 'BOOKED':
      return [{ kind: e.opportunity.medium === 'music' ? 'gigBookedMusic' : 'gigBooked', vars: { title: e.opportunity.title, pay: formatMoney(e.pay) } }];
    case 'PILOT_DECIDED':
      if (!e.pickedUp) return [{ kind: 'pilotPassed', vars: { show: e.showTitle, network: e.network } }];
      return e.tookIt ? [{ kind: 'pilotPickedUp', vars: { show: e.showTitle, network: e.network } }] : [];
    case 'EPISODE_WEEK':
      return e.missed ? [{ kind: 'episodeMissed', vars: { show: e.showTitle } }] : [];
    case 'SERIES_WRAPPED':
      return [{ kind: 'seriesWrapped', vars: { show: e.showTitle, episodes: e.episodes } }];
    case 'AGENT_PITCHED':
      return e.yes ? [{ kind: 'agentSigned', vars: { agency: e.agency } }] : [];
    case 'STAFFING_ROLLED':
      if (e.staffed) return [{ kind: 'staffed', vars: { show: e.show ?? '', network: e.network ?? '' } }];
      return [e.final ? { kind: 'staffingOver', vars: {} } : { kind: 'staffingNoOffer', vars: { attempt: e.attempt } }];
    case 'ROOM_EVENT':
      return [{ kind: 'roomEvent', vars: { prompt: e.prompt } }];
    case 'ROOM_WRAPPED': {
      const kind = e.outcome === 'promoted' ? 'roomPromoted' : e.outcome === 'notAskedBack' ? 'roomNotAskedBack' : 'roomWrapped';
      return [{ kind, vars: { show: e.showTitle } }];
    }
    case 'LABEL_PITCHED':
      return [e.yes ? { kind: 'labelSigned', vars: { label: e.label, advance: formatMoney(e.advance) } } : { kind: 'labelPassed', vars: { label: e.label } }];
    case 'FESTIVAL_RESULT': {
      const festival = festivalName(e.festivalId);
      if (!e.accepted) return [{ kind: 'festivalRejected', vars: { festival } }];
      const posts: Post[] = [{ kind: 'festivalAccepted', vars: { festival } }];
      if (e.offer) posts.push({ kind: 'distributionOffer', vars: { distributor: e.offer.distributor, amount: formatMoney(e.offer.amount) } });
      return posts;
    }
    case 'OVERDRAFT_STARTED':
      return [{ kind: 'overdraftStarted', vars: { days: C.OVERDRAFT_DAYS } }];
    case 'OVERDRAFT_CLEARED':
      return [{ kind: 'overdraftCleared', vars: {} }];
    case 'MOVED_BACK_HOME':
      return [{ kind: 'movedHome', vars: {} }];
    case 'GUILD_VOUCHER':
      return e.total >= C.GUILD_VOUCHERS_NEEDED ? [{ kind: 'guildVoucherReady', vars: { guild: GUILD_FLAVOR[e.guild].short } }] : [];
    case 'GUILD_JOINED':
      return [{ kind: 'guildJoined', vars: { guild: GUILD_FLAVOR[e.guild].short } }];
    case 'GUILD_DUES':
      return [{ kind: 'guildDues', vars: { total: formatMoney(e.total) } }];
    case 'HEALTH_PLAN':
      return [{ kind: e.active ? 'healthPlanOn' : 'healthPlanOff', vars: { guild: GUILD_FLAVOR[e.guild].short } }];
    case 'MOM_CHECK_IN':
      return [{ kind: 'momCheckIn', vars: {} }];
    default:
      return [];
  }
}

/** Append a message to its contact's thread and move that thread to the top. */
export function postMessage(s: GameState, rng: Rng, kind: InboxKind, vars: Vars): void {
  const contact: ContactId = INBOX_SENDER[kind];
  const text = fillTemplate(rng.pick(INBOX_TEMPLATES[kind]), vars);
  let thread = s.inbox.find((t) => t.contact === contact);
  if (!thread) {
    thread = { contact, messages: [], unread: 0, lastMinute: s.minute };
  } else {
    s.inbox = s.inbox.filter((t) => t !== thread);
  }
  thread.messages.push({ id: newId(s, 'x'), minute: s.minute, kind, text });
  if (thread.messages.length > C.INBOX_THREAD_MAX) thread.messages.splice(0, thread.messages.length - C.INBOX_THREAD_MAX);
  thread.unread = Math.min(thread.unread + 1, thread.messages.length);
  thread.lastMinute = s.minute;
  s.inbox.unshift(thread);
}

export function deliverMail(s: GameState, rng: Rng, events: readonly GameEvent[]): void {
  for (const e of events) for (const m of messagesFor(s, e)) postMessage(s, rng, m.kind, m.vars);
}

export function readThread(s: GameState, contact: ContactId): void {
  const t = s.inbox.find((x) => x.contact === contact);
  if (t) t.unread = 0;
}

export const unreadCount = (s: GameState): number => s.inbox.reduce((n, t) => n + t.unread, 0);

/** 06:00: sometimes Mom checks in. */
export function momCheckIn(rng: Rng, events: GameEvent[]): void {
  if (rng.chance(C.MOM_CHECK_IN_CHANCE)) events.push({ type: 'MOM_CHECK_IN' });
}
