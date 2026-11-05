export function ShareToast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[70] w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-gold/50 bg-card px-4 py-3 text-center text-sm font-medium shadow-lg"
    >
      {text}
    </div>
  );
}
