// Bank app (LAG-90): balance, overdraft countdown, bills and the transaction ledger. Renders bankView only.
import { bankView } from '../../../sim/actions';
import { MINUTES_PER_DAY, OVERDRAFT_DAYS } from '../../../sim/constants';
import { APPS, BANK, LEDGER_KINDS } from '../../../sim/content/phoneFlavor';
import type { LedgerEntry } from '../../../sim/types';
import { useGame } from '../../../store/game';
import { clock, day, money, remaining, signedMoney } from '../../format';

function dayLabel(d: number, today: number): string {
  if (d === today) return 'Today';
  if (d === today - 1) return 'Yesterday';
  return `Day ${d}`;
}

function Row({ e }: { e: LedgerEntry }) {
  const kind = LEDGER_KINDS[e.kind];
  const pos = e.amount >= 0;
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.07] text-lg" aria-hidden>
        {kind.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{e.label}</span>
        <span className="block text-[11px] text-muted">
          {kind.label} · {clock(e.minute)}
        </span>
      </span>
      <span className={`shrink-0 text-sm font-bold tabular-nums ${pos ? 'text-good' : 'text-bad'}`}>
        <span className="sr-only">{pos ? 'In: ' : 'Out: '}</span>
        {signedMoney(e.amount)}
      </span>
    </li>
  );
}

export function BankApp() {
  const state = useGame((g) => g.state);
  if (!state) return null;
  const v = bankView(state);
  const today = day(state.minute);
  const neg = v.balance < 0;

  const groups: { day: number; entries: LedgerEntry[] }[] = [];
  for (const e of v.entries) {
    const d = day(e.minute);
    const last = groups[groups.length - 1];
    if (last && last.day === d) last.entries.push(e);
    else groups.push({ day: d, entries: [e] });
  }

  const od = v.overdraft;
  const odDays = od ? Math.max(1, Math.ceil(od.minutesLeft / MINUTES_PER_DAY)) : 0;
  const odFrac = od ? Math.max(0, Math.min(1, od.minutesLeft / (OVERDRAFT_DAYS * MINUTES_PER_DAY))) : 0;
  const billsIn = v.nextBillsMinute - state.minute;

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label="Balance"
        className="relative overflow-hidden rounded-[1.6rem] p-4 shadow-[0_16px_30px_-14px_rgb(0_0_0/0.8)]"
        style={{ background: `linear-gradient(135deg, ${APPS.bank.bg} 0%, #0f3d17 55%, #1d1533 130%)` }}
      >
        <span aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-sm" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">{BANK.name}</p>
        <p className="mt-2 text-xs text-white/70">Available balance</p>
        <p className={`font-[family-name:var(--font-display)] text-4xl font-black tabular-nums ${neg ? 'text-[#ffb3c1]' : 'text-white'}`}>{money(v.balance)}</p>
        <p className="mt-1 text-[11px] text-white/70">
          Lifetime earned <span className="font-semibold tabular-nums text-white">{money(v.totalEarned)}</span>
        </p>
      </section>

      {od && (
        <section role="alert" aria-label="Overdraft" className="rounded-2xl bg-bad/15 p-3 ring-1 ring-bad/50">
          <p className="text-sm font-bold text-bad">{BANK.overdraftWarning.replace('{days}', String(odDays))}</p>
          <p className="mt-0.5 text-xs">
            Get back to $0 in <span className="font-bold tabular-nums">{remaining(od.minutesLeft)}</span> (by Day {day(od.deadlineMinute)} {clock(od.deadlineMinute)}) or
            it&apos;s a one-way ticket home.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30" aria-hidden>
            <div className="h-full rounded-full bg-bad" style={{ width: `${odFrac * 100}%` }} />
          </div>
        </section>
      )}

      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
          <dt className="text-[10px] uppercase tracking-wide text-muted">Next bills</dt>
          <dd className="text-sm font-bold tabular-nums text-bad">−{money(v.dailyBills)}</dd>
          <dd className="text-[10px] text-muted">in {remaining(billsIn)}</dd>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
          <dt className="text-[10px] uppercase tracking-wide text-muted">7 days in</dt>
          <dd className="text-sm font-bold tabular-nums text-good">+{money(v.week.in)}</dd>
        </div>
        <div className="rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
          <dt className="text-[10px] uppercase tracking-wide text-muted">7 days out</dt>
          <dd className="text-sm font-bold tabular-nums text-bad">−{money(v.week.out)}</dd>
        </div>
      </dl>

      <section aria-labelledby="bank-tx-title">
        <h2 id="bank-tx-title" className="mb-1.5 mt-1 px-1 text-xs font-semibold uppercase tracking-widest text-muted">
          Transactions
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.05] p-4 text-center text-sm text-muted">{APPS.bank.empty}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {groups.map((g) => {
              const net = g.entries.reduce((n, e) => n + e.amount, 0);
              return (
                <section key={g.day} aria-label={dayLabel(g.day, today)}>
                  <h3 className="mb-1 flex items-baseline justify-between px-1 text-[11px] font-semibold text-muted">
                    <span>{dayLabel(g.day, today)}</span>
                    <span className={`tabular-nums ${net >= 0 ? 'text-good' : 'text-bad'}`}>{signedMoney(net)}</span>
                  </h3>
                  <ul aria-label={`Transactions, ${dayLabel(g.day, today)}`} className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/10">
                    {g.entries.map((e) => (
                      <Row key={e.id} e={e} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
