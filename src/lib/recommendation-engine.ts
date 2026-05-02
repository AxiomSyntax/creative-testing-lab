// ─── Types ────────────────────────────────────────────────────────────────────

export type RecommendationInput = {
  ctr:       number;
  holdRate:  number;
  cpa:       number;
  targetCpa: number;
};

export type RecommendationType =
  | "Hook Iteration"
  | "Hook Mismatch"
  | "Format Iteration"
  | "Visual Iteration"
  | "CTA Iteration"
  | "Exploration";

export type Confidence = "low" | "medium" | "high";

export type Impact = "low" | "medium" | "high";

export type SecondaryIssue = {
  type:     string;
  severity: number;
};

// ─── Learned patterns ─────────────────────────────────────────────────────────

export type LearnedPattern = {
  value:   string;
  score:   number;
  wins:    number;
  avgCTR:  number;
  avgCPA:  number;
};

export type LearnedPatterns = {
  hook:   LearnedPattern[];
  format: LearnedPattern[];
  cta:    LearnedPattern[];
};

// ─── Recommendation ───────────────────────────────────────────────────────────

export type Recommendation = {
  recommendationType: RecommendationType;
  reason:             string;
  confidence:         Confidence;
  impact:             Impact;
  actionPlan:         string[];
  secondaryIssue?:    SecondaryIssue;
  learnedPatterns?:   LearnedPatterns;
};

// Exported so callers can display individual metric scores in debug views.
export type SeverityBreakdown = {
  ctr:      number;
  holdRate: number;
  cpa:      number;
};

// ─── Severity scorers (used for confidence + UI bars, not for decisions) ──────

function scoreCtr(ctr: number): number {
  // Threshold: 2.5%. Bars reflect distance below that ceiling.
  if (ctr < 1.0) return 1.0;
  if (ctr < 1.5) return 0.8;
  if (ctr < 2.0) return 0.6;
  if (ctr < 2.5) return 0.3;
  return 0;
}

function scoreHoldRate(holdRate: number): number {
  // Threshold: 50%. Bars reflect distance below that ceiling.
  if (holdRate < 15) return 1.0;
  if (holdRate < 25) return 0.8;
  if (holdRate < 35) return 0.6;
  if (holdRate < 50) return 0.3;
  return 0;
}

function scoreCpa(cpa: number, targetCpa: number): number {
  if (targetCpa <= 0) return 0;
  const ratio = cpa / targetCpa;
  if (ratio > 1.5) return 1.0;
  if (ratio > 1.2) return 0.7;
  if (ratio > 1.0) return 0.4;
  return 0;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toConfidence(severity: number): Confidence {
  if (severity > 0.8) return "high";
  if (severity > 0.5) return "medium";
  return "low";
}

// ─── Impact priority ──────────────────────────────────────────────────────────
// Used by the Impact Layer when all funnel gates pass. Determines which
// iteration type to recommend proactively. CTA is intentionally last.

export const IMPACT_PRIORITY = {
  hook:          1.0,
  hook_mismatch: 0.95,
  format:        0.9,
  visual:        0.6,
  cta:           0.3,
  exploration:   0.2,
} as const;

const IMPACT_MAP: Record<RecommendationType, Impact> = {
  "Hook Iteration":   "high",
  "Hook Mismatch":    "high",
  "Format Iteration": "high",
  "Visual Iteration": "medium",
  "CTA Iteration":    "low",
  "Exploration":      "medium",
};

const ACTION_PLAN_MAP: Record<RecommendationType, string[]> = {
  "Hook Iteration": [
    "Generate 4 hook variations",
    "Keep angle and format constant",
  ],
  "Hook Mismatch": [
    "Audit hook against body — remove any claim the body doesn't deliver",
    "Generate 3 realigned hook variations",
    "Keep format and angle constant",
  ],
  "Format Iteration": [
    "Test 2–3 new formats with same message",
  ],
  "Visual Iteration": [
    "Test visual execution variations (actor, editing, style)",
  ],
  "CTA Iteration": [
    "Test 2–3 CTA variations with same creative",
  ],
  "Exploration": [
    "No single bottleneck — run broad combination tests",
    "Introduce a new angle or creative concept",
  ],
};

// ─── recommendIteration ───────────────────────────────────────────────────────

/**
 * Two-layer decision engine: Funnel Gates → Impact Layer.
 *
 * Layer 1 — Funnel Gates (fix broken stages first, top-down):
 *   CTR < 2.5%          → Hook Iteration        (scroll-stop problem)
 *   Hold < 50%          → Format or Visual       (retention problem)
 *     • CTR > 3 AND Hold < 45 → Hook Mismatch   (hook overpromises body)
 *     • Hold < 25            → Format Iteration  (structural weakness)
 *     • Hold 25–50           → Visual Iteration  (execution issue)
 *
 * Layer 2 — Impact Layer (when CTR ≥ 2.5% AND hold ≥ 50%):
 *   Selects the highest-leverage iteration type proactively rather than
 *   defaulting to CTA or Exploration. Candidates are always:
 *     Hook (1.0) > Format (0.9) > Visual (0.6)
 *   CTA (0.3) is only admitted when CPA > targetCpa × 1.5 (severe overrun).
 *   Even then, hook wins on priority — CTA surfaces as a secondaryIssue.
 *   Mild CPA elevation (targetCpa < cpa ≤ 1.5×) is also flagged as secondary.
 */
export function recommendIteration(input: RecommendationInput): Recommendation {
  const { ctr, holdRate, cpa, targetCpa } = input;

  // ── Stage 1: Hook (CTR) ───────────────────────────────────────────────────
  // Weak CTR = hook is failing to stop the scroll. Fix this before anything else.
  if (ctr < 2.5) {
    const type: RecommendationType = "Hook Iteration";
    return {
      recommendationType: type,
      reason:             `CTR is ${ctr.toFixed(1)}% — below 2.5% threshold. Hook is not stopping the scroll.`,
      confidence:         toConfidence(scoreCtr(ctr)),
      impact:             IMPACT_MAP[type],
      actionPlan:         ACTION_PLAN_MAP[type],
    };
  }

  // ── Stage 2: Retention (Hold Rate) ───────────────────────────────────────
  // CTR is healthy. Check if viewers are staying engaged after the hook.
  if (holdRate < 50) {
    // Sub-case: very high CTR + low hold = hook overpromises what the body delivers.
    if (ctr > 3 && holdRate < 45) {
      const type: RecommendationType = "Hook Mismatch";
      const cpaScore = scoreCpa(cpa, targetCpa);
      return {
        recommendationType: type,
        reason:             `CTR ${ctr.toFixed(1)}% is strong, but hold rate ${holdRate.toFixed(0)}% is low — hook overpromises the body.`,
        confidence:         holdRate < 25 ? "high" : "medium",
        impact:             IMPACT_MAP[type],
        actionPlan:         ACTION_PLAN_MAP[type],
        ...(cpaScore > 0.3 && { secondaryIssue: { type: "Conversion / CTA", severity: cpaScore } }),
      };
    }

    // Normal retention problem: format (structural) or visual (execution).
    const type: RecommendationType = holdRate < 25 ? "Format Iteration" : "Visual Iteration";
    const cpaScore = scoreCpa(cpa, targetCpa);
    return {
      recommendationType: type,
      reason: holdRate < 25
        ? `Hold rate ${holdRate.toFixed(0)}% — content delivery is structurally weak. Test different formats.`
        : `Hold rate ${holdRate.toFixed(0)}% — viewers drop off after the hook. Improve visual execution.`,
      confidence: toConfidence(scoreHoldRate(holdRate)),
      impact:     IMPACT_MAP[type],
      actionPlan: ACTION_PLAN_MAP[type],
      ...(cpaScore > 0.3 && { secondaryIssue: { type: "Conversion / CTA", severity: cpaScore } }),
    };
  }

  // ── Impact Layer ─────────────────────────────────────────────────────────
  // Both funnel gates passed (CTR ≥ 2.5%, hold ≥ 50%).
  //
  // Rather than defaulting to CTA or Exploration, proactively select the
  // highest-leverage iteration type. Hook and Format have the most impact
  // even when metrics are not broken — CTA is a late-stage optimization.
  //
  // CTA is only admitted as a candidate when CPA is severely over target
  // (> 1.5×). Even then it cannot beat hook (priority 1.0 vs 0.3); it
  // surfaces as a secondary issue instead.

  type ImpactCandidate = { type: RecommendationType; priority: number };

  const candidates: ImpactCandidate[] = [
    { type: "Hook Iteration",   priority: IMPACT_PRIORITY.hook   },
    { type: "Format Iteration", priority: IMPACT_PRIORITY.format },
    { type: "Visual Iteration", priority: IMPACT_PRIORITY.visual },
  ];

  const cpaRatio    = targetCpa > 0 ? cpa / targetCpa : 0;
  const ctaSevere   = cpaRatio > 1.5;          // very bad → add to candidates
  const ctaElevated = cpaRatio > 1.0 && !ctaSevere; // above target but mild

  if (ctaSevere) {
    candidates.push({ type: "CTA Iteration", priority: IMPACT_PRIORITY.cta });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const winner = candidates[0];

  // Surface CPA as a secondary concern when elevated but not the winner.
  const secondaryIssue: SecondaryIssue | undefined =
    ctaSevere || ctaElevated
      ? {
          type:     "Conversion / CTA",
          severity: ctaSevere ? scoreCpa(cpa, targetCpa) : 0.4,
        }
      : undefined;

  const cpaSuffix = secondaryIssue
    ? ` CPA $${cpa.toFixed(0)} is elevated — flagged as secondary.`
    : "";

  return {
    recommendationType: winner.type,
    reason:             `All funnel metrics are healthy — prioritizing highest-leverage iteration.${cpaSuffix}`,
    confidence:         "medium",
    impact:             IMPACT_MAP[winner.type],
    actionPlan:         ACTION_PLAN_MAP[winner.type],
    ...(secondaryIssue && { secondaryIssue }),
  };
}

// ─── getLearnedPatterns ───────────────────────────────────────────────────────

type _RawTest    = { learning?: { winnerVariantId?: string }; [k: string]: unknown };
type _RawVariant = {
  variantId:      string;
  hookType?:      string;
  creativeFormat?: string;
  cta?:           string;
  timeline?:      Array<{ date?: string; ctr?: number; cpa?: number }>;
  [k: string]: unknown;
};

function _getLatestMetrics(v: _RawVariant): { ctr: number; cpa: number } {
  if (!v.timeline?.length) return { ctr: 0, cpa: 0 };
  const sorted = [...v.timeline].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
  return { ctr: sorted[0].ctr ?? 0, cpa: sorted[0].cpa ?? 0 };
}

function _buildPatterns(
  rows: Array<{ value: string; ctr: number; cpa: number }>,
): LearnedPattern[] {
  const groups: Record<string, { ctrs: number[]; cpas: number[] }> = {};
  for (const { value, ctr, cpa } of rows) {
    if (!value) continue;
    if (!groups[value]) groups[value] = { ctrs: [], cpas: [] };
    groups[value].ctrs.push(ctr);
    groups[value].cpas.push(cpa);
  }
  return Object.entries(groups)
    .map(([value, { ctrs, cpas }]) => {
      const wins   = ctrs.length;
      const avgCTR = ctrs.reduce((s, v) => s + v, 0) / wins;
      const avgCPA = cpas.reduce((s, v) => s + v, 0) / wins || 1;
      const score  = avgCTR + 1 / avgCPA;
      return { value, score, wins, avgCTR, avgCPA };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Pure function — pass already-parsed JSON arrays.
 * Returns null when there is no historical winning data to learn from.
 */
export function getLearnedPatterns(
  tests:       _RawTest[],
  experiments: _RawVariant[],
): LearnedPatterns | null {
  const winnerIds = tests
    .filter(t => t.learning?.winnerVariantId)
    .map(t => t.learning!.winnerVariantId!);

  if (winnerIds.length === 0) return null;

  const winners = winnerIds
    .map(id => experiments.find(e => e.variantId === id))
    .filter((v): v is _RawVariant => !!v);

  if (winners.length === 0) return null;

  const hook   = _buildPatterns(winners.map(v => ({ value: v.hookType      ?? "", ..._getLatestMetrics(v) })));
  const format = _buildPatterns(winners.map(v => ({ value: v.creativeFormat ?? "", ..._getLatestMetrics(v) })));
  const cta    = _buildPatterns(winners.map(v => ({ value: v.cta            ?? "", ..._getLatestMetrics(v) })));

  if (!hook.length && !format.length && !cta.length) return null;
  return { hook, format, cta };
}

// ─── analyzeInsights ──────────────────────────────────────────────────────────

/**
 * Insight Layer — converts raw metrics into labelled issues and plain-language
 * suggestions that the UI can display as secondary context.
 *
 * Intentionally does NOT return an iteration type. The decision of what to test
 * belongs to the user; this function only surfaces what the data says.
 *
 * CPA issues are surfaced as a `ctaNote` rather than a primary issue, to
 * reinforce that CTA is always a late-stage optimization.
 */

export type IssueType     = "ctr" | "hold" | "cpa";
export type IssueSeverity = "low" | "medium" | "high";

export type PerformanceIssue = {
  type:     IssueType;
  severity: IssueSeverity;
  message:  string;
};

export type PerformanceInsight = {
  issues:      PerformanceIssue[];
  suggestions: string[];
  ctaNote?:    string;
};

export function analyzeInsights(input: RecommendationInput): PerformanceInsight {
  const { ctr, holdRate, cpa, targetCpa } = input;

  const issues:      PerformanceIssue[] = [];
  const suggestions: string[]           = [];
  let   ctaNote:     string | undefined;

  // ── CTR ────────────────────────────────────────────────────────────────────
  const ctrScore = scoreCtr(ctr);
  if (ctrScore > 0) {
    const severity: IssueSeverity = ctrScore >= 0.8 ? "high" : ctrScore >= 0.5 ? "medium" : "low";
    issues.push({
      type: "ctr",
      severity,
      message: `CTR ${ctr.toFixed(1)}% — below 2.5% threshold`,
    });
    suggestions.push("Hook may be weak — test new hook types or opening lines");
  }

  // ── Hold rate ──────────────────────────────────────────────────────────────
  const holdScore = scoreHoldRate(holdRate);
  if (holdScore > 0) {
    const severity: IssueSeverity = holdScore >= 0.8 ? "high" : holdScore >= 0.5 ? "medium" : "low";
    issues.push({
      type: "hold",
      severity,
      message: `Hold rate ${holdRate.toFixed(0)}% — viewers drop off early`,
    });
    suggestions.push(holdRate < 25
      ? "Retention drops early — consider testing a new format or structure"
      : "Retention drops early — test different visual execution",
    );
  }

  // ── CPA — always secondary; surfaced as a note, not a primary issue ────────
  const cpaScore = scoreCpa(cpa, targetCpa);
  if (cpaScore > 0) {
    const severity: IssueSeverity = cpaScore >= 0.8 ? "high" : cpaScore >= 0.5 ? "medium" : "low";
    issues.push({
      type: "cpa",
      severity,
      message: `CPA $${cpa.toFixed(0)} — above $${targetCpa.toFixed(0)} target`,
    });
    ctaNote = "Conversion is weak — consider testing CTA after improving creative fundamentals";
  }

  return { issues, suggestions, ...(ctaNote ? { ctaNote } : {}) };
}

// ─── boostConfidence ──────────────────────────────────────────────────────────

/**
 * Raises confidence by one level when the top pattern has >= 3 wins.
 * Max ceiling is "high".
 */
export function boostConfidence(c: Confidence, topWins: number): Confidence {
  if (topWins < 3) return c;
  if (c === "low")    return "medium";
  if (c === "medium") return "high";
  return "high";
}

// ─── getSeverityBreakdown ─────────────────────────────────────────────────────

/**
 * Returns the raw severity scores for all three metrics.
 * Useful for displaying a per-metric health bar in the UI.
 */
export function getSeverityBreakdown(input: RecommendationInput): SeverityBreakdown {
  const { ctr, holdRate, cpa, targetCpa } = input;
  return {
    ctr:      scoreCtr(ctr),
    holdRate: scoreHoldRate(holdRate),
    cpa:      scoreCpa(cpa, targetCpa),
  };
}
