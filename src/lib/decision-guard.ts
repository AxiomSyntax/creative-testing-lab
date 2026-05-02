import type { ConfidenceResult } from "@/lib/confidence-engine";
import type { NextAction } from "@/lib/decision-engine";

export type GuardMode = "FULL" | "LIMITED" | "BLOCKED";

export type GuardResult = {
  decision: NextAction;
  mode: GuardMode;
  message: string;
};

export function applyDecisionGuard(
  decision: NextAction,
  confidence: ConfidenceResult,
): GuardResult {
  const { score } = confidence;

  if (score >= 70) {
    return {
      decision,
      mode: "FULL",
      message: "High confidence — proceed",
    };
  }

  if (score >= 40) {
    return {
      decision,
      mode: "LIMITED",
      message: "Moderate confidence — proceed with caution",
    };
  }

  return {
    decision,
    mode: "BLOCKED",
    message: "Low confidence — insufficient data",
  };
}
