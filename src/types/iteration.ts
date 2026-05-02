import type { DecisionState } from "@/lib/decision-engine";

export type IterationPayload = {
  sourceVariantId: string;
  hook: string;
  body: string;
  angle: string;
  format: string;
  cta: string;
  state: DecisionState;
};
