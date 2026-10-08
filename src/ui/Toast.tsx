import { useEffect } from 'react';
import { useGame } from '../store/game';

export function Toast() {
  const toast = useGame((g) => g.toast);
  const dismiss = useGame((g) => g.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, dismiss]);

  if (!toast) return null;
  const tone = { good: 'border-good/60 text-good', bad: 'border-bad/60 text-bad', info: 'border-line text-ink' }[toast.tone];
  const icon = { good: '✓', bad: '✕', info: 'i' }[toast.tone];
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4" role="status" aria-live="polite">
      <button
        type="button"
        onClick={dismiss}
        className={`screen-in pointer-events-auto flex min-h-11 max-w-md items-center gap-2 rounded-2xl border bg-surface-2 px-4 py-2 text-sm shadow-xl ${tone}`}
      >
        <span aria-hidden className="font-bold">{icon}</span>
        <span className="text-ink">{toast.text}</span>
      </button>
    </div>
  );
}
