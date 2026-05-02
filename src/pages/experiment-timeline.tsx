import { useState, useMemo, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, CheckCircle2, XCircle,
  Plus, Trash2, TrendingUp, BarChart3,
  ChevronRight, Calendar, FlaskConical, History,
  MousePointerClick, Target, Eye, DollarSign,
  GitBranch, X, ChevronDown, Zap, Pencil,
  FileText, Layers, Rocket, RotateCcw, ArrowRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageTransition } from "@/components/page-transition";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { classifyTestState } from "@/lib/decision-engine";
import { computeDecisionConfidence } from "@/lib/confidence-engine";
import { ConfidenceBadge } from "@/components/confidence-badge";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "Draft" | "Producing" | "Ready to Test" | "Testing" | "Winner" | "Loser" | "Iterate" | "Iterated" | "Killed";

export type IterationType = "HOOK" | "FORMAT" | "CTA" | "VISUAL" | null;

export interface TLEntry {
  id: string;
  date: string;       // ISO "YYYY-MM-DD"
  tsr: number;
  hold: number;
  ctr: number;
  cpa: number;
  createdAt: number;
}

export interface Variant {
  id: string;
  variantId: string;
  parentVariantId?: string;
  originScriptId?: string;
  adVariant: string;
  hookType: string;
  primaryAngle: string;
  creativeFormat: string;
  cta: string;
  status: Status;
  startDate: string;  // ISO "YYYY-MM-DD", "" = not set
  timeline: TLEntry[];
  // Script content
  hookText?: string;
  bodyText?: string;
  ctaText?: string;
  // Production info
  adAssetLink?: string;
  platform?: string;
  editor?: string;
  dueDate?: string;
  // ── Iteration lineage (added v2; optional — migrateVariant fills defaults) ─
  parentId?:      string | null;  // UUID of the source variant, null for root
  rootId?:        string;         // UUID of the original root variant
  iterationType?: IterationType;  // what axis was changed in this iteration
  iterationStep?: number;         // depth from root (0 = root)
  // ── Ad Group (optional — backward compatible) ─
  groupId?:       string | null;  // UUID of the containing Ad Group
  // ── Test (optional — backward compatible) ─
  testId?:        string | null;  // UUID of the parent Test; defaults to variant.id
  // ── Production (optional) ─
  productionNotes?: string;       // free-text notes for Format iteration execution
  // ── Static Ad fields (optional — backward compatible) ──────────────────────
  adType?: "video" | "static";   // default "video" when undefined
  headline?: string;
  visualConcept?: string;         // description of the visual
  adCopy?: string;                // body text under the image
  // ── Lifecycle (added v3) ──────────────────────────────────────────────────
  killedAt?: string;              // ISO timestamp when status set to Killed
  isIterated?: boolean;           // true once this variant has been used as iteration source
}

export interface AdGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: number;  // timestamp
}

export interface Test {
  id: string;
  name: string;
  objective: string;    // e.g. "Hook Test", "Format Test"
  variable: "HOOK" | "FORMAT" | "BODY" | "CTA";
  createdAt: number;    // timestamp
}

// ─── Test phase ───────────────────────────────────────────────────────────────

export type TestPhase = "script" | "hook" | "format" | "visual" | "cta";

/** Ordered list used for the progress bar UI. */
export const PHASE_SEQUENCE: TestPhase[] = ["script", "hook", "format", "visual", "cta"];

/** Advance to the next phase after creating an iteration batch. */
export const NEXT_PHASE: Record<TestPhase, TestPhase> = {
  script: "hook",
  hook:   "format",
  format: "visual",
  visual: "cta",
  cta:    "cta",
};

/** Map a phase to the IterationType it should pre-select. */
export const PHASE_TO_ITER: Record<TestPhase, IterationType> = {
  script: null,
  hook:   "HOOK",
  format: "FORMAT",
  visual: "VISUAL",
  cta:    "CTA",
};

/**
 * Derive the test phase from a variant ID's suffix.
 *
 * This is the SINGLE SOURCE OF TRUTH for phase detection.
 * No localStorage reads. No AI logic. Pure ID parsing.
 *
 * Supports two formats:
 *   New: LF1-T1-S1         → script
 *        LF1-T1-S1-H2      → hook
 *        LF1-T1-S1-F1      → format
 *        LF1-T1-S1-V1      → visual
 *        LF1-T1-S1-C2      → cta
 *   Legacy: LEAD-V01       → script
 *           LEAD-V01-H1    → hook
 *           LEAD-V01-F2    → format
 */
export function getIterationPhaseFromId(id: string): TestPhase {
  if (!id) return "script";

  // New structured format: anything matching [prefix]-S[n] optionally followed by -[HFVC][n]
  const newFmt = id.match(/^.+-S\d+(-[HFVC]\d+)?$/);
  if (newFmt !== null) {
    const suffix = newFmt[1] ?? "";
    if (suffix.startsWith("-C")) return "cta";
    if (suffix.startsWith("-V")) return "visual";
    if (suffix.startsWith("-F")) return "format";
    if (suffix.startsWith("-H")) return "hook";
    return "script";
  }

  // Legacy format (e.g. LEAD-V01-H1): the step suffix is -[HFVC][n] at end,
  // preceded by a digit so we don't confuse "LEAD-V01" (base) with a visual variant.
  if (/\d-C\d+$/.test(id)) return "cta";
  if (/\d-V\d+$/.test(id)) return "visual";
  if (/\d-F\d+$/.test(id)) return "format";
  if (/\d-H\d+$/.test(id)) return "hook";
  return "script";
}

/**
 * Return the next phase after the one encoded in the given ID.
 * Returns null when the chain is complete (cta phase reached).
 */
export function getNextIterationPhase(currentId: string): TestPhase | null {
  const current = getIterationPhaseFromId(currentId);
  const map: Record<TestPhase, TestPhase | null> = {
    script: "hook",
    hook:   "format",
    format: "visual",
    visual: "cta",
    cta:    null,
  };
  return map[current];
}

// Richer test shape as stored by seedDemoProject / Creative Lab
export interface RawTest {
  id: string;
  name?: string;
  objective?: string;
  variable?: string;
  phase?: TestPhase;
  iterationType?: IterationType;
  variantIds?: string[];          // display variantIds e.g. "LEAD-V03"
  parentTestId?: string | null;
  sourceVariantId?: string | null;
  platform?: string;
  createdAt?: number;
  learning?: {
    winnerVariantId?: string | null;
    insight?: string;
    nextAction?: string;
  } | null;
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

export function createTest(
  objective: string,
  variable: "HOOK" | "FORMAT" | "BODY" | "CTA" = "HOOK"
): Test {
  return {
    id: `t-${Date.now()}`,
    name: objective,
    objective,
    variable,
    createdAt: Date.now(),
  };
}

export function assignVariantsToTest(
  variants: any[],
  testId: string,
  variantIds: string[]
): any[] {
  return variants.map(v =>
    variantIds.includes(v.id) ? { ...v, testId } : v
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeDay(date: string, startDate: string): number {
  if (!date || !startDate) return 1;
  const diff = Math.floor(
    (new Date(date).getTime() - new Date(startDate).getTime()) / 86400000
  );
  return Math.max(1, diff + 1);
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Migration ────────────────────────────────────────────────────────────────

function migrateTLEntry(e: any, startDate: string): TLEntry {
  let date = e.date ?? "";
  if (!date) {
    if (e.day != null && startDate) {
      date = addDays(startDate, (e.day as number) - 1);
    } else if (e.createdAt) {
      date = new Date(e.createdAt).toISOString().slice(0, 10);
    } else {
      date = todayISO();
    }
  }
  return {
    id:        e.id ?? `m-${e.date ?? "0"}-${e.createdAt ?? 0}`,
    date,
    tsr:       e.tsr ?? 0,
    hold:      e.hold ?? e.holdRate ?? 0,
    ctr:       e.ctr ?? 0,
    cpa:       e.cpa ?? 0,
    createdAt: e.createdAt ?? Date.now(),
  };
}

export function migrateVariant(raw: any): Variant {
  const startDate: string = raw.startDate ?? "";
  // ── Lineage defaults (safe backward-compat) ───────────────────────────────
  const lineage = {
    parentId:      raw.parentId      ?? null,
    rootId:        raw.rootId        ?? raw.id,
    iterationType: (raw.iterationType ?? null) as IterationType,
    iterationStep: raw.iterationStep ?? 0,
    groupId:       raw.groupId       ?? null,
    testId:        raw.testId        ?? raw.id,  // Default: each variant is its own test
  };
  if (Array.isArray(raw.timeline)) {
    return {
      ...raw,
      ...lineage,
      startDate,
      adType: raw.adType ?? "video",
      status: (raw.status === "Paused" ? "Draft" : raw.status) ?? "Draft",
      timeline: (raw.timeline as any[]).map((e: any) => migrateTLEntry(e, startDate)),
    };
  }
  // Legacy flat metrics → single TLEntry
  const tsr  = raw.thumbStopRate ?? 0;
  const hold = raw.holdRate ?? 0;
  const ctr  = raw.ctr ?? 0;
  const cpa  = raw.cpa ?? 0;
  const hasMet = tsr > 0 || hold > 0 || ctr > 0 || cpa > 0;
  const date = startDate || todayISO();
  return {
    ...raw,
    id:              raw.id,
    variantId:       raw.variantId ?? "",
    parentVariantId: raw.parentVariantId,
    originScriptId:  raw.originScriptId,
    adVariant:       raw.adVariant ?? "",
    hookType:        raw.hookType ?? "",
    primaryAngle:    raw.primaryAngle ?? "",
    creativeFormat:  raw.creativeFormat ?? "",
    cta:             raw.cta ?? "",
    adType:          raw.adType ?? "video",
    status:          (raw.status === "Paused" ? "Draft" : raw.status) ?? "Draft",
    startDate,
    ...lineage,
    timeline: hasMet
      ? [{ id: `m-${raw.id}`, date, tsr, hold, ctr, cpa, createdAt: Date.now() }]
      : [],
  };
}

// ─── Iteration lineage utilities ──────────────────────────────────────────────

const ITER_PREFIX: Record<NonNullable<IterationType>, string> = {
  HOOK:   "H",
  FORMAT: "F",
  CTA:    "C",
  VISUAL: "V",
};

/**
 * Returns the next iteration suffix for a given source variantId + type.
 * Counts existing siblings (same parentId + same iterationType) to avoid collisions.
 * Example: 2 existing HOOK children of "LEAD-103" → returns "-H3"
 */
export function getNextIterationSuffix(
  allVariants: Variant[],
  sourceId: string,
  iterationType: NonNullable<IterationType>,
): string {
  const prefix = ITER_PREFIX[iterationType];
  const siblingCount = allVariants.filter(
    v => v.parentId === sourceId && v.iterationType === iterationType,
  ).length;
  return `-${prefix}${siblingCount + 1}`;
}

/**
 * Resolves the rootId for a new child variant.
 * If the source has a rootId already, inherit it; otherwise the source itself is the root.
 */
export function resolveRootId(sourceVariant: Pick<Variant, "id"> & { rootId?: string }): string {
  return sourceVariant.rootId ?? sourceVariant.id;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<Status, { color: string; Icon: React.ElementType; bg: string; border: string }> = {
  "Draft":         { color:"#94a3b8", Icon:FileText,    bg:"#94a3b815", border:"#94a3b830" },
  "Producing":     { color:"#818cf8", Icon:Layers,      bg:"#818cf815", border:"#818cf830" },
  "Ready to Test": { color:"#38bdf8", Icon:Rocket,      bg:"#38bdf815", border:"#38bdf830" },
  "Testing":       { color:"#f59e0b", Icon:Clock,       bg:"#f59e0b15", border:"#f59e0b30" },
  "Winner":        { color:"#10b981", Icon:CheckCircle2,bg:"#10b98115", border:"#10b98130" },
  "Loser":         { color:"#ef4444", Icon:XCircle,     bg:"#ef444415", border:"#ef444430" },
  "Iterate":       { color:"#a78bfa", Icon:RotateCcw,   bg:"#a78bfa15", border:"#a78bfa30" },
  "Iterated":      { color:"#6366f1", Icon:RotateCcw,   bg:"#6366f115", border:"#6366f130" },
  "Killed":        { color:"#64748b", Icon:XCircle,     bg:"#64748b12", border:"#64748b25" },
};

// Allowed transitions from each status (mirrors creative-lab)
const STATUS_TRANSITIONS: Record<Status, Status[]> = {
  "Draft":         ["Testing", "Producing"],
  "Producing":     ["Testing", "Winner", "Loser"],
  "Ready to Test": ["Testing", "Producing"],
  "Testing":       ["Producing", "Winner", "Loser"],
  "Winner":        [],
  "Loser":         ["Killed"],
  "Iterate":       ["Producing", "Draft"],
  "Iterated":      [],
  "Killed":        [],
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Draft"];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      <cfg.Icon className="w-2.5 h-2.5" />{status}
    </span>
  );
}

function ClickableStatusBadge({ status, onSave }: { status: Status; onSave: (s: Status) => void }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Draft"];
  const allowedNext = STATUS_TRANSITIONS[status] ?? [];

  function handleSelect(val: Status) {
    onSave(val);
    setOpen(false);
    clearTimeout(flashTimer.current);
    setFlash(true);
    flashTimer.current = setTimeout(() => setFlash(false), 800);
  }

  const noTransitions = allowedNext.length === 0;

  return (
    <Popover open={open} onOpenChange={noTransitions ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <motion.span
          animate={{ boxShadow: flash ? ["0 0 0 2px rgba(16,185,129,0.4)", "0 0 0 0px rgba(16,185,129,0)"] : "none" }}
          transition={{ duration: 0.6 }}
          title={allowedNext.length ? "Click to change status" : undefined}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 transition-all ${
            noTransitions ? "cursor-default" : "cursor-pointer hover:brightness-110 hover:scale-[1.03]"
          }`}
          style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        >
          <cfg.Icon className="w-2.5 h-2.5" />{status}
        </motion.span>
      </PopoverTrigger>

      {allowedNext.length > 0 && (
        <PopoverContent
          className="p-1.5 bg-[#0f1117] border-white/10 shadow-2xl w-auto min-w-[160px]"
          align="start"
          sideOffset={5}
          onOpenAutoFocus={e => e.preventDefault()}
        >
          <p className="text-[10px] text-muted-foreground/50 px-1.5 pb-1 uppercase tracking-wider">Move to</p>
          <div className="flex flex-col gap-0.5">
            {allowedNext.map(s => {
              const c = STATUS_CFG[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left hover:bg-white/[0.06]"
                >
                  <ArrowRight className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{ background: c.bg, color: c.color, borderColor: c.border }}
                  >
                    <c.Icon className="w-2.5 h-2.5" />{s}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({
  entries, field, color, label, suffix, prefix, lowerIsBetter
}: {
  entries: TLEntry[];
  field: keyof Pick<TLEntry, "tsr" | "hold" | "ctr" | "cpa">;
  color: string;
  label: string;
  suffix?: string;
  prefix?: string;
  lowerIsBetter?: boolean;
}) {
  const W = 160, H = 52, PAD = 6;
  const sortedEnt = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const vals = sortedEnt.map(e => e[field] as number);
  const latest = vals[vals.length - 1] ?? 0;
  const first  = vals[0] ?? 0;
  const trend  = latest - first;
  const isPositive = lowerIsBetter ? trend < 0 : trend > 0;

  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const points = sortedEnt.map((_, i) => {
    const x = PAD + (i / Math.max(sortedEnt.length - 1, 1)) * (W - PAD * 2);
    const y = (H - PAD) - ((vals[i] - minV) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const areaPoints = sortedEnt.length > 0
    ? `${PAD},${H - PAD} ${points} ${PAD + ((sortedEnt.length - 1) / Math.max(sortedEnt.length - 1, 1)) * (W - PAD * 2)},${H - PAD}`
    : "";

  return (
    <div className="flex flex-col gap-1 bg-white/[0.025] rounded-xl border border-white/8 p-3">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</span>
        {trend !== 0 && (
          <span className={`text-[9px] font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}{suffix}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-lg font-extrabold tabular-nums" style={{ color }}>
          {prefix}{latest.toFixed(1)}{suffix}
        </span>
        {entries.length >= 2 ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0" style={{ width: 100, height: 36 }}>
            {entries.length >= 2 && (
              <polygon
                points={areaPoints}
                fill={color}
                fillOpacity={0.08}
              />
            )}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {entries.length > 0 && (() => {
              const lastPt = points.split(" ").pop()?.split(",") ?? [];
              if (lastPt.length < 2) return null;
              return <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill={color} />;
            })()}
          </svg>
        ) : (
          <span className="text-[9px] text-muted-foreground/25">need ≥2 points</span>
        )}
      </div>
    </div>
  );
}

// ─── Log Entry Form ────────────────────────────────────────────────────────────

interface EntryForm { date: string; tsr: string; hold: string; ctr: string; cpa: string; }
const blankEntry = (): EntryForm => ({ date: todayISO(), tsr: "", hold: "", ctr: "", cpa: "" });

function LogForm({ startDate, onSubmit, onCancel, adType = "video" }: {
  startDate: string;
  onSubmit: (entry: Omit<TLEntry, "id" | "createdAt">) => void;
  onCancel: () => void;
  adType?: "video" | "static";
}) {
  const [form, setForm] = useState<EntryForm>(blankEntry());
  const set = (k: keyof EntryForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const computedDay = computeDay(form.date, startDate);

  function submit() {
    if (!form.date) return;
    const tsr  = parseFloat(form.tsr);
    const hold = parseFloat(form.hold);
    const ctr  = parseFloat(form.ctr);
    const cpa  = parseFloat(form.cpa);
    onSubmit({
      date: form.date,
      tsr:  adType === "static" ? 0 : (isNaN(tsr)  ? 0 : tsr),
      hold: adType === "static" ? 0 : (isNaN(hold) ? 0 : hold),
      ctr:  isNaN(ctr)  ? 0 : ctr,
      cpa:  isNaN(cpa)  ? 0 : cpa,
    });
  }

  const fieldCls = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono tabular-nums placeholder:text-slate-700 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10";
  const labelCls = "text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-0.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4"
    >
      <p className="text-xs font-bold text-white mb-3">Log data point</p>
      <div className="flex gap-2 mb-3">
        {/* Date picker */}
        <div className="flex flex-col flex-1">
          <p className={labelCls}>Date</p>
          <input
            type="date"
            value={form.date}
            onChange={set("date")}
            className={`${fieldCls} text-left`}
          />
        </div>
        {/* Computed day badge */}
        <div className="flex flex-col items-center justify-center min-w-[52px]">
          <p className={labelCls}>Day</p>
          <span className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-black font-mono tabular-nums">
            {startDate && form.date ? computedDay : "—"}
          </span>
        </div>
      </div>
      <div className={`grid ${adType === "static" ? "grid-cols-2" : "grid-cols-4"} gap-2 mb-3`}>
        {((adType === "static"
          ? [
              { key: "ctr",  label: "CTR %",   placeholder: "3.8" },
              { key: "cpa",  label: "CPA $",   placeholder: "44"  },
            ]
          : [
              { key: "tsr",  label: "TSR %",   placeholder: "42"  },
              { key: "hold", label: "Hold %",  placeholder: "55"  },
              { key: "ctr",  label: "CTR %",   placeholder: "3.8" },
              { key: "cpa",  label: "CPA $",   placeholder: "44"  },
            ]
        ) as { key: keyof EntryForm; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col">
            <p className={labelCls}>{label}</p>
            <input
              type="number"
              step="0.1"
              placeholder={placeholder}
              value={form[key]}
              onChange={set(key)}
              className={`${fieldCls} text-right`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors"
        >
          Save Entry
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ─── Timeline Table ───────────────────────────────────────────────────────────

function TimelineTable({ entries, startDate, isDemo, onDelete, adType = "video" }: {
  entries: TLEntry[];
  startDate: string;
  isDemo: boolean;
  onDelete: (id: string) => void;
  adType?: "video" | "static";
}) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] py-10 flex items-center justify-center">
        <p className="text-xs text-muted-foreground/30">No data points yet — log your first entry above.</p>
      </div>
    );
  }

  const metricCols = (adType === "static"
    ? [
        { key: "ctr",  label: "CTR",  suffix: "%", prefix: "",  lowerIsBetter: false },
        { key: "cpa",  label: "CPA",  suffix: "",  prefix: "$", lowerIsBetter: true  },
      ]
    : [
        { key: "tsr",  label: "TSR",  suffix: "%", prefix: "",  lowerIsBetter: false },
        { key: "hold", label: "Hold", suffix: "%", prefix: "",  lowerIsBetter: false },
        { key: "ctr",  label: "CTR",  suffix: "%", prefix: "",  lowerIsBetter: false },
        { key: "cpa",  label: "CPA",  suffix: "",  prefix: "$", lowerIsBetter: true  },
      ]
  ) as { key: "tsr" | "hold" | "ctr" | "cpa"; label: string; suffix: string; prefix: string; lowerIsBetter: boolean }[];

  // reference = first row
  const ref = sorted[0];

  function delta(curr: number, ref: number, lowerIsBetter: boolean): { sign: string; color: string } | null {
    if (curr === ref) return null;
    const up = curr > ref;
    const positive = lowerIsBetter ? !up : up;
    return { sign: up ? "▲" : "▼", color: positive ? "#10b981" : "#ef4444" };
  }

  const thCls = "px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/35";

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/8 bg-white/[0.025]">
            <th className={`${thCls} text-left`}>Day</th>
            <th className={`${thCls} text-left`}>Date</th>
            {metricCols.map(c => (
              <th key={c.key} className={`${thCls} text-right`}>{c.label}</th>
            ))}
            <th className="px-3 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, rowIdx) => {
            const day = computeDay(entry.date, startDate);
            const isLatest = rowIdx === sorted.length - 1;
            return (
              <tr
                key={entry.id}
                className={`border-b border-white/5 last:border-0 transition-colors group hover:bg-white/[0.025] ${isLatest ? "bg-violet-500/[0.03]" : ""}`}
              >
                {/* Day */}
                <td className="px-3 py-2.5 font-mono tabular-nums text-left">
                  <span className={`font-bold ${isLatest ? "text-violet-300" : "text-muted-foreground/60"}`}>
                    {day}
                  </span>
                </td>
                {/* Date */}
                <td className="px-3 py-2.5 text-left">
                  <span className={`font-mono tabular-nums ${isLatest ? "text-white" : "text-muted-foreground/50"}`}>
                    {fmtDate(entry.date)}
                  </span>
                  {isLatest && (
                    <span className="ml-1.5 text-[8px] text-violet-400/60 font-bold uppercase tracking-wider">latest</span>
                  )}
                </td>
                {/* Metric columns */}
                {metricCols.map(c => {
                  const raw    = entry[c.key] as number;
                  const refRaw = ref[c.key]   as number;
                  const d = rowIdx > 0 ? delta(raw, refRaw, c.lowerIsBetter) : null;
                  return (
                    <td key={c.key} className="px-3 py-2.5 font-mono tabular-nums text-right">
                      <span className={`font-semibold ${isLatest ? "text-white" : "text-muted-foreground/70"}`}>
                        {c.prefix}{raw.toFixed(1)}{c.suffix}
                      </span>
                      {d && (
                        <span className="ml-1 text-[9px] font-bold" style={{ color: d.color }}>
                          {d.sign}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2.5">
                  {!isDemo && (
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-muted-foreground/20 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Creative Kill Signal ─────────────────────────────────────────────────────

type SignalStrength = "Strong" | "Medium" | "Weak";
type Recommendation = "Scale Creative" | "Iterate Creative" | "Kill Creative";

const STRENGTH_CFG: Record<SignalStrength, { color: string; bg: string; border: string; arrow: string }> = {
  Strong: { color: "#10b981", bg: "#10b98110", border: "#10b98122", arrow: "▲" },
  Medium: { color: "#f59e0b", bg: "#f59e0b10", border: "#f59e0b22", arrow: "▲" },
  Weak:   { color: "#ef4444", bg: "#ef444410", border: "#ef444422", arrow: "▼" },
};

const REC_CFG: Record<Recommendation, { color: string; bg: string; border: string; Icon: React.ElementType; label: string }> = {
  "Scale Creative":   { color: "#10b981", bg: "#10b98112", border: "#10b98135", Icon: TrendingUp, label: "Scale Creative"   },
  "Iterate Creative": { color: "#f59e0b", bg: "#f59e0b12", border: "#f59e0b35", Icon: BarChart3,  label: "Iterate Creative" },
  "Kill Creative":    { color: "#ef4444", bg: "#ef444412", border: "#ef444435", Icon: XCircle,    label: "Kill Creative"    },
};

function toStrength(value: number, low: number, high: number): SignalStrength {
  if (value > high) return "Strong";
  if (value >= low) return "Medium";
  return "Weak";
}

function cpaStrength(cpa: number, target: number): SignalStrength {
  if (cpa < target) return "Strong";
  if (cpa <= target * 1.2) return "Medium";
  return "Weak";
}

function computeRecommendation(signals: SignalStrength[], adType: "video" | "static" = "video"): Recommendation {
  const strong = signals.filter(s => s === "Strong").length;
  const weak   = signals.filter(s => s === "Weak").length;
  if (adType === "static") {
    if (strong >= 2) return "Scale Creative";
    if (signals[signals.length - 1] === "Weak") return "Kill Creative";
    return "Iterate Creative";
  }
  if (strong >= 3) return "Scale Creative";
  if (weak   >= 2) return "Kill Creative";
  return "Iterate Creative";
}

function CreativeKillSignal({ latest, cpaTarget, onSetCpaTarget, adType = "video", entryCount = 1 }: {
  latest: TLEntry;
  cpaTarget: number | null;
  onSetCpaTarget: (t: number) => void;
  adType?: "video" | "static";
  entryCount?: number;
}) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(cpaTarget != null ? String(cpaTarget) : "");

  const hookStrength   = toStrength(latest.tsr,  25, 40);
  const retention      = toStrength(latest.hold, 35, 50);
  const clickInterest  = toStrength(latest.ctr,  1.5, 3);
  const costEfficiency = cpaTarget != null ? cpaStrength(latest.cpa, cpaTarget) : null;

  const signalList: SignalStrength[] = adType === "static"
    ? [clickInterest, ...(costEfficiency ? [costEfficiency] : [])]
    : [hookStrength, retention, clickInterest, ...(costEfficiency ? [costEfficiency] : [])];
  const recommendation = computeRecommendation(signalList, adType);
  const rec = REC_CFG[recommendation];

  const confidence = computeDecisionConfidence(
    [{ metrics: { ctr: latest.ctr, holdRate: latest.hold } }],
    entryCount,
  );

  function submitTarget() {
    const n = parseFloat(targetInput);
    if (!isNaN(n) && n > 0) onSetCpaTarget(n);
    setEditingTarget(false);
  }

  const rows: Array<{ label: string; strength: SignalStrength; detail: string }> = adType === "static"
    ? [
        { label: "Click Interest", strength: clickInterest, detail: `CTR ${latest.ctr.toFixed(1)}%` },
      ]
    : [
        { label: "Hook Strength",  strength: hookStrength,  detail: `TSR ${latest.tsr.toFixed(1)}%` },
        { label: "Retention",      strength: retention,      detail: `Hold ${latest.hold.toFixed(1)}%` },
        { label: "Click Interest", strength: clickInterest, detail: `CTR ${latest.ctr.toFixed(1)}%` },
      ];

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3 h-3 text-violet-400/50" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Creative Signal</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* Signal rows */}
        <div className="divide-y divide-white/5">
          {rows.map(({ label, strength, detail }) => {
            const cfg = STRENGTH_CFG[strength];
            return (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] font-semibold text-slate-400">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-muted-foreground/35 font-mono">{detail}</span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                  >
                    {cfg.arrow} {strength}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Cost Efficiency row */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-semibold text-slate-400">Cost Efficiency</span>
            <div className="flex items-center gap-2">
              {costEfficiency != null ? (
                <>
                  <span className="text-[9px] text-muted-foreground/35 font-mono">
                    CPA ${latest.cpa.toFixed(0)} / target ${cpaTarget!.toFixed(0)}
                  </span>
                  <button
                    onClick={() => { setTargetInput(String(cpaTarget)); setEditingTarget(true); }}
                    className="text-muted-foreground/25 hover:text-muted-foreground/60 transition-colors"
                    title="Edit CPA target"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </button>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    style={{ color: STRENGTH_CFG[costEfficiency].color, background: STRENGTH_CFG[costEfficiency].bg, borderColor: STRENGTH_CFG[costEfficiency].border }}
                  >
                    {STRENGTH_CFG[costEfficiency].arrow} {costEfficiency}
                  </span>
                </>
              ) : editingTarget ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground/40">$</span>
                  <input
                    autoFocus
                    type="number"
                    step="1"
                    placeholder="e.g. 50"
                    value={targetInput}
                    onChange={e => setTargetInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") submitTarget(); if (e.key === "Escape") setEditingTarget(false); }}
                    className="w-16 bg-white/[0.05] border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-white font-mono text-right focus:outline-none focus:border-violet-500/50"
                  />
                  <button onClick={submitTarget} className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors">Set</button>
                  <button onClick={() => setEditingTarget(false)} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingTarget(true)}
                  className="text-[10px] font-semibold text-violet-400/60 hover:text-violet-400 border border-violet-500/20 hover:border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 px-2 py-0.5 rounded-md transition-all"
                >
                  Set CPA target
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div
          className="flex items-center justify-between px-4 py-3 border-t"
          style={{ borderColor: rec.border, background: rec.bg }}
        >
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: rec.color }}>
            Recommended Action
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-black border"
            style={{ color: rec.color, background: `${rec.color}18`, borderColor: rec.border }}
          >
            <rec.Icon className="w-3 h-3" />
            {rec.label}
          </span>
        </div>

        {/* Confidence score */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-white/[0.01]">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">
            Decision Confidence
          </span>
          <ConfidenceBadge result={confidence} />
        </div>
      </div>
    </div>
  );
}

// ─── Experiment List Item ─────────────────────────────────────────────────────

function ExpListItem({ exp, isSelected, onClick }: {
  exp: Variant;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isChild = !!exp.parentVariantId;
  const sorted = [...exp.timeline].sort((a, b) => a.date.localeCompare(b.date));
  const latestEntry = sorted[sorted.length - 1] ?? null;
  const entryCount = exp.timeline.length;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-150 flex items-start gap-3 group ${
        isSelected
          ? "border-violet-500/30 bg-violet-500/[0.07]"
          : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15"
      }`}
    >
      {/* Variant badge */}
      <span className={`text-[10px] font-black font-mono shrink-0 mt-0.5 ${isChild ? "text-emerald-400" : "text-violet-400"}`}>
        {exp.variantId}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p className="text-xs font-semibold text-white truncate">{exp.adVariant}</p>
          <StatusBadge status={exp.status} />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[10px] text-muted-foreground/40 truncate">
            {(exp.adType === "static"
              ? [exp.headline, exp.primaryAngle, exp.cta]
              : [exp.hookType, exp.creativeFormat, exp.cta]
            ).filter(Boolean).join(" · ")}
          </p>
          {exp.startDate && (
            <span className="text-[9px] text-muted-foreground/30 font-mono">
              · Started {fmtDate(exp.startDate)}
            </span>
          )}
        </div>
        {latestEntry ? (
          <div className="flex gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] text-muted-foreground/50">TSR <span className="text-slate-300 font-mono">{latestEntry.tsr.toFixed(1)}%</span></span>
            <span className="text-[9px] text-muted-foreground/50">CTR <span className="text-slate-300 font-mono">{latestEntry.ctr.toFixed(1)}%</span></span>
            <span className="text-[9px] text-muted-foreground/50">CPA <span className="text-slate-300 font-mono">${latestEntry.cpa.toFixed(0)}</span></span>
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground/25 mt-1">No data logged</p>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[9px] font-bold text-muted-foreground/30">
          {entryCount} {entryCount === 1 ? "entry" : "entries"}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 transition-colors ${isSelected ? "text-violet-400" : "text-muted-foreground/20 group-hover:text-muted-foreground/50"}`} />
      </div>
    </button>
  );
}

// ─── Test Block (grouped, collapsible) ────────────────────────────────────────

const ITER_DOT: Record<string, string> = {
  HOOK:   "#8b5cf6",
  FORMAT: "#10b981",
  CTA:    "#f59e0b",
  VISUAL: "#3b82f6",
};

interface TestGroup {
  test: RawTest;
  variants: Variant[];
}

function TestBlock({ group, selectedId, onSelect }: {
  group: TestGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { test, variants } = group;
  const winnerVId   = test.learning?.winnerVariantId ?? null;
  const iterType    = test.iterationType ?? null;
  const dot         = iterType ? (ITER_DOT[iterType] ?? "#94a3b8") : "#94a3b8";
  const hasSelected = variants.some(v => v.id === selectedId);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (hasSelected && !expanded) setExpanded(true);
  }, [hasSelected]);

  const label = test.name || test.objective || test.id;
  const platform = test.platform ?? null;

  return (
    <div className="flex flex-col">
      {/* ── Test header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-2 transition-all duration-150 ${
          hasSelected
            ? "border-white/18 bg-white/[0.045]"
            : expanded
              ? "border-white/12 bg-white/[0.03]"
              : "border-white/8 bg-white/[0.02] hover:bg-white/[0.035] hover:border-white/12"
        }`}
      >
        {/* Chevron */}
        <ChevronRight
          className="w-3 h-3 shrink-0 text-muted-foreground/35 transition-transform duration-150"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />

        {/* iterationType badge */}
        {iterType ? (
          <span
            className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border"
            style={{ background: dot + "18", color: dot + "CC", borderColor: dot + "35" }}
          >
            {iterType}
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/15" />
        )}

        {/* Test name */}
        <span className="text-[11px] font-semibold text-foreground/65 truncate flex-1 min-w-0">{label}</span>

        {/* Platform */}
        {platform && (
          <span className="shrink-0 text-[8px] text-muted-foreground/25 font-medium hidden sm:block">{platform}</span>
        )}

        {/* Winner badge */}
        {winnerVId && (
          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/22">
            ★ Winner
          </span>
        )}

        {/* Count */}
        <span className="shrink-0 text-[9px] text-muted-foreground/22 font-mono">{variants.length}v</span>
      </button>

      {/* ── Variants (expand/collapse) ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="variants"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-5 flex flex-col gap-1 mt-1 border-l border-white/6 ml-3.5">
              {variants.map(v => (
                <div key={v.id} className="relative">
                  {v.variantId === winnerVId && (
                    <span
                      className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                      title="Test winner"
                    />
                  )}
                  <ExpListItem
                    exp={v}
                    isSelected={selectedId === v.id}
                    onClick={() => onSelect(v.id)}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ exp, isDemo, onAddEntry, onDeleteEntry, cpaTarget, onSetCpaTarget, onIterate, onUpdateStatus }: {
  exp: Variant;
  isDemo: boolean;
  onAddEntry: (entry: Omit<TLEntry, "id" | "createdAt">) => void;
  onDeleteEntry: (entryId: string) => void;
  cpaTarget: number | null;
  onSetCpaTarget: (t: number) => void;
  onIterate: (exp: Variant) => void;
  onUpdateStatus: (status: Status) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const sorted = [...exp.timeline].sort((a, b) => a.date.localeCompare(b.date));
  const isChild = !!exp.parentVariantId;

  function handleSubmit(entry: Omit<TLEntry, "id" | "createdAt">) {
    onAddEntry(entry);
    setShowForm(false);
  }

  const sparklineProps = [
    { field: "tsr"  as const, label: "Thumb Stop Rate", suffix: "%", color: "#6366f1" },
    { field: "hold" as const, label: "Hold Rate",       suffix: "%", color: "#f59e0b" },
    { field: "ctr"  as const, label: "CTR",             suffix: "%", color: "#10b981" },
    { field: "cpa"  as const, label: "CPA",             prefix: "$", color: "#3b82f6", lowerIsBetter: true },
  ].filter(sp => exp.adType !== "static" || sp.field === "ctr" || sp.field === "cpa");

  const firstDay = sorted.length > 0 ? computeDay(sorted[0].date, exp.startDate) : null;
  const lastDay  = sorted.length > 0 ? computeDay(sorted[sorted.length - 1].date, exp.startDate) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Experiment header */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
        <div className="flex items-start gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-black font-mono shrink-0 ${isChild ? "text-emerald-400" : "text-violet-400"}`}>
              {exp.variantId}
            </span>
            {isChild && <GitBranch className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />}
            <div>
              <p className="text-sm font-bold text-white">{exp.adVariant}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] text-muted-foreground/40">{exp.hookType} · {exp.primaryAngle} · {exp.creativeFormat}</p>
                {exp.startDate && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/35 font-mono">
                    <Calendar className="w-2.5 h-2.5" />
                    Started {fmtDate(exp.startDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ClickableStatusBadge status={exp.status} onSave={onUpdateStatus} />
            {(exp.status === "Winner" || exp.status === "Loser" || exp.status === "Iterate") && (
              <button
                onClick={() => onIterate(exp)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-violet-500/25 bg-violet-500/[0.07] text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/40 transition-all duration-150"
                title="Open in Iteration Engine"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Iterate
              </button>
            )}
            {!isDemo && (
              <button
                onClick={() => setShowForm(s => !s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150 ${
                  showForm
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-violet-500/10 hover:border-violet-500/25 hover:text-violet-300"
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Log entry
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log form */}
      <AnimatePresence>
        {showForm && (
          <LogForm
            startDate={exp.startDate}
            adType={exp.adType}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Creative Kill Signal */}
      {sorted.length > 0 && (
        <CreativeKillSignal
          latest={sorted[sorted.length - 1]}
          cpaTarget={cpaTarget}
          onSetCpaTarget={onSetCpaTarget}
          adType={exp.adType}
          entryCount={sorted.length}
        />
      )}

      {/* Sparklines grid */}
      {sorted.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">Performance Trends</p>
          <div className={`grid gap-2 ${exp.adType === "static" ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
            {sparklineProps.map(sp => (
              <Sparkline
                key={sp.field}
                entries={sorted}
                field={sp.field}
                color={sp.color}
                label={sp.label}
                suffix={sp.suffix}
                prefix={sp.prefix}
                lowerIsBetter={sp.lowerIsBetter}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timeline table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Data History</p>
          {sorted.length > 0 && firstDay != null && lastDay != null && (
            <span className="text-[9px] text-muted-foreground/30">
              {sorted.length} {sorted.length === 1 ? "entry" : "entries"} · Day {firstDay} → Day {lastDay}
            </span>
          )}
        </div>
        <div className="group">
          <TimelineTable entries={sorted} startDate={exp.startDate} isDemo={isDemo} onDelete={onDeleteEntry} adType={exp.adType} />
        </div>
        {isDemo && (
          <p className="text-[9px] text-muted-foreground/25 text-center mt-2">
            Demo data — add your own experiments in Creative Lab to track real performance.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExperimentTimeline() {
  const { projectKey } = useProject();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialExpId = params.get("exp") ?? null;

  // Single source of truth — variants with embedded timelines
  const [rawData, setRawData] = useLocalStorage<any[]>(projectKey("lab:experiments"), []);
  const [rawTests]            = useLocalStorage<RawTest[]>(projectKey("lab:tests"), []);
  const [cpaTarget, setCpaTarget] = useLocalStorage<number | null>(projectKey("project:cpaTarget"), null);

  const variants: Variant[] = useMemo(() => rawData.map(migrateVariant), [rawData]);

  const isDemo = false;
  const displayVariants = variants;

  // One-time: merge old timeline:entries data into variants and remove the old key
  const didMerge = useRef(false);
  useEffect(() => {
    if (didMerge.current || isDemo) return;
    didMerge.current = true;
    const oldKey = projectKey("timeline:entries");
    const oldRaw = localStorage.getItem(oldKey);
    if (!oldRaw) return;
    try {
      const oldMap = JSON.parse(oldRaw) as Record<string, any[]>;
      if (!Object.keys(oldMap).length) return;
      setRawData(prev => prev.map(v => {
        const mig = migrateVariant(v);
        const oldEntries = (oldMap[v.id] ?? []) as any[];
        if (!oldEntries.length) return mig;
        const existingIds = new Set(mig.timeline.map((e: TLEntry) => e.id));
        const converted: TLEntry[] = oldEntries
          .filter((e: any) => !existingIds.has(e.id))
          .map((e: any) => migrateTLEntry(e, mig.startDate ?? ""));
        return { ...mig, timeline: [...mig.timeline, ...converted] };
      }));
      localStorage.removeItem(oldKey);
      window.dispatchEvent(new CustomEvent("clb:write"));
    } catch { /* ignore */ }
  }, [isDemo]);

  // Persist selected variant and active test across navigation
  const [selectedId, setSelectedId] = useLocalStorage<string | null>(
    "clb:ui:timeline:selectedId",
    null
  );

  // When URL carries ?exp=, always honour it — also switch to the correct ad-type
  // tab and activate the matching test group so the variant is immediately visible
  useEffect(() => {
    if (!initialExpId) return;
    setSelectedId(initialExpId);
    const targetVariant = displayVariants.find(v => v.id === initialExpId);
    if (targetVariant) {
      const variantAdType: "video" | "static" = (targetVariant as any).adType === "static" ? "static" : "video";
      setTimelineAdType(variantAdType);
      const testGroup = testGroups.find(g => g.variants.some(v => v.id === initialExpId));
      if (testGroup) {
        didExpandRef.current = true;
        setActiveTestId(testGroup.test.id);
      }
    }
  }, [initialExpId]);

  function addEntry(variantId: string, entry: Omit<TLEntry, "id" | "createdAt">) {
    if (isDemo) return;
    const newEntry: TLEntry = {
      ...entry,
      id: `tl-${entry.date ?? new Date().toISOString().slice(0, 10)}-${Date.now()}`,
      createdAt: Date.now(),
    };
    setRawData(prev => prev.map(v =>
      v.id === variantId
        ? { ...migrateVariant(v), timeline: [...migrateVariant(v).timeline, newEntry] }
        : v
    ));
    window.dispatchEvent(new CustomEvent("clb:write"));
  }

  function deleteEntry(variantId: string, entryId: string) {
    if (isDemo) return;
    setRawData(prev => prev.map(v =>
      v.id === variantId
        ? { ...migrateVariant(v), timeline: migrateVariant(v).timeline.filter((e: TLEntry) => e.id !== entryId) }
        : v
    ));
  }

  function updateVariantStatus(variantId: string, status: Status) {
    if (isDemo) return;
    setRawData(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      const patch: Partial<Variant> = { status };
      if (status === "Killed") patch.killedAt = new Date().toISOString();
      return { ...migrateVariant(v), ...patch };
    }));
    window.dispatchEvent(new CustomEvent("clb:write"));
  }

  function iterateFromTimeline(exp: Variant) {
    const latestEntry = exp.timeline.length > 0
      ? [...exp.timeline].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

    const decisionState = latestEntry
      ? classifyTestState([{ id: exp.id, metrics: { ctr: latestEntry.ctr, holdRate: latestEntry.hold } }])
      : "NO_SIGNAL";

    localStorage.setItem(projectKey("iteration:pending"), JSON.stringify({
      hookType:       exp.hookType,
      primaryAngle:   exp.primaryAngle,
      creativeFormat: exp.creativeFormat,
      ctaStyle:       exp.cta,
      roas:           "",
      adVariant:      exp.adVariant,
      variantId:      exp.variantId,
      experimentId:   exp.id,
      adType:         (exp as any).adType ?? "video",
      decisionState,
      iterationType:  "HOOK",
    }));
    // Write directly — setRawData → useLayoutEffect may not fire before navigate unmounts
    try {
      const key = projectKey("lab:experiments");
      const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify(
        raw.map((e: any) => e.id === exp.id ? { ...e, isIterated: true, status: "Iterated" } : e)
      ));
      window.dispatchEvent(new CustomEvent("clb:write"));
    } catch { /* noop */ }
    navigate("/creative-iteration");
  }

  const sortedVariants = useMemo(() => {
    return [...displayVariants].sort((a, b) => {
      if (a.variantId < b.variantId) return -1;
      if (a.variantId > b.variantId) return 1;
      return 0;
    });
  }, [displayVariants]);

  // ── Group variants under their tests, sorted newest-first ─────────────────
  const testGroups = useMemo((): TestGroup[] => {
    // Step 1: build groups from real lab:tests records
    const tableGroups: TestGroup[] = [...rawTests]
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .map(test => {
        const vids = new Set(test.variantIds ?? []);
        const matched = displayVariants.filter(v =>
          vids.has(v.variantId ?? "") || vids.has(v.id) || v.testId === test.id
        );
        return { test, variants: matched };
      })
      .filter(g => g.variants.length > 0);

    // Step 2: track which variant ids are already covered by rawTests entries
    const coveredVariantIds = new Set<string>();
    rawTests.forEach(t => (t.variantIds ?? []).forEach(id => coveredVariantIds.add(id)));
    const coveredTestIds = new Set(rawTests.map(t => t.id));

    // Step 3: fallback — group remaining variants by their testId field
    const fallbackMap = new Map<string, Variant[]>();
    displayVariants.forEach(exp => {
      if (coveredVariantIds.has(exp.variantId ?? "") || coveredVariantIds.has(exp.id)) return;
      const key = (exp as any).testId || exp.id;
      if (coveredTestIds.has(key)) return;
      if (!fallbackMap.has(key)) fallbackMap.set(key, []);
      fallbackMap.get(key)!.push(exp);
    });

    const fallbackGroups: TestGroup[] = Array.from(fallbackMap.entries()).map(([testId, vgroup]) => {
      const earliestDate = vgroup.reduce<string | null>((best, v) => {
        if (!v.startDate) return best;
        return !best || v.startDate < best ? v.startDate : best;
      }, null);
      const syntheticTest: RawTest = {
        id:            testId,
        name:          (vgroup[0] as any).testName ?? (vgroup[0] as any).objective ?? testId,
        platform:      vgroup.find(v => v.platform)?.platform,
        createdAt:     earliestDate ? Date.parse(earliestDate) : undefined,
        iterationType: (vgroup[0] as any).iterationType ?? undefined,
      };
      return {
        test:     syntheticTest,
        variants: [...vgroup].sort((a, b) => b.startDate.localeCompare(a.startDate)),
      };
    });
    // Step 4: merge and sort — base tests (no iterationType) first ascending,
    //         then iteration batches ascending, both by createdAt oldest-first
    const all = [...tableGroups, ...fallbackGroups];
    all.sort((a, b) => {
      const aIsBase = !a.test.iterationType;
      const bIsBase = !b.test.iterationType;
      if (aIsBase !== bIsBase) return aIsBase ? -1 : 1;
      return (a.test.createdAt ?? 0) - (b.test.createdAt ?? 0);
    });
    return all;
  }, [rawTests, displayVariants]);

  // ── Active test selection — persisted across navigation ──────────────────
  const [activeTestId, setActiveTestId] = useLocalStorage<string | null>(
    "clb:ui:timeline:activeTestId",
    null
  );
  const [showAllTests, setShowAllTests]   = useState<boolean>(true);
  const [activeOnlyTests, setActiveOnlyTests] = useState<boolean>(false);
  const [timelineAdType, setTimelineAdType]   = useLocalStorage<"video" | "static">("clb:ui:timeline:adTypeFilter", "video");

  // ── Filtered view of testGroups (source data untouched) ───────────────────
  const groupedTests = useMemo(() => {
    let result = testGroups;
    if (activeOnlyTests) {
      result = result.filter(g =>
        g.variants.some(v => ["Testing", "Producing", "Ready to Test"].includes(v.status))
      );
    }
    result = result.filter(g =>
      timelineAdType === "static"
        ? g.variants.some(v => (v as any).adType === "static")
        : g.variants.some(v => !(v as any).adType || (v as any).adType === "video")
    );
    return result;
  }, [testGroups, activeOnlyTests, timelineAdType]);

  // Auto-select first test on very first load (no stored activeTestId)
  useEffect(() => {
    if (testGroups.length > 0 && !activeTestId) {
      // If selectedId is already set, find its group; otherwise pick the first group
      const ownerGroup = selectedId
        ? testGroups.find(g => g.variants.some(v => v.id === selectedId))
        : null;
      setActiveTestId((ownerGroup ?? testGroups[0]).test.id);
    }
  }, [testGroups]);

  // Expand the test group that contains the URL-param variant — fires once only
  const didExpandRef = useRef(false);
  useEffect(() => {
    if (!initialExpId || didExpandRef.current) return;
    const testGroup = testGroups.find(g => g.variants.some(v => v.id === initialExpId));
    if (testGroup) {
      didExpandRef.current = true;
      setActiveTestId(testGroup.test.id);
    }
  }, [initialExpId, testGroups]);

  const activeGroup = useMemo(
    () => testGroups.find(g => g.test.id === activeTestId) ?? testGroups[0] ?? null,
    [testGroups, activeTestId]
  );

  // Variants shown in the sidebar — active test's variants, or full flat list
  const sidebarVariants = activeGroup?.variants ?? sortedVariants;

  // Derive the selected variant: use selectedId if it's in the current group,
  // otherwise fall back to the first variant. This replaces the old auto-select
  // useEffect and prevents selection from resetting when entries are saved.
  const selectedVariant = sidebarVariants.find(v => v.id === selectedId) ?? sidebarVariants[0] ?? null;

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 pb-20">

        {/* Header */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
            Performance Tracking
          </span>
          <h1 className="text-3xl font-bold text-white mt-3">Experiment Timeline</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-xl">
            Log performance data points for each experiment variant over time. Track trends and see how metrics evolve across your test window.
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex gap-6 flex-wrap">
          {[
            { label: "Tests",         value: testGroups.length || displayVariants.length, color: "#6366f1" },
            { label: "Total Entries", value: displayVariants.reduce((s, v) => s + v.timeline.length, 0), color: "#f59e0b" },
            { label: "Tracked",       value: displayVariants.filter(v => v.timeline.length > 0).length, color: "#10b981" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">{label}</span>
            </div>
          ))}
          {isDemo && (
            <span className="self-center text-[10px] font-bold uppercase tracking-widest text-amber-400/60 bg-amber-500/8 border border-amber-500/15 px-2.5 py-1 rounded-md">
              Demo mode — add experiments in Creative Lab
            </span>
          )}
        </div>

        {/* ── Test selector ── */}
        {testGroups.length > 0 && (() => {
          const COLLAPSE_THRESHOLD = 8;
          const hasMany = groupedTests.length > COLLAPSE_THRESHOLD;
          const visibleGroups = (hasMany && !showAllTests)
            ? groupedTests.slice(0, COLLAPSE_THRESHOLD)
            : groupedTests;
          const filtersActive = activeOnlyTests;
          return (
            <div className="flex flex-col gap-3">
              {/* Label row */}
              <div className="flex items-center gap-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/25">
                  Tests ({filtersActive ? `${groupedTests.length} / ${testGroups.length}` : testGroups.length})
                </p>
                {hasMany && (
                  <button
                    onClick={() => setShowAllTests(v => !v)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${showAllTests ? "rotate-180" : ""}`}
                    />
                    {showAllTests ? "Show less" : `Show all ${groupedTests.length}`}
                  </button>
                )}
              </div>

              {/* Video / Static toggle */}
              <div className="flex items-center gap-2">
                {(["video", "static"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      if (timelineAdType === type) return;
                      setTimelineAdType(type);
                      setSelectedId(null);
                      setActiveTestId(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      timelineAdType === type
                        ? "bg-primary/15 border-primary/25 text-primary"
                        : "bg-white/[0.03] border-white/8 text-muted-foreground/50 hover:text-muted-foreground/80"
                    }`}
                  >
                    {type === "video" ? "🎬 Video Ads" : "🖼 Static Ads"}
                  </button>
                ))}
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {visibleGroups.map(group => {
                  const { test }  = group;
                  const isActive  = test.id === (activeTestId ?? testGroups[0]?.test.id);
                  const iterType  = test.iterationType ?? null;
                  const dot       = iterType ? (ITER_DOT[iterType] ?? "#94a3b8") : "#94a3b8";
                  const winnerVId = test.learning?.winnerVariantId ?? null;
                  const fullLabel  = test.name || test.objective || test.id;
                  const words      = fullLabel.split(" ");
                  const chipLabel  = words.length > 4 ? words.slice(0, 4).join(" ") + "…" : fullLabel;
                  return (
                    <button
                      key={test.id}
                      onClick={() => setActiveTestId(test.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-left transition-all duration-200 ${
                        isActive
                          ? "border-white/30 bg-white/[0.10]"
                          : "border-white/6 bg-white/[0.015] hover:bg-white/[0.045] hover:border-white/14"
                      }`}
                      style={isActive ? { boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)" } : undefined}
                    >
                      {iterType ? (
                        <span
                          className="inline-flex shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border"
                          style={{ background: dot + "22", color: dot + "DD", borderColor: dot + "45" }}
                        >
                          {iterType}
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-white/25 shrink-0" />
                      )}
                      <span className={`text-[11px] font-semibold max-w-[180px] truncate transition-colors ${
                        isActive ? "text-foreground/90" : "text-foreground/38"
                      }`}>
                        {chipLabel}
                      </span>
                      {winnerVId && (
                        <span className="text-emerald-400 text-[9px] font-black shrink-0">★</span>
                      )}
                    </button>
                  );
                })}
                {hasMany && !showAllTests && (
                  <button
                    onClick={() => setShowAllTests(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/6 bg-white/[0.015] hover:bg-white/[0.045] hover:border-white/14 text-[11px] font-semibold text-muted-foreground/40 hover:text-muted-foreground/70 transition-all duration-200"
                  >
                    +{groupedTests.length - COLLAPSE_THRESHOLD} more
                  </button>
                )}
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 mr-1">
                  Filter
                </span>
                {([
                  { label: "Active Tests Only", active: activeOnlyTests, toggle: () => setActiveOnlyTests(v => !v) },
                ] as const).map(({ label, active, toggle }) => (
                  <button
                    key={label}
                    onClick={toggle}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all duration-150 ${
                      active
                        ? "border-white/25 bg-white/[0.12] text-white/90"
                        : "border-white/8 bg-white/[0.02] text-white/30 hover:border-white/16 hover:text-white/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Active test context container ── */}
        {activeGroup && (() => {
          const { test, variants } = activeGroup;
          const iterType  = test.iterationType ?? null;
          const dot       = iterType ? (ITER_DOT[iterType] ?? "#94a3b8") : "#94a3b8";
          const winnerVId = test.learning?.winnerVariantId ?? null;
          const winnerV   = winnerVId ? variants.find(v => v.variantId === winnerVId || v.id === winnerVId) : null;
          const shortId   = test.id?.split("-").slice(-2).join("-") ?? test.id;
          const dateStr   = test.createdAt ? new Date(test.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
          return (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
              style={{ borderLeft: iterType ? `3px solid ${dot}55` : undefined }}
            >
              {/* Line 1 — iteration type */}
              {iterType && (
                <span
                  className="inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border mb-2"
                  style={{ background: dot + "22", color: dot + "EE", borderColor: dot + "45" }}
                >
                  {iterType} TEST
                </span>
              )}

              {/* Line 2 — test name (prominent) */}
              <p className="text-sm font-bold text-foreground/88 leading-snug mb-1.5">
                {test.name || test.objective || shortId}
              </p>

              {/* Line 3 — variant count + winner */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[11px] text-muted-foreground/55">
                  {variants.length} variant{variants.length !== 1 ? "s" : ""}
                </span>
                {(winnerV || winnerVId) && (
                  <>
                    <span className="text-muted-foreground/25">·</span>
                    <span className="text-[11px] text-emerald-400/80 flex items-center gap-1">
                      <span>★</span>
                      <span className="truncate max-w-[150px]">
                        {winnerV?.adVariant ?? winnerV?.variantId ?? "1 winner"}
                      </span>
                    </span>
                  </>
                )}
              </div>

              {/* Line 4 — muted meta: id · date · platform */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {shortId && (
                  <span className="font-mono text-[9px] text-muted-foreground/28 bg-white/[0.04] border border-white/6 px-1.5 py-0.5 rounded">
                    {shortId}
                  </span>
                )}
                {dateStr && (
                  <>
                    <span className="text-muted-foreground/18 text-[9px]">·</span>
                    <span className="text-[9px] text-muted-foreground/28">{dateStr}</span>
                  </>
                )}
                {test.platform && (
                  <>
                    <span className="text-muted-foreground/18 text-[9px]">·</span>
                    <span className="text-[9px] text-muted-foreground/28">{test.platform}</span>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Work area: variants + detail in a shared container ── */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[272px_1fr] gap-6 items-start">

            {/* Left — variants only */}
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-1">
                Variants
                <span className="text-muted-foreground/20 ml-1.5 font-normal normal-case tracking-normal">
                  ({sidebarVariants.length})
                </span>
              </p>
              {sidebarVariants.length === 0 ? (
                <p className="text-[9px] text-muted-foreground/25 italic px-1 py-2">No variants in this test</p>
              ) : sidebarVariants.map(v => (
                <ExpListItem
                  key={v.id}
                  exp={v}
                  isSelected={selectedId === v.id}
                  onClick={() => setSelectedId(v.id)}
                />
              ))}
            </div>

            {/* Right — detail panel */}
            <div>
              <AnimatePresence mode="wait">
                {selectedVariant ? (
                  <motion.div
                    key={selectedVariant.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DetailPanel
                      exp={selectedVariant}
                      isDemo={isDemo}
                      onAddEntry={entry => addEntry(selectedVariant.id, entry)}
                      onDeleteEntry={entryId => deleteEntry(selectedVariant.id, entryId)}
                      cpaTarget={cpaTarget}
                      onSetCpaTarget={t => setCpaTarget(t)}
                      onIterate={iterateFromTimeline}
                      onUpdateStatus={status => updateVariantStatus(selectedVariant.id, status)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-white/8 bg-white/[0.02] py-24 flex flex-col items-center gap-3"
                  >
                    <History className="w-8 h-8 text-muted-foreground/15" />
                    <p className="text-sm text-muted-foreground/30">Select an experiment to view its timeline</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
