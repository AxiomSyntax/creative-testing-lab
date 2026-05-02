// ─── Types ────────────────────────────────────────────────────────────────────

export type TestingMode = "EXPLORATION" | "EXPLOITATION";

export interface TestingModeResult {
  mode:                TestingMode;
  coverage:            number;       // 0–1, proportion of hook categories tested
  hasConsistentWinner: boolean;      // a single hook type dominates the top performers
  missingCategories:   string[];     // hook types not yet tested, in canonical order
}

// ─── All possible hook-type categories ───────────────────────────────────────
// Kept in sync with HOOK_TYPES from @/data/hooks (duplicated here to keep this
// lib dependency-free and safe to call outside React component scope).

const ALL_HOOK_CATEGORIES: readonly string[] = [
  "Negative Hook",
  "Question Hook",
  "Quotation Hook",
  "Statistic Hook",
  "Anecdotal Hook",
  "Curiosity Hook",
  "Controversial Hook",
  "Promise Hook",
  "Result-Oriented Hook",
  "Story Hook",
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

type RawExp = {
  hookType:  string;
  status:    string;
  timeline?: Array<{ ctr: number }>;
};

/** Latest CTR for an experiment, or 0 if no timeline data. */
function latestCTR(exp: RawExp): number {
  if (!exp.timeline || exp.timeline.length === 0) return 0;
  return exp.timeline[exp.timeline.length - 1].ctr;
}

/**
 * Determine whether a single hook category appears more than once among the
 * top-performing experiments.
 *
 * "Top performers" = experiments that are Winners, or — if none exist — the
 * top half by latest CTR.
 */
function detectConsistentWinner(exps: RawExp[]): boolean {
  if (exps.length === 0) return false;

  const winners = exps.filter(e => e.status === "Winner");
  const pool    = winners.length > 0 ? winners : (() => {
    const sorted = [...exps].sort((a, b) => latestCTR(b) - latestCTR(a));
    return sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  })();

  // Count how many times each hook category appears in the top pool
  const freq: Record<string, number> = {};
  for (const exp of pool) {
    const key = exp.hookType;
    if (!key) continue;
    freq[key] = (freq[key] ?? 0) + 1;
  }

  // Consistent winner = any category that appears 2+ times
  return Object.values(freq).some(count => count >= 2);
}

// ─── computeTestingMode ───────────────────────────────────────────────────────
//
// Advisory only — read-only, does NOT modify experiments or decision-engine state.
//
// @param exps  Array of experiment variants from the active project.

export function computeTestingMode(exps: RawExp[]): TestingModeResult {
  // Which hook categories have actually been tested (have timeline data)?
  const testedCategories = new Set(
    exps
      .filter(e => e.timeline && e.timeline.length > 0 && e.hookType)
      .map(e => e.hookType),
  );

  const coverage           = testedCategories.size / ALL_HOOK_CATEGORIES.length;
  const hasConsistentWinner = detectConsistentWinner(exps);

  let mode: TestingMode;

  if (coverage < 0.6) {
    mode = "EXPLORATION";
  } else if (hasConsistentWinner) {
    mode = "EXPLOITATION";
  } else {
    mode = "EXPLORATION";
  }

  const missingCategories = ALL_HOOK_CATEGORIES.filter(c => !testedCategories.has(c));

  return { mode, coverage, hasConsistentWinner, missingCategories };
}
