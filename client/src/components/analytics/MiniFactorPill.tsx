interface MiniFactorPillProps {
  factor: {
    composite: number;
    rating: string;
  } | null | undefined;
}

export default function MiniFactorPill({ factor }: MiniFactorPillProps) {
  if (!factor) return null;

  const score = factor.composite;
  const rating = factor.rating;

  let tone = "bg-slate-800 text-slate-200 border-slate-700";
  if (score >= 80) {
    tone = "bg-emerald-900/60 text-emerald-200 border-emerald-500/60";
  } else if (score >= 65) {
    tone = "bg-sky-900/60 text-sky-200 border-sky-500/60";
  } else if (score >= 50) {
    tone = "bg-amber-900/60 text-amber-200 border-amber-500/60";
  } else {
    tone = "bg-rose-900/60 text-rose-200 border-rose-500/60";
  }

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${tone}`}
      data-testid="pill-mini-factor"
    >
      <span>5F {rating}</span>
      <span className="opacity-80">· {score}/100</span>
    </div>
  );
}
