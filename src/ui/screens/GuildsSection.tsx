// Sprint 10: the four guilds — vouchers, joining, dues and the health plan. Renders guildsView only.
import { guildsView, type GuildView } from '../../sim/actions';
import { GUILD_DUES_CYCLE_DAYS, GUILD_JOIN_HOURS, GUILD_VOUCHER_MIN_TIER, GUILD_VOUCHERS_NEEDED } from '../../sim/constants';
import { useGame } from '../../store/game';
import { money } from '../format';
import type { Tab } from '../GameScreen';
import { Button, Card } from '../kit';
import { ReasonWithMap, useRun } from './runKit';

function GuildCard({ g, onNavigate }: { g: GuildView; onNavigate: (tab: Tab) => void }) {
  const { error, run } = useRun();
  const reasonId = `guild-${g.skill}-reason`;
  const vouchers = Math.min(g.vouchers, g.needed);
  return (
    <Card>
      <article aria-label={`${g.short}, ${g.name}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold leading-snug">
              {g.short} <span className="text-xs font-normal capitalize text-muted">· {g.skill}</span>
            </h3>
            <p className="text-xs text-muted">{g.name}</p>
          </div>
          {g.member && (
            <span className="shrink-0 rounded-md border border-good/50 bg-good/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-good">
              Member
            </span>
          )}
        </div>

        {g.member ? (
          <>
            <p className="mt-1 text-sm">
              Health plan:{' '}
              {g.healthPlan ? <span className="font-semibold text-good">active ✓</span> : <span className="font-semibold text-warn">not active</span>}
            </p>
            <p className="text-xs text-muted">
              Union earnings this cycle <span className="font-semibold tabular-nums text-ink">{money(g.earnedThisCycle)}</span> / {money(g.healthThreshold)}
            </p>
          </>
        ) : (
          <>
            <div className="mt-1 flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                {Array.from({ length: g.needed }, (_, i) => (
                  <span key={i} className={`h-1.5 w-6 rounded-full ${i < vouchers ? 'bg-accent' : 'bg-line'}`} />
                ))}
              </span>
              <span className="text-xs tabular-nums">
                Vouchers {vouchers}/{g.needed}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">HQ in {g.hq}</p>
            <Button
              variant={g.disabledReason === null ? 'primary' : 'secondary'}
              className="mt-2 w-full"
              disabled={g.disabledReason !== null}
              aria-describedby={g.disabledReason || error ? reasonId : undefined}
              onClick={() => run(g.command)}
            >
              Join {g.short} ({money(g.joinFee)}, {GUILD_JOIN_HOURS}h)
            </Button>
            <ReasonWithMap id={reasonId} text={g.disabledReason} error={error} onNavigate={onNavigate} />
          </>
        )}
      </article>
    </Card>
  );
}

export function GuildsSection({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const state = useGame((g) => g.state);
  if (!state) return null;
  const view = guildsView(state);
  const dues = view.guilds[0]?.dues ?? 0;
  return (
    <section aria-labelledby="guilds-title">
      <h2 id="guilds-title" className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
        Guilds
      </h2>
      <p className="mb-2 text-xs text-muted">
        Each booked Tier {GUILD_VOUCHER_MIN_TIER}+ gig earns a voucher in its skill; with {GUILD_VOUCHERS_NEEDED}, join at the guild's HQ. Global Rule One: members can't take Tier 1 (non-union) gigs in that skill.
        Dues are {money(dues)} per guild every {GUILD_DUES_CYCLE_DAYS} days.
        {view.healthPlan && <span className="text-good"> Health plan active: Burnout builds slower.</span>}
      </p>
      <ul className="flex flex-col gap-2">
        {view.guilds.map((g) => (
          <li key={g.skill}>
            <GuildCard g={g} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </section>
  );
}
