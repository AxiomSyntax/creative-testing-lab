// ── ID SYSTEM ─────────────────────────────────────────────────────────────────
// Single source of truth for ALL ID generation in this app.
// NEVER use nanoid, uuid, Math.random, or Date.now alone for IDs.
//
// ID FORMAT
//   Test:    {project.id}-T{NN}                  e.g. leadflow-ai-T01
//   Script:  {project.id}-T{NN}-S1               e.g. leadflow-ai-T01-S1
//   Hook:    {project.id}-T{NN}-S1-H{N}          e.g. leadflow-ai-T01-S1-H2
//   Format:  {project.id}-T{NN}-S1-F{N}          e.g. leadflow-ai-T01-S1-F1
//   Visual:  {project.id}-T{NN}-S1-V{N}          e.g. leadflow-ai-T01-S1-V1
//   CTA:     {project.id}-T{NN}-S1-C{N}          e.g. leadflow-ai-T01-S1-C1
//
// RULE: project.id is ALWAYS the prefix. Never hardcode "LF1" or any fixed string.
// ─────────────────────────────────────────────────────────────────────────────

export type IterStep = "S" | "H" | "F" | "V" | "C";
export type IterBatchStep = "H" | "F" | "V" | "C";

/**
 * Convert a project name into a URL-style slug used as project.id.
 * "LeadFlow AI" → "leadflow-ai"
 * "Client X"   → "client-x"
 * "Demo"       → "demo"
 */
export function slugifyProjectName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "project";
}

/**
 * Return a slug that does not already exist among the given project codes.
 * Appends -2, -3, … until unique.
 */
export function makeUniqueSlug(name: string, existing: { code: string }[]): string {
  const base = slugifyProjectName(name);
  let slug = base;
  let n = 2;
  while (existing.some(p => p.code === slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

/**
 * Generate a test ID.
 * RULE: projectId MUST be project.id — never a hardcoded prefix.
 * Format: {project.id}-T{NN}
 * Example: generateTestId("leadflow-ai", 1) → "leadflow-ai-T01"
 */
export function generateTestId(projectId: string, testNumber: number): string {
  return `${projectId}-T${String(testNumber).padStart(2, "0")}`;
}

/**
 * Generate a variant ID by appending a step + index to a base ID.
 * Format: {baseId}-{STEP}{index}
 * Examples:
 *   generateVariantId("leadflow-ai-T01", "S", 1)    → "leadflow-ai-T01-S1"
 *   generateVariantId("leadflow-ai-T01-S1", "H", 2) → "leadflow-ai-T01-S1-H2"
 */
export function generateVariantId(
  baseId: string,
  step: IterStep,
  index: number,
): string {
  return `${baseId}-${step}${index}`;
}

/**
 * Generate an iteration batch test ID (stored in lab:tests).
 * Derived deterministically from the root script variant + step.
 * Format: {rootVariantId}-{STEP}
 * Example: generateIterationBatchId("leadflow-ai-T01-S1", "H") → "leadflow-ai-T01-S1-H"
 */
export function generateIterationBatchId(
  rootVariantId: string,
  step: IterBatchStep,
): string {
  return `${rootVariantId}-${step}`;
}

/**
 * Generate a project storage key from a sequential number.
 * This is ONLY used as the localStorage key — never as a test ID prefix.
 * Format: proj-{NN}
 */
export function generateProjectId(projectNumber: number): string {
  return `proj-${String(projectNumber).padStart(2, "0")}`;
}

/**
 * Compute the next test number for a project by scanning existing experiments
 * for the highest T[NN] number already in use.
 */
export function nextTestNumber(allExperimentsOrTests: { variantId?: string; id?: string; testId?: string }[]): number {
  let max = 0;
  for (const e of allExperimentsOrTests) {
    const candidates = [e.variantId ?? "", e.id ?? "", e.testId ?? ""];
    for (const s of candidates) {
      const m = s.match(/-T(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  return max + 1;
}

/**
 * Count existing variants with a given root prefix + step letter to determine
 * the next safe sibling index.
 * Example: countExistingSiblings(existing, "LF1-T01-S1", "H") returns
 * how many H variants already exist, so new ones start at that + 1.
 */
export function countExistingSiblings(
  existing: { variantId?: string }[],
  rootVariantId: string,
  step: IterBatchStep,
): number {
  const pfx = `${rootVariantId}-${step}`;
  return existing.filter(e => {
    const vid = e.variantId ?? "";
    return vid.startsWith(pfx) && /^\d+$/.test(vid.slice(pfx.length));
  }).length;
}
