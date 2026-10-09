// Sprint 10: the four parody guilds. Names and flavour live in writersFlavor.ts (Content Designer).
import type { LocationId, Skill } from '../types';

export interface GuildInfo {
  skill: Skill;
  /** Where you sign up. */
  hq: LocationId;
}

export const GUILDS: Record<Skill, GuildInfo> = {
  acting: { skill: 'acting', hq: 'hollywood' },
  writing: { skill: 'writing', hq: 'weho' },
  directing: { skill: 'directing', hq: 'hollywood' },
  music: { skill: 'music', hq: 'burbank' },
};

export const GUILD_SKILLS: readonly Skill[] = ['acting', 'writing', 'directing', 'music'];
