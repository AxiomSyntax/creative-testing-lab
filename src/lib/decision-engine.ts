// ─── Types ────────────────────────────────────────────────────────────────────

export type PerformanceMetrics = {
  ctr: number;
  holdRate: number;
  cpa?: number;
};

export type DecisionVariant = {
  id: string;
  metrics: PerformanceMetrics;
};

export type DecisionState =
  | "NO_SIGNAL"
  | "WEAK_SIGNAL"
  | "VALIDATED_BODY";

// ─── Thresholds (configurable) ────────────────────────────────────────────────

export const THRESHOLDS = {
  HOLD: 35,   // minimum hold rate % to indicate body is working
  CTR: 2.0,   // minimum CTR % to indicate entry / hook is working
} as const;

// ─── classifyTestState ────────────────────────────────────────────────────────

export function classifyTestState(variants: DecisionVariant[]): DecisionState {
  if (!variants || variants.length === 0) return "NO_SIGNAL";

  const bestCTR  = Math.max(...variants.map(v => v.metrics.ctr));
  const bestHold = Math.max(...variants.map(v => v.metrics.holdRate));

  if (bestHold < THRESHOLDS.HOLD && bestCTR < THRESHOLDS.CTR) {
    return "NO_SIGNAL";
  }

  if (bestHold >= THRESHOLDS.HOLD && bestCTR < THRESHOLDS.CTR) {
    return "WEAK_SIGNAL";
  }

  if (bestHold >= THRESHOLDS.HOLD && bestCTR >= THRESHOLDS.CTR) {
    return "VALIDATED_BODY";
  }

  return "WEAK_SIGNAL";
}

// ─── getNextAction ────────────────────────────────────────────────────────────

export type NextAction = {
  title: string;
  action: string;
  instructions: string[];
};

export function getNextAction(state: DecisionState): NextAction {
  switch (state) {
    case "NO_SIGNAL":
      return {
        title: "No clear signal",
        action: "Test new bodies / angles",
        instructions: [
          "Do NOT test hooks yet",
          "Change core message or angle",
          "Keep format simple (UGC / Talking Head)",
        ],
      };

    case "WEAK_SIGNAL":
      return {
        title: "Weak signal detected",
        action: "Refine body",
        instructions: [
          "Keep angle but improve clarity",
          "Test 2–3 body variations",
          "Avoid changing hook + format together",
        ],
      };

    case "VALIDATED_BODY":
      return {
        title: "Core message validated",
        action: "Test hooks",
        instructions: [
          "Keep body identical",
          "Test 3 new hooks (Curiosity, Stat, Contrarian)",
          "Keep CTA constant",
        ],
      };
  }
}
