// ─── Read-only, advisory layer ────────────────────────────────────────────────
// Combines: pattern memory, testing mode, decision guard (confidence score).
// Does NOT modify any existing logic files.
//
// Priority order (highest → lowest):
//   1. Confidence  — LOW confidence overrides all other signals
//   2. Testing mode — EXPLORATION vs EXPLOITATION
//   3. Pattern memory — top hook label, early signals
//
// Output complexity rule:
//   When secondaryMessage is present:
//     → message    = short headline only
//     → subMessage = key stat only (no prose)
//     → secondaryMessage = caveat + subtle next-step suggestion (one sentence)
//   When only message + subMessage:
//     → subMessage may carry more detail
//
// Tone by confidence level:
//   HIGH   → assertive  — "strong signal", "clear direction"
//   MEDIUM → cautious   — "promising", "validate further"
//   LOW    → uncertain  — "weak signal", "insufficient data"

import type { PatternMemoryResult } from "@/lib/pattern-memory";
import type { TestingModeResult }   from "@/lib/testing-mode";

// Must match ALL_HOOK_CATEGORIES.length in testing-mode.ts
const ALL_HOOK_CATEGORIES_TOTAL = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedInsight {
  phase:             "EXPLORATION" | "EXPLOITATION";
  confidenceLevel:   "HIGH" | "MEDIUM" | "LOW";
  message:           string;
  subMessage?:       string;
  secondaryMessage?: string;
}

interface UnifiedInsightInput {
  testingMode:          TestingModeResult;
  patternMemory:        PatternMemoryResult;
  guard:                { score: number };
  /** Last 2–3 CTR values for the top hook's experiments, oldest → newest.
   *  Sourced from existing timeline data by the caller. Optional — if absent,
   *  stagnation detection is skipped. */
  topHookRecentCTRs?:  number[];
  /** True when the previous state was late exploration (coverage ≥ 0.8).
   *  Allows the exploitation message to acknowledge the transition. */
  fromLateExploration?: boolean;
}

// ─── Stagnation detection ─────────────────────────────────────────────────────
// Flat or declining = last entry hasn't improved beyond a 5% tolerance band.
// Requires at least 2 data points.
const STAGNATION_THRESHOLD = 0.05;
function isStagnating(recentCTRs: number[] | undefined): boolean {
  if (!recentCTRs || recentCTRs.length < 2) return false;
  return recentCTRs[recentCTRs.length - 1] <= recentCTRs[0] * (1 + STAGNATION_THRESHOLD);
}

// ─── getUnifiedInsight ────────────────────────────────────────────────────────

export function getUnifiedInsight({
  testingMode,
  patternMemory,
  guard,
  topHookRecentCTRs,
  fromLateExploration,
}: UnifiedInsightInput): UnifiedInsight {

  const confidenceLevel: UnifiedInsight["confidenceLevel"] =
    guard.score >= 70 ? "HIGH"   :
    guard.score >= 40 ? "MEDIUM" : "LOW";

  const MIN_PATTERN_SUPPORT = 3;

  const coveragePct = Math.round(testingMode.coverage * 100);
  const topHook     = patternMemory.hooks.top[0] ?? null;

  // testedCategoriesCount drives both phrase rotation and hint selection.
  const missing               = testingMode.missingCategories ?? [];
  const testedCategoriesCount = ALL_HOOK_CATEGORIES_TOTAL - missing.length;

  // Deterministic phrase rotation — shifts only when a new hook type is added.
  const idx = testedCategoriesCount % 3;

  // Missing category hint — rotates selection so the same pair isn't always shown.
  // Labels have " Hook" stripped to avoid repetition (context already implies hook types).
  const exampleHint = (() => {
    if (missing.length === 0) return "";
    const label  = (s: string) => s.replace(/\s*Hook$/i, "").trim();
    const start  = missing.length > 1 ? testedCategoriesCount % missing.length : 0;
    const first  = label(missing[start]);
    const second = missing.length > 1 ? label(missing[(start + 1) % missing.length]) : null;
    return second
      ? ` (for example: ${first} or ${second})`
      : ` (for example: ${first})`;
  })();

  const EXPLORE_GUIDANCE = [
    "Try 1–2 additional hook types",
    "Expand into 1–2 new hook directions",
    "Test a couple of missing hook types",
  ] as const;

  const EXPLOIT_GUIDANCE = [
    "Create 2–3 new variations in this direction",
    "Push 2–3 more variations based on this",
    "Expand this direction with a few new variations",
  ] as const;

  const exploreGuide     = EXPLORE_GUIDANCE[idx];
  const exploitGuide     = EXPLOIT_GUIDANCE[idx];
  // Attach category examples when available — falls back to generic phrasing
  const exploreGuideHint = exampleHint ? `${exploreGuide}${exampleHint}` : exploreGuide;

  // Pattern support check — downgrade to "early signal" if sample size is too small.
  // Applied before any exploitation logic; does not mutate underlying data.
  const topHookIsStrong = topHook !== null && topHook.count >= MIN_PATTERN_SUPPORT;

  // ── PRIORITY 1: Confidence overrides all ────────────────────────────────────
  // LOW → uncertain tone. Never suggest exploitation.
  if (confidenceLevel === "LOW") {
    if (topHook) {
      return {
        phase:            testingMode.mode,
        confidenceLevel:  "LOW",
        message:          "Insufficient data",
        subMessage:       `${topHook.label} at ${topHook.avgCTR.toFixed(1)}% CTR`,
        secondaryMessage: "Pattern may be unreliable — log more data or add variants",
      };
    }
    return {
      phase:            testingMode.mode,
      confidenceLevel:  "LOW",
      message:          "Weak signal",
      subMessage:       `${coveragePct}% of hook types tested — not enough data to detect a pattern`,
      secondaryMessage: "Log more data or add variants",
    };
  }

  // ── PRIORITY 2: Exploration phase ───────────────────────────────────────────
  // Confidence is MEDIUM or HIGH. Coverage sub-ranges determine tone:
  //   ≥ 80%  → late exploration  ("Almost complete")
  //   60–79% → mid-phase        ("Coverage building")
  //   < 60%  → early exploration (topHook-aware messaging)
  if (testingMode.mode === "EXPLORATION") {
    // Late exploration (≥ 80% covered) — almost there, final gaps only
    if (testingMode.coverage >= 0.8) {
      return {
        phase:            "EXPLORATION",
        confidenceLevel,
        message:          "Almost complete — final gaps remaining",
        subMessage:       topHook
          ? `${topHook.label} leading at ${topHook.avgCTR.toFixed(1)}% CTR, ${coveragePct}% covered`
          : `${coveragePct}% of hook types tested`,
        secondaryMessage: "Test remaining hook types before committing",
      };
    }

    // Mid-phase (60–79% covered) — transition zone between exploration and exploitation
    if (testingMode.coverage >= 0.6) {
      return {
        phase:            "EXPLORATION",
        confidenceLevel,
        message:          "Coverage building — nearing decision point",
        subMessage:       topHook
          ? `${topHook.label} leading at ${topHook.avgCTR.toFixed(1)}% CTR, ${coveragePct}% covered`
          : `${coveragePct}% of hook types tested`,
        secondaryMessage: "Validate remaining directions before committing",
      };
    }

    if (topHook) {
      if (confidenceLevel === "HIGH") {
        return {
          phase:            "EXPLORATION",
          confidenceLevel,
          message:          "Direction emerging",
          subMessage:       `${topHook.label} — ${topHook.avgCTR.toFixed(1)}% CTR, ${coveragePct}% covered`,
          secondaryMessage: `Coverage still incomplete — ${exploreGuideHint.toLowerCase()}`,
        };
      }
      return {
        phase:            "EXPLORATION",
        confidenceLevel,
        message:          "Promising early signal",
        subMessage:       `${topHook.label} — ${topHook.avgCTR.toFixed(1)}% CTR, ${coveragePct}% covered`,
        secondaryMessage: `Validate further — ${exploreGuideHint.toLowerCase()}`,
      };
    }

    // No pattern yet
    if (confidenceLevel === "HIGH") {
      return {
        phase:            "EXPLORATION",
        confidenceLevel,
        message:          "Clear coverage gap",
        subMessage:       `${coveragePct}% of hook types tested — broaden coverage to surface a direction`,
        secondaryMessage: exploreGuideHint,
      };
    }
    return {
      phase:            "EXPLORATION",
      confidenceLevel,
      message:          "More coverage needed",
      subMessage:       `${coveragePct}% of hook types tested — keep introducing new hook types`,
      secondaryMessage: exploreGuideHint,
    };
  }

  // ── PRIORITY 3: Exploitation phase ──────────────────────────────────────────
  // Only reached when confidence is MEDIUM or HIGH AND coverage ≥ 60%.
  if (topHook) {
    // Stagnation override — applied before confidence branching.
    // Tone is softened for HIGH confidence (strong prior signal deserves a gentler nudge).
    if (isStagnating(topHookRecentCTRs)) {
      const isHighConfidence = confidenceLevel === "HIGH";
      return {
        phase:            "EXPLOITATION",
        confidenceLevel,
        message:          isHighConfidence ? "Momentum slowing" : "Progress slowing",
        subMessage:       `${topHook.label} — ${topHook.avgCTR.toFixed(1)}% avg CTR`,
        secondaryMessage: isHighConfidence
          ? "Consider refining execution before changing direction"
          : "Consider testing a different direction or refining execution",
      };
    }

    if (confidenceLevel === "MEDIUM") {
      const baseMessage = fromLateExploration
        ? "Direction confirmed — moving into refinement"
        : topHook.count >= 5 ? "Strong direction building" : "Promising direction";
      return {
        phase:            "EXPLOITATION",
        confidenceLevel,
        message:          baseMessage,
        subMessage:       `${topHook.label} — ${topHook.avgCTR.toFixed(1)}% CTR`,
        secondaryMessage: `${exploitGuide} before scaling`,
      };
    }

    if (!topHookIsStrong) {
      return {
        phase:            "EXPLOITATION",
        confidenceLevel,
        message:          `${topHook.label} — early signal`,
        subMessage:       `${topHook.count} of ${MIN_PATTERN_SUPPORT} experiments needed`,
        secondaryMessage: `Pattern support still thin — ${exploitGuide.toLowerCase()}`,
      };
    }

    // HIGH + confirmed pattern
    return {
      phase:            "EXPLOITATION",
      confidenceLevel,
      message:          topHook.count >= 8
        ? `Direction established (${topHook.label.replace(/\s*Hook$/i, "").trim()})`
        : `${topHook.label} — strong signal confirmed`,
      subMessage:       "Scale variations in this direction",
      secondaryMessage: topHook.count >= 8
        ? "Focus on refining and scaling rather than testing new variations"
        : "Double down — create 2–3 strong variations in this direction",
    };
  }

  // ── Safe neutral fallback ────────────────────────────────────────────────────
  return {
    phase:            testingMode.mode,
    confidenceLevel,
    message:          confidenceLevel === "HIGH" ? "Looks promising" : "Promising start",
    subMessage:       `${coveragePct}% of hook types tested`,
    secondaryMessage: testingMode.mode === "EXPLOITATION" ? exploitGuide : exploreGuideHint,
  };
}
