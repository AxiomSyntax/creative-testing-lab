// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "High" | "Medium" | "Low";

export type ConfidenceResult = {
  score:   number;          // 0–100
  level:   ConfidenceLevel;
  label:   string;          // "High Confidence" | "Medium Confidence" | "Low Confidence"
  tooltip: string;          // human-readable explanation for the tooltip
};

// ─── computeDecisionConfidence ────────────────────────────────────────────────
//
// Additive scoring across three factors. Does NOT modify any existing decision
// logic — it only reads metric values to compute a confidence overlay.
//
// Factor 1 — Data volume (0–35 pts)
//   More variants + more logged data points → higher volume score.
//
// Factor 2 — Consistency (0–30 pts)
//   Low spread between best/worst metric across variants → consistent signal.
//   Single variant gets a neutral 15 pts (can't measure spread).
//
// Factor 3 — Metric strength (0–35 pts)
//   Distance of the best CTR / hold rate above their benchmark thresholds.
//   Benchmarks: CTR 2.0 %, hold rate 35 %.

export function computeDecisionConfidence(
  variants: Array<{ metrics: { ctr: number; holdRate: number } }>,
  entryCount = 1,
): ConfidenceResult {
  const n = variants.length;

  // ── Factor 1: Data volume (0–35 pts) ────────────────────────────────────────
  const variantScore =
    n === 0 ? 0 :
    n === 1 ? 8 :
    n === 2 ? 16 :
    n === 3 ? 22 :
    n === 4 ? 28 : 35;
  const entryBonus = Math.min(Math.max(entryCount - 1, 0), 5) * 1.4;
  const volumeScore = Math.min(35, variantScore + entryBonus);

  // ── Factor 2: Consistency across variants (0–30 pts) ────────────────────────
  let consistencyScore = 15; // neutral default (single variant)
  if (n === 0) {
    consistencyScore = 0;
  } else if (n > 1) {
    const ctrs  = variants.map(v => v.metrics.ctr);
    const holds = variants.map(v => v.metrics.holdRate);
    const ctrSpread  = Math.max(...ctrs)  - Math.min(...ctrs);
    const holdSpread = Math.max(...holds) - Math.min(...holds);
    const ctrC  = ctrSpread  < 0.5 ? 15 : ctrSpread  < 1.5 ? 10 : ctrSpread  < 3 ? 6 : 2;
    const holdC = holdSpread < 5   ? 15 : holdSpread < 15  ? 10 : holdSpread < 25 ? 6 : 2;
    consistencyScore = ctrC + holdC;
  }

  // ── Factor 3: Metric strength vs benchmarks (0–35 pts) ──────────────────────
  let strengthScore = 0;
  if (n > 0) {
    const bestCTR  = Math.max(...variants.map(v => v.metrics.ctr));
    const bestHold = Math.max(...variants.map(v => v.metrics.holdRate));
    // CTR: benchmark 2.0 %, ceiling 4.0 %
    const ctrS  = bestCTR  >= 4.0 ? 17 : bestCTR  >= 3.0 ? 13 : bestCTR  >= 2.0 ? 9 : bestCTR  >= 1.0 ? 3 : 0;
    // Hold rate: benchmark 35 %, ceiling 60 %
    const holdS = bestHold >= 60  ? 18 : bestHold >= 50  ? 14 : bestHold >= 35  ? 10 : bestHold >= 20  ? 4 : 0;
    strengthScore = ctrS + holdS;
  }

  // ── Total ────────────────────────────────────────────────────────────────────
  const score = Math.min(100, Math.max(0, Math.round(volumeScore + consistencyScore + strengthScore)));
  const level: ConfidenceLevel = score >= 70 ? "High" : score >= 42 ? "Medium" : "Low";

  // ── Tooltip text ─────────────────────────────────────────────────────────────
  const parts: string[] = [];

  if (n === 0) {
    parts.push("No variant data logged yet");
  } else if (n === 1) {
    parts.push("1 variant — test more to measure consistency");
  } else if (n >= 4) {
    parts.push(`${n} variants tested`);
  } else {
    parts.push(`${n} variants — more data raises confidence`);
  }

  if (entryCount >= 5) {
    parts.push(`${entryCount} data points logged`);
  } else if (entryCount <= 2 && n > 0) {
    parts.push("few entries — log more for a stronger signal");
  }

  if (n > 1) {
    const ctrs   = variants.map(v => v.metrics.ctr);
    const spread = Math.max(...ctrs) - Math.min(...ctrs);
    if (spread < 0.5)  parts.push("consistent CTR across variants");
    if (spread > 2.5)  parts.push("wide CTR spread — results may be noisy");
  }

  if (n > 0) {
    const bestCTR  = Math.max(...variants.map(v => v.metrics.ctr));
    const bestHold = Math.max(...variants.map(v => v.metrics.holdRate));
    if (bestCTR  >= 3.0) parts.push(`strong CTR (${bestCTR.toFixed(1)}%)`);
    else if (bestCTR  < 1.0) parts.push(`low CTR (${bestCTR.toFixed(1)}%)`);
    if (bestHold >= 50)  parts.push(`strong hold rate (${bestHold.toFixed(0)}%)`);
    else if (bestHold < 15)  parts.push(`low hold rate (${bestHold.toFixed(0)}%)`);
  }

  return {
    score,
    level,
    label:   `${level} Confidence`,
    tooltip: parts.length ? parts.join(" · ") : "Insufficient data to calculate confidence",
  };
}
