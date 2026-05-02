import type { ConfidenceResult } from "@/lib/confidence-engine";

const CFG = {
  High:   { color: "#10b981", bg: "#10b98114", border: "#10b98130" },
  Medium: { color: "#f59e0b", bg: "#f59e0b14", border: "#f59e0b30" },
  Low:    { color: "#ef4444", bg: "#ef444414", border: "#ef444430" },
} as const;

export function ConfidenceBadge({
  result,
  className = "",
}: {
  result: ConfidenceResult;
  className?: string;
}) {
  const cfg = CFG[result.level];
  return (
    <span
      className={`relative group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-default select-none ${className}`}
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
        style={{ background: cfg.color }}
      />
      {result.label}

      {/* Hover tooltip */}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 px-3 py-2.5 rounded-xl bg-[#0f0f1a] border border-white/10 text-[10px] text-slate-300 leading-relaxed font-normal opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-2xl text-left whitespace-normal">
        <span
          className="block text-[9px] font-black uppercase tracking-widest mb-1.5"
          style={{ color: cfg.color }}
        >
          {result.label} · {result.score}/100
        </span>
        {result.tooltip}
      </span>
    </span>
  );
}
