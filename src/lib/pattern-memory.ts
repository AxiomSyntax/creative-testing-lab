// ─── Types ────────────────────────────────────────────────────────────────────

export type PatternEntry = {
  label:        string;
  avgCTR:       number;
  avgRetention: number;
  count:        number;
  winRate:      number;  // 0–1
};

export type PatternCategory = {
  name:    "Hook" | "Format" | "Angle";
  top:     PatternEntry[];  // sorted best→worst, max 3
  worst:   PatternEntry[];  // sorted worst→best, max 2 (only if different from top)
  insight: string;          // human-readable sentence
};

export type PatternMemoryResult = {
  hooks:            PatternCategory;
  formats:          PatternCategory;
  angles:           PatternCategory;
  totalExperiments: number;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

type RawExp = {
  hookType:       string;
  creativeFormat: string;
  primaryAngle:   string;
  status:         string;
  timeline:       Array<{ ctr: number; hold: number }>;
};

function latestEntry(exp: RawExp): { ctr: number; hold: number } | null {
  if (!exp.timeline || exp.timeline.length === 0) return null;
  return exp.timeline[exp.timeline.length - 1];
}

function buildEntries(exps: RawExp[], keyFn: (e: RawExp) => string): PatternEntry[] {
  const map: Record<string, { ctrs: number[]; holds: number[]; winners: number; total: number }> = {};

  for (const exp of exps) {
    const key = keyFn(exp);
    if (!key || key === "undefined" || key === "null" || key.trim() === "") continue;

    if (!map[key]) map[key] = { ctrs: [], holds: [], winners: 0, total: 0 };

    const m = latestEntry(exp);
    if (m) {
      map[key].ctrs.push(m.ctr);
      map[key].holds.push(m.hold);
    }
    map[key].total++;
    if (exp.status === "Winner") map[key].winners++;
  }

  return Object.entries(map)
    .filter(([, v]) => v.total > 0)
    .map(([label, v]) => ({
      label,
      avgCTR:       v.ctrs.length  ? +(v.ctrs.reduce((s, x)  => s + x, 0) / v.ctrs.length).toFixed(2)  : 0,
      avgRetention: v.holds.length ? +(v.holds.reduce((s, x) => s + x, 0) / v.holds.length).toFixed(1) : 0,
      count:        v.total,
      winRate:      v.total > 0 ? +(v.winners / v.total).toFixed(2) : 0,
    }))
    .sort((a, b) => b.avgCTR - a.avgCTR);
}

function buildCategory(entries: PatternEntry[], name: "Hook" | "Format" | "Angle"): PatternCategory {
  const top   = entries.slice(0, 3);
  const worst = entries.length > 1
    ? entries.slice(-Math.min(2, Math.max(entries.length - top.length, 0))).reverse()
    : [];

  // ── Human-readable insight sentence ─────────────────────────────────────────
  let insight = "";
  const totalTests = entries.reduce((s, e) => s + e.count, 0);

  if (top.length >= 2) {
    const best   = top[0];
    const second = top[1];
    const diff   = best.avgCTR - second.avgCTR;
    const pct    = second.avgCTR > 0 ? Math.round((diff / second.avgCTR) * 100) : 0;

    if (pct > 10) {
      insight = `${best.label} outperforms ${second.label} by +${pct}% CTR across ${totalTests} test${totalTests !== 1 ? "s" : ""}`;
    } else if (pct > 0) {
      insight = `${best.label} leads with ${best.avgCTR.toFixed(1)}% avg CTR (${totalTests} test${totalTests !== 1 ? "s" : ""})`;
    } else {
      insight = `${top.map(e => e.label).join(", ")} are performing similarly — keep testing to differentiate`;
    }
  } else if (top.length === 1) {
    insight = `Only "${top[0].label}" tested so far — add more ${name.toLowerCase()} types to compare`;
  } else {
    insight = `No ${name.toLowerCase()} data yet — log timeline entries to generate patterns`;
  }

  return { name, top, worst, insight };
}

// ─── computePatternMemory ─────────────────────────────────────────────────────
//
// Reads only from existing experiment data. Does not modify any decisions.
// Returns null when fewer than 2 experiments have timeline data.

export function computePatternMemory(exps: RawExp[]): PatternMemoryResult | null {
  const withData = exps.filter(e => e.timeline && e.timeline.length > 0);
  if (withData.length < 2) return null;

  return {
    hooks:            buildCategory(buildEntries(withData, e => e.hookType),       "Hook"),
    formats:          buildCategory(buildEntries(withData, e => e.creativeFormat), "Format"),
    angles:           buildCategory(buildEntries(withData, e => e.primaryAngle),   "Angle"),
    totalExperiments: withData.length,
  };
}
