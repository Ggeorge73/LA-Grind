// Shared UI building blocks. Every tappable thing is at least 44px tall.
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Medium } from '../sim/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink font-semibold active:brightness-90',
  secondary: 'bg-surface-2 text-ink border border-line active:bg-line',
  ghost: 'bg-transparent text-muted active:bg-surface-2',
  danger: 'bg-bad/15 text-bad border border-bad/40 active:bg-bad/25',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-11 min-w-11 rounded-xl px-4 text-sm transition disabled:opacity-45 disabled:active:brightness-100 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-3 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted first:mt-0">{children}</h2>;
}

/** A labelled bar. The number is always shown as text, so colour is never the only signal. */
export function Meter({
  label,
  value,
  max = 100,
  tone = 'accent',
  hint,
}: {
  label: string;
  value: number;
  max?: number;
  tone?: 'accent' | 'good' | 'bad' | 'warn' | 'music';
  hint?: string;
}) {
  const pctWidth = Math.max(0, Math.min(100, (value / max) * 100));
  const bar = { accent: 'bg-accent', good: 'bg-good', bad: 'bg-bad', warn: 'bg-warn', music: 'bg-music' }[tone];
  return (
    <div className="min-w-0" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-valuetext={hint ?? `${Math.round(value)} of ${max}`}>
      <div className="flex items-baseline justify-between gap-1 text-[11px] leading-tight">
        <span className="truncate text-muted">{label}</span>
        <span className="font-semibold tabular-nums">{Math.round(value)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pctWidth}%` }} />
      </div>
    </div>
  );
}

const MEDIUM_STYLE: Record<Medium, { label: string; cls: string }> = {
  film: { label: 'Film', cls: 'text-film border-film/50' },
  tv: { label: 'TV', cls: 'text-tv border-tv/50' },
  music: { label: 'Music', cls: 'text-music border-music/50' },
};

export function MediumTag({ medium }: { medium: Medium }) {
  const m = MEDIUM_STYLE[medium];
  return <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
}

export function Chip({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'good' | 'bad' | 'warn' }) {
  const cls = { muted: 'text-muted', good: 'text-good', bad: 'text-bad', warn: 'text-warn' }[tone];
  return <span className={`text-xs ${cls}`}>{children}</span>;
}

/** Bottom sheet for confirmations. Rendered above the bottom nav, inside thumb reach. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="screen-in safe-bottom w-full rounded-t-3xl border-t border-line bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden />
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
