import { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { HOOK_TYPES } from "@/data/hooks";
import { AppDropdown } from "@/components/app-dropdown";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Plus, Trash2, Trophy, TrendingUp, TrendingDown, Lightbulb,
  BarChart3, Target, Zap, FileText, FlaskConical,
  CheckCircle2, XCircle, Clock, Sparkles, ChevronRight, X, Pencil, Check, GitBranch, History, Calendar, Loader2,
  Layers, Rocket, RotateCcw, ArrowRight,
  Filter, ChevronDown, ChevronUp, Link2, User, Monitor, CalendarDays, Code2, AlignLeft, MousePointerClick,
  ExternalLink, Eye, ImagePlus, Image as ImageIcon, AlertTriangle, Info,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Variant, TLEntry, IterationType, AdGroup, Test, migrateVariant, todayISO, fmtDate, getNextIterationSuffix, resolveRootId, createTest, assignVariantsToTest } from "./experiment-timeline";
import { classifyTestState, getNextAction, DecisionVariant, DecisionState } from "@/lib/decision-engine";
import { computeDecisionConfidence } from "@/lib/confidence-engine";
import { applyDecisionGuard } from "@/lib/decision-guard";
import { computePatternMemory, type PatternMemoryResult } from "@/lib/pattern-memory";
import { ConfidenceBadge } from "@/components/confidence-badge";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Status = "Draft" | "Producing" | "Ready to Test" | "Testing" | "Winner" | "Loser" | "Iterate" | "Iterated" | "Killed";

// ── LINEAGE HELPERS ───────────────────────────────────────────────────────────
const ITER_TYPE_COLOR: Record<string, string> = {
  HOOK:   "#8b5cf6",
  FORMAT: "#10b981",
  CTA:    "#f59e0b",
  VISUAL: "#3b82f6",
};

// Maps each test type to the recommended next test type in the iteration loop
const NEXT_ITER_TYPE: Record<string, IterationType> = {
  HOOK:   "FORMAT",
  FORMAT: "HOOK",
  CTA:    "HOOK",
  VISUAL: "CTA",
};

function buildLineageChain(exp: Variant, all: Variant[]): Variant[] {
  const chain: Variant[] = [exp];
  let current: Variant = exp;
  let safety = 0;
  while (safety < 20) {
    const parent = current.parentId
      ? all.find(v => v.id === current.parentId)
      : current.parentVariantId
        ? all.find(v => v.variantId === current.parentVariantId)
        : undefined;
    if (!parent || parent.id === current.id) break;
    chain.unshift(parent);
    current = parent;
    safety++;
  }
  return chain;
}

function latestMetrics(v: Variant): TLEntry | null {
  if (!v.timeline.length) return null;
  return [...v.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
}

// ── Learning auto-suggestion generator ────────────────────────────────────────
function generateLearning(
  variants: Variant[],
  iterationType?: string | null,
): { winnerVariantId: string; insight: string; nextAction: string } | null {
  if (!variants.length) return null;

  // Pair variants with their latest metrics
  const enriched = variants.map(v => ({ v, m: latestMetrics(v) }));

  // Pick winner: lowest CPA with data, else highest CTR with data, else first
  const hasCPA  = enriched.filter(x => x.m && (x.m.cpa ?? 0) > 0);
  const hasCTR  = enriched.filter(x => x.m && (x.m.ctr ?? 0) > 0);
  const winner  = (
    hasCPA.sort((a, b) => (a.m!.cpa ?? 999) - (b.m!.cpa ?? 999))[0]
    ?? hasCTR.sort((a, b) => (b.m!.ctr ?? 0) - (a.m!.ctr ?? 0))[0]
    ?? enriched[0]
  )?.v;

  if (!winner) return null;

  // Determine the axis that differs across variants
  type Axis = "hook" | "format" | "cta" | "angle" | null;
  let axis: Axis = null;
  if      (iterationType === "HOOK")   axis = "hook";
  else if (iterationType === "FORMAT") axis = "format";
  else if (iterationType === "CTA")    axis = "cta";
  else if (iterationType === "VISUAL") axis = "format";
  else {
    const uniq = (arr: string[]) => new Set(arr.filter(Boolean)).size;
    const hooks   = uniq(variants.map(v => v.hookType));
    const formats = uniq(variants.map(v => v.creativeFormat));
    const ctas    = uniq(variants.map(v => v.cta));
    const angles  = uniq(variants.map(v => v.primaryAngle));
    if      (hooks   > 1) axis = "hook";
    else if (formats > 1) axis = "format";
    else if (ctas    > 1) axis = "cta";
    else if (angles  > 1) axis = "angle";
  }

  // ── Compute metrics for winner and others ───────────────────────────────────
  const winnerM   = latestMetrics(winner);
  const winnerCTR = winnerM?.ctr ?? 0;
  const winnerCPA = winnerM?.cpa ?? 0;

  const others    = enriched.filter(x => x.v.id !== winner.id);
  const avgCTR    = others.length
    ? others.reduce((s, x) => s + (x.m?.ctr ?? 0), 0) / others.length
    : 0;
  const avgCPA    = others.length
    ? others.reduce((s, x) => s + (x.m?.cpa ?? 0), 0) / others.length
    : 0;

  const ctrDiff   = winnerCTR - avgCTR;
  const cpaDiff   = avgCPA - winnerCPA;
  const cpaPct    = avgCPA > 0 ? Math.round((cpaDiff / avgCPA) * 100) : 0;

  const hasCTRData = winnerCTR > 0 && avgCTR > 0;
  const hasCPAData = winnerCPA > 0 && avgCPA > 0;

  // ── Build insight + next action strings ──────────────────────────────────────
  let insight    = "";
  let nextAction = "";
  const hook   = winner.hookType       || "this hook";
  const fmt    = winner.creativeFormat || "this format";
  const cta    = winner.cta            || "this CTA";
  const angle  = winner.primaryAngle   || "this angle";
  const label  = winner.adVariant      || winner.variantId || "This variant";

  // Axis label used in data-backed sentences
  const axisLabel =
    axis === "hook"   ? hook  :
    axis === "format" ? fmt   :
    axis === "cta"    ? cta   :
    axis === "angle"  ? angle :
    label;

  // Axis-specific explanatory tail sentence
  const axisTail =
    axis === "hook"   ? "Direct, specific framing creates urgency other hook types can't replicate." :
    axis === "format" ? "Showing the product in context removes doubt faster than any testimonial-style creative." :
    axis === "cta"    ? "High-intent CTAs pre-qualify leads before the click, improving downstream sales velocity." :
    axis === "angle"  ? "This angle resonated most strongly with the solution-aware audience." :
    "This variant consistently outperformed on both engagement and conversion metrics.";

  // Data-backed insight — lead with the strongest metric delta, include both when available
  if (hasCPAData && hasCTRData && cpaDiff > 0 && ctrDiff > 0) {
    insight = `${axisLabel} reduced CPA by ${cpaPct}% vs others ($${winnerCPA.toFixed(0)} vs $${avgCPA.toFixed(0)}) and increased CTR by +${ctrDiff.toFixed(1)}% (${winnerCTR.toFixed(1)}% vs ${avgCTR.toFixed(1)}%). ${axisTail}`;
  } else if (hasCPAData && cpaDiff > 0) {
    insight = `${axisLabel} reduced CPA by ${cpaPct}% vs others ($${winnerCPA.toFixed(0)} vs $${avgCPA.toFixed(0)} avg). ${axisTail}`;
  } else if (hasCTRData && ctrDiff > 0) {
    insight = `${axisLabel} increased CTR by +${ctrDiff.toFixed(1)}% vs others (${winnerCTR.toFixed(1)}% vs ${avgCTR.toFixed(1)}% avg). ${axisTail}`;
  } else if (axis === "hook") {
    insight = `${hook} outperformed the other hook variants. ${axisTail}`;
  } else if (axis === "format") {
    insight = `${fmt} delivered the strongest results in this test. ${axisTail}`;
  } else if (axis === "cta") {
    insight = `${cta} drove better conversion than the alternatives tested. ${axisTail}`;
  } else if (axis === "angle") {
    insight = `The ${angle} angle resonated best with this audience. ${axisTail}`;
  } else {
    insight = `${label} had the strongest overall performance. ${axisTail}`;
  }

  // Specific, actionable next steps per axis
  if (axis === "hook") {
    nextAction = `Test ${hook} with different formats: UGC, Talking Head, Screen Recording`;
  } else if (axis === "format") {
    nextAction = `Apply ${fmt} format to the top-performing hook (${hook})`;
  } else if (axis === "cta") {
    nextAction = `Test urgency-based CTAs against ${cta} — e.g. "Get Access Today" vs "Book a Demo"`;
  } else if (axis === "angle") {
    nextAction = `Test ${angle} angle across different formats and hook types`;
  } else {
    nextAction = `Scale ${label} and test adjacent hook types and creative formats`;
  }

  return {
    winnerVariantId: winner.variantId ?? winner.id,
    insight,
    nextAction,
  };
}

function normalizePlatform(p: string | undefined | null): string {
  if (!p) return "";
  if (p === "Facebook" || p === "Instagram") return "Meta";
  return p;
}

function aggregateTestStatus(variants: Variant[]): Status {
  const statuses = variants.map(v => v.status);
  if (statuses.some(s => s === "Winner")) return "Winner";
  if (statuses.some(s => s === "Testing")) return "Testing";
  if (statuses.every(s => s === "Loser")) return "Loser";
  if (statuses.every(s => s === "Draft")) return "Draft";
  return (statuses[0] as Status) ?? "Draft";
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────
const ANGLES        = ["Pain Point","Transformation","Social Proof","Curiosity","Authority","Comparison","Urgency"];
const FORMATS       = ["UGC","Talking Head","Motion Graphic","Split Screen","Text-Only","Product Demo","Testimonial"];
const CTA_TYPES     = ["Free Trial","Demo","Learn More","Download","Shop Now","Get Started","Book Call","Watch Video"];
const BODY_TYPES    = ["Mechanism Reveal","Transformation Story","Problem → Solution","Social Proof","Founder Story","Product Demonstration"];
const STATUS_OPTS: Status[] = ["Draft","Producing","Ready to Test","Testing","Winner","Loser","Iterated","Killed"];

// Allowed transitions from each status (enforces the production pipeline)
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

// ── UID ────────────────────────────────────────────────────────────────────────
let _id = 1;
const uid = () => String(_id++);

// ── STRUCTURED ID SYSTEM ──────────────────────────────────────────────────────
// {PROJECT}-T01                    → test
// {PROJECT}-T01-V01                → variant within test
// {PROJECT}-T01-V01-I01            → iteration of a variant

/** Next test ID: {PROJECT}-T01, T02 … */
function nextTestId(allExps: Experiment[], projectCode: string, adType: "video" | "static" = "video"): string {
  const prefix = adType === "static" ? "SA" : "T";
  const testIds = [...new Set(allExps.map(e => e.testId).filter(Boolean) as string[])];
  const nums = testIds
    .filter(tid => tid.includes(`-${prefix}`))
    .map(tid => { const m = tid.match(new RegExp(`${prefix}(\\d+)$`)); return m ? parseInt(m[1]) : 0; });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${projectCode}-${prefix}${String(next).padStart(2, "0")}`;
}

/** Next variant ID within a test: {testId}-V01, V02 … (per-test sequential) */
function nextVariantIdInTest(snapshot: Experiment[], testId: string): string {
  // Count only direct (non-iteration) variants that belong to this specific test
  const existing = snapshot.filter(e => e.testId === testId && !e.parentVariantId);
  const nums = existing.map(e => { const m = e.variantId?.match(/V(\d+)$/); return m ? parseInt(m[1]) : 0; });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${testId}-V${String(next).padStart(2, "0")}`;
}

/** Next iteration ID for a parent variant: {variantId}-I01, I02 … */
function nextIterationId(allExps: Experiment[], parentVId: string): string {
  const existing = allExps.filter(e => e.parentVariantId === parentVId);
  const nums = existing.map(e => { const m = e.variantId?.match(/I(\d+)$/); return m ? parseInt(m[1]) : 0; });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${parentVId}-I${String(next).padStart(2, "0")}`;
}

// ── LEGACY VARIANT ID HELPERS (kept for backward compat display) ───────────────
function nextTopLevelVId(experiments: Experiment[], projectCode: string): string {
  const nums = experiments
    .filter(e => e.variantId && !e.parentVariantId)
    .map(e => {
      const m = e.variantId.match(/V(\d+)(?:\.\d+)?$/);
      return m ? parseInt(m[1]) : 0;
    });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${projectCode}-V${String(next).padStart(2, "0")}`;
}
function nextChildVId(experiments: Experiment[], parentVId: string): string {
  const nums = experiments
    .map(e => e.variantId)
    .filter(id => id && id.startsWith(`${parentVId}.`))
    .map(id => parseInt(id.split(".")[1]));
  return `${parentVId}.${nums.length ? Math.max(...nums) + 1 : 1}`;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function pct(n: number) { return n.toFixed(1) + "%"; }
function dollar(n: number) { return "$" + n.toFixed(0); }
function delta(a: number, b: number) {
  if (!b) return 0;
  return Math.round(((a - b) / b) * 100);
}

interface GroupMetric { key: string; avgCTR: number; avgTSR: number; avgHold: number; avgCPA: number; count: number; }
function groupBy(exps: Variant[], field: keyof Pick<Variant, "hookType"|"primaryAngle"|"creativeFormat"|"cta">): GroupMetric[] {
  const map: Record<string, Variant[]> = {};
  for (const e of exps) {
    const k = String(e[field]);
    if (!map[k]) map[k] = [];
    map[k].push(e);
  }
  return Object.entries(map).map(([key, arr]) => {
    const metrics = arr.map(latestMetrics).filter(Boolean) as TLEntry[];
    return {
      key,
      avgCTR:  avg(metrics.map(m => m.ctr)),
      avgTSR:  avg(metrics.map(m => m.tsr)),
      avgHold: avg(metrics.map(m => m.hold)),
      avgCPA:  avg(metrics.map(m => m.cpa)),
      count:   arr.length,
    };
  }).sort((a, b) => b.avgCTR - a.avgCTR);
}

// ── ANIMATION ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = { hidden:{ opacity:0, y:16 }, show:{ opacity:1, y:0, transition:{ duration:0.38 } } };
const stagger: Variants = { show:{ transition:{ staggerChildren:0.07 } } };
const cardAnim: Variants = { hidden:{ opacity:0, y:10 }, show:{ opacity:1, y:0, transition:{ duration:0.28 } } };

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
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

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Draft"];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
    >
      <cfg.Icon className="w-3 h-3" />{status}
    </span>
  );
}

// ── PERFORMANCE BAR ───────────────────────────────────────────────────────────
function PerfBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pctVal = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${pctVal}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70 shrink-0 w-10 text-right">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

// ── GROUP ANALYSIS CARD ────────────────────────────────────────────────────────
function AnalysisGroup({ title, groups, color, icon: Icon }: {
  title: string;
  groups: GroupMetric[];
  color: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  const maxCTR = Math.max(...groups.map(g => g.avgCTR), 0.01);
  const top    = groups[0];
  if (!groups.length) {
    return (
      <Card className="border-white/10 bg-card/50">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs text-muted-foreground/50 text-center py-6">No data yet</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-white/10 bg-card/50 overflow-hidden">
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,${color}60,transparent)` }} />
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
              <Icon className="w-3 h-3" style={{ color }} />
            </div>
            <p className="text-sm font-bold text-foreground">{title}</p>
          </div>
          {top && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border"
              style={{ background: `${color}12`, color, borderColor: `${color}25` }}
            >
              <Trophy className="w-2.5 h-2.5" />{top.key}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          {groups.map((g, i) => (
            <div key={g.key} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/75 truncate max-w-[120px]" title={g.key}>{g.key}</span>
                {i === 0 && <Trophy className="w-3 h-3 shrink-0" style={{ color }} />}
              </div>
              <PerfBar value={g.avgCTR} max={maxCTR} color={color} />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/40 border-t border-white/5 pt-2">Ranked by avg. CTR</p>
      </CardContent>
    </Card>
  );
}

// ── FILTER CHIP ────────────────────────────────────────────────────────────────
type SortKey = "variantId" | "startDate" | "ctr" | "cpa" | "tsr" | "hold";

function FilterChip({ label, value, options, onChange, color = "#8b5cf6" }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; color?: string;
}) {
  const active = !!value;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
            active
              ? "text-foreground"
              : "border-white/10 bg-white/[0.03] text-muted-foreground/55 hover:bg-white/[0.06] hover:text-foreground/60"
          }`}
          style={active ? { borderColor:`${color}50`, background:`${color}15`, color } : {}}
        >
          {active ? null : <Filter className="w-2.5 h-2.5 opacity-60" />}
          {active ? value : label}
          {active
            ? <X className="w-2.5 h-2.5 ml-0.5" onClick={e => { e.stopPropagation(); onChange(""); }} />
            : <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          }
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1.5 bg-[#0f1117] border-white/10 shadow-2xl w-auto min-w-[160px]" align="start" sideOffset={5} onOpenAutoFocus={e => e.preventDefault()}>
        <div className="flex flex-col gap-0.5">
          {value && (
            <button onClick={() => onChange("")} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-white/[0.04] text-left text-muted-foreground/50 text-[11px]">
              <X className="w-3 h-3" /> Clear filter
            </button>
          )}
          {options.map(o => (
            <button key={o} onClick={() => onChange(o)}
              className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left text-[11px] ${
                o === value ? "bg-white/[0.07] text-foreground" : "hover:bg-white/[0.04] text-foreground/70"
              }`}
            >
              {o}
              {o === value && <Check className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── VARIANT DETAIL SIDEBAR ─────────────────────────────────────────────────────
const PLATFORM_OPTS     = ["Meta","TikTok","YouTube","Pinterest","LinkedIn","Snapchat","Google"];
const TEST_PLATFORM_OPTS = ["Meta","TikTok","YouTube","LinkedIn"];
const sidebarInputCls = "w-full bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2 text-xs text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/25 focus:ring-1 focus:ring-primary/10 transition-colors";

function VariantDetailSidebar({ exp, allExperiments, onClose, onUpdate, onOpenTimeline, onSelectVariant, isDemo }: {
  exp: Variant;
  allExperiments: Variant[];
  onClose: () => void;
  onUpdate: (fields: Partial<Variant>) => void;
  onOpenTimeline: () => void;
  onSelectVariant: (id: string) => void;
  isDemo: boolean;
}) {
  const [localHookText,        setLocalHookText]        = useState(exp.hookText         ?? "");
  const [localBodyText,        setLocalBodyText]        = useState(exp.bodyText         ?? "");
  const [localCtaText,         setLocalCtaText]         = useState(exp.ctaText          ?? "");
  const [localAssetLink,       setLocalAssetLink]       = useState(exp.adAssetLink      ?? "");
  const [localPlatform,        setLocalPlatform]        = useState(exp.platform         ?? "");
  const [localCreator,         setLocalCreator]         = useState((exp as any).creator    ?? "");
  const [localCreatedOn,       setLocalCreatedOn]       = useState((exp as any).createdOn  ?? "");
  const [localEditor,          setLocalEditor]          = useState(exp.editor              ?? "");
  const [localAddedOn,         setLocalAddedOn]         = useState((exp as any).addedOn    ?? "");
  const [localMediaBuyer,      setLocalMediaBuyer]      = useState((exp as any).mediabuyer ?? "");
  const [localCampaignStart,   setLocalCampaignStart]   = useState(exp.startDate           ?? "");
  const [localProductionNotes, setLocalProductionNotes] = useState(exp.productionNotes  ?? "");
  const adImageRef = useRef<HTMLInputElement>(null);

  function handleAdImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdate({ adImage: ev.target?.result as string } as any);
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    setLocalHookText(exp.hookText          ?? "");
    setLocalBodyText(exp.bodyText          ?? "");
    setLocalCtaText(exp.ctaText            ?? "");
    setLocalAssetLink(exp.adAssetLink      ?? "");
    setLocalPlatform(exp.platform          ?? "");
    setLocalCreator((exp as any).creator      ?? "");
    setLocalCreatedOn((exp as any).createdOn ?? "");
    setLocalEditor(exp.editor                ?? "");
    setLocalAddedOn((exp as any).addedOn     ?? "");
    setLocalMediaBuyer((exp as any).mediabuyer ?? "");
    setLocalCampaignStart(exp.startDate      ?? "");
    setLocalProductionNotes(exp.productionNotes ?? "");
  }, [exp.id]);

  function save(fields: Partial<Variant>) { if (!isDemo) onUpdate(fields); }

  const statusCfg = STATUS_CFG[exp.status as Status] ?? STATUS_CFG["Draft"];
  const m = exp.timeline.length
    ? [...exp.timeline].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  // ── Lineage data ─────────────────────────────────────────────────────────
  const lineageChain = buildLineageChain(exp, allExperiments);
  const children     = allExperiments.filter(v =>
    (v.parentId && v.parentId === exp.id) ||
    (!v.parentId && v.parentVariantId && v.parentVariantId === exp.variantId),
  );
  const hasLineage   = lineageChain.length > 1 || children.length > 0 || !!exp.iterationType;

  return (
    <>
      <motion.div key="vd-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div key="vd-panel"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full md:w-[500px] z-50 flex flex-col bg-[#0c0c11] border-l border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
              <FlaskConical className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">Variant Detail</p>
                {exp.adType === "static"
                  ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/12 text-amber-400 border-amber-500/25">🖼 Static</span>
                  : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-500/12 text-blue-400 border-blue-500/25">🎬 Video</span>
                }
              </div>
              <p className="text-sm font-bold text-foreground truncate leading-none">{exp.adVariant || exp.variantId || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button size="sm" variant="ghost" onClick={onOpenTimeline}
              className="gap-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 border border-white/8 h-7 px-2.5"
            >
              <History className="w-3 h-3" />Timeline
            </Button>
            <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/8 transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

          {/* Identity */}
          <section>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Variant ID</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                  exp.parentVariantId ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.05] text-foreground/70 border-white/10"
                }`}>
                  {exp.parentVariantId && <GitBranch className="w-2.5 h-2.5" />}{exp.variantId || "—"}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Status</p>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                  style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}
                >
                  <statusCfg.Icon className="w-3 h-3" />{exp.status}
                </span>
              </div>
              {exp.isIterated && (
                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md">
                    <RotateCcw className="w-3 h-3" />This variant has been iterated
                  </span>
                </div>
              )}
              {exp.parentId && !exp.parentVariantId && (
                <div className="col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Derived from</p>
                  {(() => {
                    const parent = allExperiments.find(v => v.id === exp.parentId);
                    return parent ? (
                      <button
                        onClick={() => onSelectVariant(parent.id)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/18 hover:border-emerald-500/35 transition-colors"
                      >
                        <GitBranch className="w-2.5 h-2.5" />{parent.variantId}
                      </button>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground/50">{exp.parentId}</span>
                    );
                  })()}
                </div>
              )}
              {exp.parentVariantId && (
                <div className="col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Iterated from</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const parent = allExperiments.find(v => v.id === exp.parentId || v.variantId === exp.parentVariantId);
                      return parent ? (
                        <button
                          onClick={() => { onSelectVariant(parent.id); }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/18 hover:border-emerald-500/35 transition-colors"
                          title="Click to view parent variant"
                        >
                          <GitBranch className="w-2.5 h-2.5" />{exp.parentVariantId} →
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <GitBranch className="w-2.5 h-2.5" />{exp.parentVariantId}
                        </span>
                      );
                    })()}
                    {exp.iterationType && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                        style={{ background: ITER_TYPE_COLOR[exp.iterationType] + "15", color: ITER_TYPE_COLOR[exp.iterationType], borderColor: ITER_TYPE_COLOR[exp.iterationType] + "28" }}>
                        {exp.iterationType}
                      </span>
                    )}
                    {(exp as any).source === "iteration" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        <Sparkles className="w-2.5 h-2.5" />Iteration
                      </span>
                    )}
                  </div>
                </div>
              )}
              {exp.originScriptId && (
                <div className="col-span-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Origin Script ID</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-primary/10 text-primary/70 border border-primary/20">
                    <Code2 className="w-2.5 h-2.5" />{exp.originScriptId}
                  </span>
                </div>
              )}
              {exp.startDate && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">Start Date</p>
                  <span className="inline-flex items-center gap-1 text-xs text-foreground/55 font-mono">
                    <Calendar className="w-3 h-3 opacity-60" />{fmtDate(exp.startDate)}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Creative Variables */}
          <section>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Creative Variables</p>
            <div className="grid grid-cols-2 gap-2.5">
              {(exp.adType === "static"
                ? [
                    { label:"Headline",       value: exp.headline ?? exp.hookType,           color:"#8b5cf6" },
                    { label:"Angle",          value: exp.primaryAngle,                       color:"#6366f1" },
                    { label:"Visual Concept", value: exp.visualConcept ?? exp.creativeFormat, color:"#10b981" },
                    { label:"CTA",            value: exp.cta,                                color:"#f59e0b" },
                  ]
                : [
                    { label:"Hook Type", value: exp.hookType,       color:"#8b5cf6" },
                    { label:"Angle",     value: exp.primaryAngle,   color:"#6366f1" },
                    { label:"Format",    value: exp.creativeFormat, color:"#10b981" },
                    { label:"CTA",       value: exp.cta,            color:"#f59e0b" },
                  ]
              ).map(({ label, value, color }) => (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45 mb-1.5">{label}</p>
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                    style={{ background:`${color}15`, color, borderColor:`${color}30` }}
                  >{value || "—"}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Latest metrics (if any) */}
          {m && (
            <section>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Latest Metrics</p>
              <div className={`grid ${(exp as any).adType === "static" ? "grid-cols-2" : "grid-cols-4"} gap-2`}>
                {[
                  ...(exp as any).adType !== "static" ? [
                    { label:"TSR",  value:`${m.tsr.toFixed(1)}%`,  color:"#8b5cf6" },
                    { label:"Hold", value:`${m.hold.toFixed(1)}%`, color:"#6366f1" },
                  ] : [],
                  { label:"CTR",  value:`${m.ctr.toFixed(1)}%`,  color:"#10b981" },
                  { label:"CPA",  value:m.cpa ? `$${m.cpa.toFixed(0)}` : "—", color:"#f59e0b" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg p-2.5 text-center" style={{ background:`${color}0d`, border:`1px solid ${color}20` }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color:`${color}80` }}>{label}</p>
                    <p className="text-sm font-bold font-mono" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Iteration History */}
          {hasLineage && (
            <section>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Iteration History</p>

              {/* Lineage chain */}
              {lineageChain.length > 1 && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-2">Chain</p>
                  <div className="flex items-center flex-wrap gap-1">
                    {lineageChain.map((v, idx) => (
                      <span key={v.id} className="flex items-center gap-1">
                        {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/20 shrink-0" />}
                        <button
                          onClick={() => v.id !== exp.id && onSelectVariant(v.id)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border transition-colors ${
                            v.id === exp.id
                              ? "bg-primary/15 text-primary border-primary/25 cursor-default"
                              : "bg-white/[0.04] text-foreground/55 border-white/10 hover:bg-white/[0.08] hover:text-foreground/80 cursor-pointer"
                          }`}
                        >
                          {v.iterationType && v.id !== exp.id && (
                            <span className="w-3 h-3 rounded-sm text-[8px] font-black flex items-center justify-center shrink-0"
                              style={{ color: ITER_TYPE_COLOR[v.iterationType] }}>
                              {v.iterationType[0]}
                            </span>
                          )}
                          {v.variantId || v.id.slice(0, 8)}
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step info */}
              {(exp.iterationType || (exp.iterationStep ?? 0) > 0) && (
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {exp.iterationType && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: ITER_TYPE_COLOR[exp.iterationType] + "12", color: ITER_TYPE_COLOR[exp.iterationType], borderColor: ITER_TYPE_COLOR[exp.iterationType] + "25" }}>
                      <GitBranch className="w-3 h-3" />
                      {exp.iterationType} iteration
                    </span>
                  )}
                  {(exp.iterationStep ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-white/8 bg-white/[0.03] text-muted-foreground/50">
                      Step {exp.iterationStep}
                    </span>
                  )}
                </div>
              )}

              {/* Children */}
              {children.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/40 mb-2">
                    Children ({children.length})
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onSelectVariant(child.id)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all text-left"
                      >
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                          style={{ background: child.iterationType ? ITER_TYPE_COLOR[child.iterationType] + "15" : "rgba(255,255,255,0.05)" }}>
                          <GitBranch className="w-3 h-3"
                            style={{ color: child.iterationType ? ITER_TYPE_COLOR[child.iterationType] : "rgba(255,255,255,0.3)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono text-[11px] font-bold text-foreground/80">
                              {child.variantId}
                            </span>
                            {child.iterationType && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded border"
                                style={{ background: ITER_TYPE_COLOR[child.iterationType] + "12", color: ITER_TYPE_COLOR[child.iterationType], borderColor: ITER_TYPE_COLOR[child.iterationType] + "25" }}>
                                {child.iterationType}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/40 truncate">{child.adVariant || "—"}</p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0">{child.status}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Script / Ad Content */}
          {(exp as any).adType === "static" ? (
            <section>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Ad Creative</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ImageIcon className="w-3 h-3 text-muted-foreground/35" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Static Ad Image</p>
                </div>
                {(exp as any).adImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                    <img src={(exp as any).adImage} alt="Static ad" className="w-full object-cover max-h-64" />
                    <button
                      onClick={() => { onUpdate({ adImage: "" } as any); }}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => adImageRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all py-10 flex flex-col items-center gap-2.5"
                  >
                    <ImagePlus className="w-7 h-7 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground/60">Click to upload static ad image</p>
                    <p className="text-[10px] text-muted-foreground/40">PNG, JPG, WebP supported</p>
                  </button>
                )}
                <input ref={adImageRef} type="file" accept="image/*" className="hidden" onChange={handleAdImageUpload} />
              </div>
            </section>
          ) : (
            <section>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Script Content</p>
              <div className="flex flex-col gap-3">
                {[
                  { label:"Hook Text", icon:Code2,             key:"hookText" as const, value:localHookText, set:setLocalHookText, placeholder:"Enter hook text..."  },
                  { label:"Body Text", icon:AlignLeft,         key:"bodyText" as const, value:localBodyText, set:setLocalBodyText, placeholder:"Enter body text..."  },
                  { label:"CTA Text",  icon:MousePointerClick, key:"ctaText"  as const, value:localCtaText,  set:setLocalCtaText,  placeholder:"Enter cta text..."   },
                ].map(({ label, icon: Icon, key, value, set, placeholder }) => (
                  <div key={label}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3 text-muted-foreground/35" />
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">{label}</p>
                    </div>
                    <textarea rows={3}
                      className={`${sidebarInputCls} resize-none leading-relaxed font-mono`}
                      value={value}
                      placeholder={isDemo ? "— example data —" : placeholder}
                      readOnly={isDemo}
                      onChange={e => set(e.target.value)}
                      onBlur={e => save({ [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Production Info */}
          <section>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/35 mb-3 pb-2 border-b border-white/5">Production Info</p>
            <div className="flex flex-col gap-3">
              {/* Ad Asset Link */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Link2 className="w-3 h-3 text-muted-foreground/35" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Ad Asset Link</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="url" className={`${sidebarInputCls} flex-1`}
                    value={localAssetLink} placeholder={isDemo ? "— example data —" : "https://..."}
                    readOnly={isDemo}
                    onChange={e => setLocalAssetLink(e.target.value)}
                    onBlur={e => save({ adAssetLink: e.target.value })}
                  />
                  {localAssetLink && (
                    <a href={localAssetLink} target="_blank" rel="noreferrer"
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors shrink-0"
                    ><ExternalLink className="w-3 h-3 text-blue-400" /></a>
                  )}
                </div>
              </div>
              {/* Platform (standalone) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Monitor className="w-3 h-3 text-muted-foreground/35" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Platform</p>
                </div>
                {isDemo
                  ? <p className="text-xs text-muted-foreground/30 italic">— example data —</p>
                  : <AppDropdown value={localPlatform} onChange={v => { setLocalPlatform(v); save({ platform: v }); }}
                      options={PLATFORM_OPTS} placeholder="Select..." size="sm" />
                }
              </div>

              {/* Row 1: Created by / Created on */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Created by</p>
                  </div>
                  <input className={sidebarInputCls}
                    value={localCreator} placeholder={isDemo ? "— example data —" : "Creator name..."}
                    readOnly={isDemo}
                    onChange={e => setLocalCreator(e.target.value)}
                    onBlur={e => save({ creator: e.target.value } as any)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Created on</p>
                  </div>
                  {isDemo
                    ? <p className="text-xs text-muted-foreground/30 italic">— example data —</p>
                    : <input type="date" className={sidebarInputCls}
                        value={localCreatedOn}
                        onChange={e => { setLocalCreatedOn(e.target.value); save({ createdOn: e.target.value } as any); }}
                      />
                  }
                </div>
              </div>

              {/* Row 2: Built by / Added on */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Layers className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Built by</p>
                  </div>
                  <input className={sidebarInputCls}
                    value={localEditor} placeholder={isDemo ? "— example data —" : "Editor name..."}
                    readOnly={isDemo}
                    onChange={e => setLocalEditor(e.target.value)}
                    onBlur={e => save({ editor: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Added on</p>
                  </div>
                  {isDemo
                    ? <p className="text-xs text-muted-foreground/30 italic">— example data —</p>
                    : <input type="date" className={sidebarInputCls}
                        value={localAddedOn}
                        onChange={e => { setLocalAddedOn(e.target.value); save({ addedOn: e.target.value } as any); }}
                      />
                  }
                </div>
              </div>

              {/* Row 3: Media Buyer / Campaign Started */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <TrendingUp className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Media Buyer</p>
                  </div>
                  <input className={sidebarInputCls}
                    value={localMediaBuyer} placeholder={isDemo ? "— example data —" : "Buyer name..."}
                    readOnly={isDemo}
                    onChange={e => setLocalMediaBuyer(e.target.value)}
                    onBlur={e => save({ mediabuyer: e.target.value } as any)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Rocket className="w-3 h-3 text-muted-foreground/35" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Campaign Started</p>
                  </div>
                  {isDemo
                    ? <p className="text-xs text-muted-foreground/30 italic">— example data —</p>
                    : <input type="date" className={sidebarInputCls}
                        value={localCampaignStart}
                        onChange={e => { setLocalCampaignStart(e.target.value); save({ startDate: e.target.value }); }}
                      />
                  }
                </div>
              </div>
            </div>

            {/* Production Notes */}
            {(localProductionNotes || exp.creativeFormat) && (
              <div className="mt-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3 h-3 text-muted-foreground/35" />
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/45">Production Notes</p>
                </div>
                <textarea
                  rows={3}
                  className={`${sidebarInputCls} resize-none leading-relaxed`}
                  value={localProductionNotes}
                  placeholder={isDemo ? "— example data —" : "Execution notes — e.g. fast cuts, subtitles, bold captions…"}
                  readOnly={isDemo}
                  onChange={e => setLocalProductionNotes(e.target.value)}
                  onBlur={e => save({ productionNotes: e.target.value })}
                />
              </div>
            )}
          </section>

        </div>
      </motion.div>
    </>
  );
}

// ── BLANK FORM STATE ───────────────────────────────────────────────────────────
type FormState = Omit<Variant, "id" | "variantId" | "parentVariantId" | "originScriptId" | "timeline">;
const blankForm = (): FormState => ({
  adVariant:      "",
  hookType:       HOOK_TYPES[0],
  primaryAngle:   ANGLES[0],
  creativeFormat: FORMATS[0],
  cta:            CTA_TYPES[0],
  status:         "Draft",
  startDate:      todayISO(),
});

// ── renderTransitionLabel — "Hook: Question → Curiosity" styled splitter ──────
// Parses labels of the form "<Prefix>: <from> → <to>" and returns a span where
// the "from" side is dimmed and the "to" side is emphasised in white.
function renderTransitionLabel(
  label: string,
  size: string = "text-[11px]",
): React.ReactNode {
  const colonIdx = label.indexOf(": ");
  if (colonIdx === -1) return <span className={`${size} font-semibold text-foreground/75`}>{label}</span>;
  const prefix = label.slice(0, colonIdx);
  const rest   = label.slice(colonIdx + 2);
  const arrowIdx = rest.indexOf(" \u2192 ");
  if (arrowIdx === -1) return (
    <span className={`inline-flex items-baseline gap-1 ${size}`}>
      <span className="text-muted-foreground/40">{prefix}:</span>
      <span className="font-bold text-foreground/85">{rest}</span>
    </span>
  );
  const from = rest.slice(0, arrowIdx);
  const to   = rest.slice(arrowIdx + 3);
  return (
    <span className={`inline-flex items-baseline gap-1 ${size}`}>
      <span className="text-muted-foreground/40 shrink-0">{prefix}:</span>
      <span className="opacity-40">{from}</span>
      <span className="text-muted-foreground/35 shrink-0">{'\u2192'}</span>
      <span className="font-bold text-white/90">{to}</span>
    </span>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CreativeLab() {
  const { projectKey, activeProjectCode } = useProject();
  const [rawData, setRawData] = useLocalStorage<any[]>(projectKey("lab:experiments"), []);
  const [rawTests, setRawTests] = useLocalStorage<any[]>(projectKey("lab:tests"), []);
  const [groupsRaw, setGroupsRaw] = useLocalStorage<AdGroup[]>(projectKey("lab:ad-groups"), []);
  // ── Legacy single-ad form (used for branching/child variants only) ───────────
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState<FormState>(blankForm());
  const [pendingParentVariantId, setPendingParentVariantId] = useState<string | null>(null);
  // ── New Test creation form (multiple ads → one test) ─────────────────────────
  const [showTestForm,          setShowTestForm]          = useState(false);
  const [testDraftName,         setTestDraftName]         = useState("");
  const [testDraftAds,          setTestDraftAds]          = useState<FormState[]>([blankForm()]);
  const [testFormMode,          setTestFormMode]          = useState<"new" | "existing">("new");
  const [selectedExistingTestId, setSelectedExistingTestId] = useState("");
  const [addToTestConfirmation, setAddToTestConfirmation] = useState<string | null>(null);
  const [testDraftPlatform,     setTestDraftPlatform]     = useState("");
  const [editingPlatformTestId, setEditingPlatformTestId] = useState<string | null>(null);
  const [addVariantTestId,      setAddVariantTestId]      = useState<string | null>(null);
  const [addVariantDraft,       setAddVariantDraft]       = useState<FormState>(blankForm());
  const [learningModalTestId,   setLearningModalTestId]   = useState<string | null>(null);
  const [learningDraft,         setLearningDraft]         = useState({ winnerVariantId: "", insight: "", nextAction: "" });
  const [learningSaved,         setLearningSaved]         = useState(false);
  const [isGenerating,          setIsGenerating]          = useState(false);
  const [staticPrefillNotice,   setStaticPrefillNotice]   = useState<string | null>(null);

  const experiments: Variant[] = useMemo(() => rawData.map(migrateVariant), [rawData]);
  const isDemo = false;
  const displayExperiments = experiments;

  // Preview of the ID that will be assigned when saving the branch form
  const previewVariantId = pendingParentVariantId
    ? nextIterationId(experiments, pendingParentVariantId)
    : nextTopLevelVId(experiments, activeProjectCode);

  // On mount: auto-open form if a static prefill was left in localStorage (cross-page navigation)
  useEffect(() => {
    if (localStorage.getItem(projectKey("lab:staticPrefill"))) {
      openTestCreation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function openAddForm(parentVId?: string) {
    setPendingParentVariantId(parentVId ?? null);
    setForm(blankForm());
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setForm(blankForm());
    setPendingParentVariantId(null);
  }

  // ── Test creation helpers ────────────────────────────────────────────────────
  function readStaticPrefill() {
    const raw = localStorage.getItem(projectKey("lab:staticPrefill"));
    if (!raw) return null;
    try { const p = JSON.parse(raw); localStorage.removeItem(projectKey("lab:staticPrefill")); return p; }
    catch { return null; }
  }
  function openTestCreation() {
    let firstAd = blankForm();
    let notice: string | null = null;
    let platform = "";
    if (activeAdType === "static") {
      const prefill = readStaticPrefill();
      if (prefill) {
        firstAd = { ...firstAd, primaryAngle: prefill.angle ?? firstAd.primaryAngle, cta: prefill.cta ?? firstAd.cta };
        if (prefill.platform) platform = prefill.platform;
        if (prefill.sourceVariantId) notice = `Pre-filled from winner ${prefill.sourceVariantId} — adjust as needed`;
      }
    }
    setShowTestForm(true);
    setTestDraftName("");
    setTestDraftAds([firstAd]);
    setTestFormMode("new");
    setSelectedExistingTestId("");
    setTestDraftPlatform(platform);
    setStaticPrefillNotice(notice);
  }
  function cancelTestCreation() {
    setShowTestForm(false);
    setTestDraftName("");
    setTestDraftAds([blankForm()]);
    setTestFormMode("new");
    setSelectedExistingTestId("");
    setTestDraftPlatform("");
    setStaticPrefillNotice(null);
  }

  // ── Learning helpers ─────────────────────────────────────────────────────────
  function openLearningModal(testId: string) {
    const rawTest   = (rawTests ?? []).find((t: any) => t.id === testId);
    const existing  = rawTest?.learning as { winnerVariantId?: string; insight?: string; nextAction?: string } | undefined;
    const hasExisting = !!(existing?.winnerVariantId || existing?.insight || existing?.nextAction);

    if (hasExisting) {
      setLearningDraft({
        winnerVariantId: existing?.winnerVariantId ?? "",
        insight:         existing?.insight         ?? "",
        nextAction:      existing?.nextAction       ?? "",
      });
    } else {
      // Auto-generate suggestions from variant performance data
      const testVariants: Variant[] = (() => {
        const byVarIds = (rawTest?.variantIds ?? [])
          .map((vid: string) =>
            experiments.find(e => e.id === vid) ??
            experiments.find(e => e.variantId === vid)
          )
          .filter(Boolean) as Variant[];
        if (byVarIds.length > 0) return byVarIds;
        return experiments.filter(e => (e as any).testId === testId);
      })();
      const suggestion = generateLearning(testVariants, rawTest?.iterationType);
      // Fall back to first variant if generator found no metrics-based winner
      const fallbackWinner = testVariants[0]?.variantId ?? testVariants[0]?.id ?? "";
      setLearningDraft({
        winnerVariantId: suggestion?.winnerVariantId ?? fallbackWinner,
        insight:         suggestion?.insight         ?? "",
        nextAction:      suggestion?.nextAction       ?? "",
      });
    }
    setLearningModalTestId(testId);
  }

  function closeLearningModal() {
    setLearningModalTestId(null);
    setLearningDraft({ winnerVariantId: "", insight: "", nextAction: "" });
    setLearningSaved(false);
    setIsGenerating(false);
  }

  function generateSuggestions() {
    if (!learningModalTestId || isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      const rawTest    = (rawTests ?? []).find((t: any) => t.id === learningModalTestId);
      const testVariants: Variant[] = (() => {
        const byVarIds = (rawTest?.variantIds ?? [])
          .map((vid: string) =>
            experiments.find(e => e.id === vid) ??
            experiments.find(e => e.variantId === vid)
          )
          .filter(Boolean) as Variant[];
        if (byVarIds.length > 0) return byVarIds;
        return experiments.filter(e => (e as any).testId === learningModalTestId);
      })();
      const suggestion = generateLearning(testVariants, rawTest?.iterationType);
      const fallbackWinner = testVariants[0]?.variantId ?? testVariants[0]?.id ?? "";
      if (suggestion) {
        setLearningDraft({
          winnerVariantId: suggestion.winnerVariantId || fallbackWinner,
          insight:         suggestion.insight,
          nextAction:      suggestion.nextAction,
        });
      } else if (fallbackWinner) {
        setLearningDraft(d => ({ ...d, winnerVariantId: d.winnerVariantId || fallbackWinner }));
      }
      setIsGenerating(false);
    }, 500);
  }

  function saveLearning() {
    if (!learningModalTestId) return;
    const learning = {
      winnerVariantId: learningDraft.winnerVariantId || undefined,
      insight:         learningDraft.insight.trim()  || undefined,
      nextAction:      learningDraft.nextAction.trim()|| undefined,
    };
    setRawTests((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const exists = arr.some((t: any) => t.id === learningModalTestId);
      if (exists) {
        // Update the existing rawTest entry
        return arr.map((t: any) =>
          t.id === learningModalTestId ? { ...t, learning } : t
        );
      }
      // No rawTest entry yet (fallback/synthetic test) — create one so the
      // learning persists and the test is promoted from fallback to tableTest
      const relatedVariants = experiments.filter(
        e => (e as any).testId === learningModalTestId || e.id === learningModalTestId
      );
      return [
        ...arr,
        {
          id:         learningModalTestId,
          learning,
          variantIds: relatedVariants.map(e => e.id),
          createdAt:  Date.now(),
        },
      ];
    });
    setLearningSaved(true);
    setTimeout(() => {
      closeLearningModal();
    }, 1500);
  }

  function addAdToExistingTest() {
    const validAds = testDraftAds.filter(a =>
      activeAdType === "static"
        ? (a.headline?.trim() || a.adVariant.trim())
        : a.adVariant.trim()
    );
    if (!validAds.length || !selectedExistingTestId) return;
    const inheritedPlatform = experiments.find(e => (e.testId || e.id) === selectedExistingTestId)?.platform ?? "";
    let snapshot = [...experiments];
    const newVariants: Variant[] = validAds.map(ad => {
      const resolvedVariant = activeAdType === "static" && !ad.adVariant.trim()
        ? (ad.headline?.slice(0, 50) ?? "Static Ad") || "Static Ad"
        : ad.adVariant;
      const newId = uid();
      const variantId = nextVariantIdInTest(snapshot, selectedExistingTestId);
      const v: Variant = {
        ...ad,
        adVariant: resolvedVariant,
        adType: activeAdType,
        hookType: activeAdType === "static" ? "" : ad.hookType,
        creativeFormat: activeAdType === "static" ? "" : ad.creativeFormat,
        id: newId,
        variantId,
        timeline: [],
        parentId: null,
        rootId: newId,
        iterationType: null,
        iterationStep: 0,
        groupId: null,
        testId: selectedExistingTestId,
        editor: "You",
        platform: inheritedPlatform,
      };
      snapshot = [...snapshot, v];
      return v;
    });
    setRawData(prev => [...prev, ...newVariants]);
    const totalVariants = experiments.filter(e => (e.testId || e.id) === selectedExistingTestId).length + newVariants.length;
    const msg = `Added to ${selectedExistingTestId} (now ${totalVariants} variant${totalVariants !== 1 ? "s" : ""})`;
    setAddToTestConfirmation(msg);
    setTimeout(() => setAddToTestConfirmation(null), 4000);
    setShowTestForm(false);
    setTestDraftName("");
    setTestDraftAds([blankForm()]);
    setTestFormMode("new");
    setSelectedExistingTestId("");
    setTestDraftPlatform("");
  }
  function saveVariantToTest() {
    if (!addVariantDraft.adVariant.trim() || !addVariantTestId) return;
    const newId = uid();
    const variantId = nextVariantIdInTest(experiments, addVariantTestId);
    const inheritedPlatform = experiments.find(e => (e.testId || e.id) === addVariantTestId)?.platform ?? "";
    const v: Variant = {
      ...addVariantDraft,
      id: newId,
      variantId,
      timeline: [],
      parentId: null,
      rootId: newId,
      iterationType: null,
      iterationStep: 0,
      groupId: null,
      testId: addVariantTestId,
      editor: "You",
      platform: inheritedPlatform,
    };
    setRawData(prev => [...prev, v]);
    setAddVariantTestId(null);
    setAddVariantDraft(blankForm());
  }

  function addTestAdSlot() {
    setTestDraftAds(prev => [...prev, blankForm()]);
  }
  function removeTestAdSlot(i: number) {
    setTestDraftAds(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i));
  }
  function updateTestAd<K extends keyof FormState>(i: number, key: K, val: FormState[K]) {
    setTestDraftAds(prev => prev.map((ad, idx) => idx === i ? { ...ad, [key]: val } : ad));
  }
  function saveNewTest() {
    const validAds = testDraftAds.filter(a =>
      activeAdType === "static"
        ? (a.headline?.trim() || a.adVariant.trim())
        : a.adVariant.trim()
    );
    if (!validAds.length || !testDraftPlatform) return;
    const testId = nextTestId(experiments, activeProjectCode, activeAdType);
    let snapshot = [...experiments];
    const newVariants: Variant[] = validAds.map(ad => {
      const resolvedVariant = activeAdType === "static" && !ad.adVariant.trim()
        ? (ad.headline?.slice(0, 50) ?? "Static Ad") || "Static Ad"
        : ad.adVariant;
      const newId = uid();
      const variantId = nextVariantIdInTest(snapshot, testId);
      const v: Variant = {
        ...ad,
        adVariant: resolvedVariant,
        adType: activeAdType,
        hookType: activeAdType === "static" ? "" : ad.hookType,
        creativeFormat: activeAdType === "static" ? "" : ad.creativeFormat,
        id: newId,
        variantId,
        timeline: [],
        parentId: null,
        rootId: newId,
        iterationType: null,
        iterationStep: 0,
        groupId: null,
        testId: testId,
        editor: "You",
        platform: testDraftPlatform,
      };
      snapshot = [...snapshot, v];
      return v;
    });
    setRawData(prev => [...prev, ...newVariants]);
    setShowTestForm(false);
    setTestDraftName("");
    setTestDraftAds([blankForm()]);
    setTestDraftPlatform("");
  }

  function addExperiment(iterationType: IterationType = null) {
    if (!form.adVariant.trim()) return;
    const newId = uid();
    const variantId = pendingParentVariantId
      ? nextIterationId(experiments, pendingParentVariantId)
      : nextTopLevelVId(experiments, activeProjectCode);

    // ── Lineage resolution ──────────────────────────────────────────────────
    let lineage: Pick<Variant, "parentId" | "rootId" | "iterationType" | "iterationStep">;
    if (pendingParentVariantId) {
      const sourceVar = experiments.find(e => e.variantId === pendingParentVariantId);
      lineage = {
        parentId:      sourceVar?.id ?? null,
        rootId:        sourceVar ? resolveRootId(sourceVar) : newId,
        iterationType,
        iterationStep: (sourceVar?.iterationStep ?? 0) + 1,
      };
    } else {
      lineage = {
        parentId:      null,
        rootId:        newId,
        iterationType: null,
        iterationStep: 0,
      };
    }

    const newVar: Variant = {
      ...form,
      id: newId,
      variantId,
      timeline: [],
      ...lineage,
      ...(pendingParentVariantId ? { parentVariantId: pendingParentVariantId } : {}),
    };
    setRawData(p => [...p, newVar]);
    setForm(blankForm());
    setPendingParentVariantId(null);
    setShowForm(false);
  }

  function deleteExperiment(id: string) {
    setRawData(p => p.filter(e => e.id !== id));
  }

  function updateExperiment(id: string, patch: Partial<Variant>) {
    setRawData(p => p.map(e => e.id === id ? { ...migrateVariant(e), ...patch } : e));
    window.dispatchEvent(new CustomEvent("clb:write"));
  }

  function updateTestStatus(testId: string, newStatus: Status) {
    setRawData(prev => prev.map(exp => {
      if ((exp.testId || exp.id) !== testId) return exp;
      if (exp.status === "Winner" || exp.status === "Loser" || exp.status === "Killed") return exp;
      return { ...migrateVariant(exp), status: newStatus };
    }));
    window.dispatchEvent(new CustomEvent("clb:write"));
  }

  const [, navigate] = useLocation();

  // ── FILTER + SORT STATE (persisted so settings survive page navigation) ─────
  const [filterStatus,   setFilterStatus]   = useLocalStorage<string>("clb:ui:filterStatus",   "");
  const [filterPlatform, setFilterPlatform] = useLocalStorage<string>("clb:ui:filterPlatform", "");
  const [activeAdType,   setActiveAdType]   = useLocalStorage<"video" | "static">("clb:ui:activeAdType", "video");
  const [sortBy,  setSortBy]  = useLocalStorage<SortKey>("clb:ui:sortBy",  "variantId");
  const [sortDir, setSortDir] = useLocalStorage<"asc" | "desc">("clb:ui:sortDir", "asc");
  const [selectedExpId, setSelectedExpId] = useState<string | null>(null);
  const [expandedTestsArr, setExpandedTestsArr] = useLocalStorage<string[]>("clb:ui:expandedTests", []);
  const expandedTests = new Set(expandedTestsArr);
  const setExpandedTests = (updater: (prev: Set<string>) => Set<string>) => {
    setExpandedTestsArr(arr => Array.from(updater(new Set(arr))));
  };

  // Ref holds the variantId that "View Ad" navigation wants to focus & scroll to.
  // Using a ref (not state) avoids an extra render cycle before the scroll effect fires.
  const focusVariantIdRef = useRef<string | null>(null);

  useEffect(() => {
    // "View Ad" deep-link: collapse all tests, expand only the target, then scroll to it
    const focusVId = localStorage.getItem("clb:ui:focusVariantId");
    if (focusVId) {
      localStorage.removeItem("clb:ui:focusVariantId");
      focusVariantIdRef.current = focusVId;
    }
    // Legacy: plain auto-expand without scroll (other callers may still use this)
    const autoExpand = localStorage.getItem("clb:ui:autoExpandTestId");
    if (autoExpand) {
      localStorage.removeItem("clb:ui:autoExpandTestId");
      setExpandedTestsArr(prev => prev.includes(autoExpand) ? prev : [...prev, autoExpand]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFiltersCount = [filterStatus, filterPlatform].filter(Boolean).length;
  function clearFilters() {
    setFilterStatus(""); setFilterPlatform("");
  }

  // Group all variants into test-level objects (with aggregated fields)
  // ── AD TYPE FILTER ────────────────────────────────────────────────────────────
  const typedDisplayExps = useMemo(() =>
    displayExperiments.filter(e =>
      activeAdType === "static"
        ? e.adType === "static"
        : e.adType === "video" || e.adType == null
    ),
    [displayExperiments, activeAdType]
  );

  const allGroupedTests = useMemo(() => {
    // ── Step 1: build variant lookup keyed by variantId and id ───────────────
    const variantMap = new Map<string, Variant>();
    typedDisplayExps.forEach(exp => {
      if (exp.variantId) variantMap.set(exp.variantId, exp);
      variantMap.set(exp.id, exp);
    });

    // ── Helper: compute per-test derived fields from a variants array ─────────
    const deriveFields = (variants: Variant[], iterationType: string | null, rawCreatedAt?: number) => {
      const testStatus   = aggregateTestStatus(variants);
      const testPlatform = normalizePlatform(variants.find(v => v.platform)?.platform);
      const testAuthor   = variants.find(v => (v as any).editor)?.editor ?? "";
      const earliestDate = variants.reduce<string | null>((best, v) => {
        if (!v.startDate) return best;
        return !best || v.startDate < best ? v.startDate : best;
      }, null);
      const withMetrics = variants.filter(v => v.timeline.length > 0);
      const avgCTR = withMetrics.length
        ? withMetrics.reduce((s, v) => s + (latestMetrics(v)?.ctr ?? 0), 0) / withMetrics.length
        : null;
      const avgCPA = withMetrics.length
        ? withMetrics.reduce((s, v) => s + (latestMetrics(v)?.cpa ?? 0), 0) / withMetrics.length
        : null;
      const testCreatedAt = earliestDate
        ?? (rawCreatedAt ? new Date(rawCreatedAt).toISOString().split("T")[0] : null);
      return { testStatus, testPlatform, testAuthor, testCreatedAt, iterationType, avgCTR, avgCPA, hasPerf: withMetrics.length > 0 };
    };

    // ── Step 2: build tests from lab:tests records (primary source) ───────────
    const adTypeMatch = (v: Variant) =>
      activeAdType === "static"
        ? (v as any).adType === "static"
        : (v as any).adType === "video" || (v as any).adType == null;

    const tableTests = (rawTests ?? []).map((t: any) => {
      const variants = (t.variantIds ?? [] as string[])
        .map((id: string) => variantMap.get(id))
        .filter((v): v is Variant => v != null)
        .sort((a, b) => b.createdAt - a.createdAt);
      return { testId: t.id, parentTestId: (t.parentTestId ?? null) as string | null, sourceVariantId: (t.sourceVariantId ?? null) as string | null, variants, learning: (t.learning ?? null) as { winnerVariantId?: string; insight?: string; nextAction?: string } | null, ...deriveFields(variants, t.iterationType ?? null, t.createdAt) };
    }).filter(t => t.variants.some(adTypeMatch));

    // ── Step 3: fallback for variants not covered by any lab:tests record ─────
    const coveredIds = new Set<string>();
    (rawTests ?? []).forEach((t: any) => (t.variantIds ?? []).forEach((id: string) => coveredIds.add(id)));

    const fallbackMap = new Map<string, Variant[]>();
    typedDisplayExps.forEach(exp => {
      if (coveredIds.has(exp.variantId ?? "") || coveredIds.has(exp.id)) return;
      const key = (exp as any).testId || exp.id;
      if (!fallbackMap.has(key)) fallbackMap.set(key, []);
      fallbackMap.get(key)!.push(exp);
    });

    const fallbackTests = Array.from(fallbackMap.entries()).map(([testId, variants]) => ({
      testId,
      variants: [...variants].sort((a, b) => b.createdAt - a.createdAt),
      ...deriveFields(variants, (variants[0] as any).iterationType ?? null),
    })).filter(t => t.variants.some(adTypeMatch));

    return [...tableTests, ...fallbackTests];
  }, [typedDisplayExps, rawTests, activeAdType]);

  // When allGroupedTests is ready and a focus target exists, expand only its test and scroll
  useEffect(() => {
    const fvId = focusVariantIdRef.current;
    if (!fvId || allGroupedTests.length === 0) return;
    const testContaining = allGroupedTests.find(t =>
      t.variants.some((v: Variant) => v.id === fvId || v.variantId === fvId)
    );
    if (!testContaining) return;
    focusVariantIdRef.current = null; // consume — prevents re-running on subsequent memo updates
    setExpandedTestsArr([testContaining.testId]); // close all others, open only this test
    setTimeout(() => {
      const el = document.getElementById(`var-${fvId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220); // wait for AnimatePresence expand (duration ~150ms) to finish rendering
  }, [allGroupedTests]); // eslint-disable-line react-hooks/exhaustive-deps

  // Eligible tests for "Add to Existing": only Draft or Producing, from real experiments (not demo)
  const eligibleTestsForAdding = useMemo(() => {
    const testMap = new Map<string, Variant[]>();
    experiments.forEach(exp => {
      const tid = exp.testId || exp.id;
      if (!testMap.has(tid)) testMap.set(tid, []);
      testMap.get(tid)!.push(exp);
    });
    return Array.from(testMap.entries())
      .filter(([, variants]) => {
        const s = aggregateTestStatus(variants);
        return s === "Draft" || s === "Producing";
      })
      .map(([testId, variants]) => ({ testId, variantCount: variants.length }))
      .sort((a, b) => a.testId.localeCompare(b.testId));
  }, [experiments]);

  // Apply test-level filters and sort
  const groupedTests = useMemo(() => {
    let tests = allGroupedTests;
    if (filterStatus)   tests = tests.filter(t => t.testStatus === filterStatus);
    if (filterPlatform) tests = tests.filter(t => t.testPlatform === filterPlatform);

    return [...tests].sort((a, b) => {
      switch (sortBy) {
        case "startDate": {
          const da = a.testCreatedAt ? new Date(a.testCreatedAt).getTime() : 0;
          const db = b.testCreatedAt ? new Date(b.testCreatedAt).getTime() : 0;
          return sortDir === "asc" ? da - db : db - da;
        }
        case "ctr": {
          const va = a.avgCTR ?? -1, vb = b.avgCTR ?? -1;
          return sortDir === "asc" ? va - vb : vb - va;
        }
        case "cpa": {
          const va = a.avgCPA ?? Infinity, vb = b.avgCPA ?? Infinity;
          return sortDir === "asc" ? va - vb : vb - va;
        }
        default:
          return sortDir === "asc" ? a.testId.localeCompare(b.testId) : b.testId.localeCompare(a.testId);
      }
    });
  }, [allGroupedTests, filterStatus, filterPlatform, sortBy, sortDir]);

  // ── ANALYTICS — filtered by the active ad type tab ───────────────────────────
  const analyticsExps = useMemo(() => {
    if (activeAdType === "static") return displayExperiments.filter(e => (e as any).adType === "static" && e.status !== "Killed");
    return displayExperiments.filter(e => (!(e as any).adType || (e as any).adType === "video") && e.status !== "Killed");
  }, [displayExperiments, activeAdType]);

  // ── Learning aggregation — performance-weighted patterns across all tests ────
  const learningAggregation = useMemo(() => {
    const tests = rawTests ?? [];

    type Bucket = { score: number; count: number };
    const scoreBy = (field: "hook" | "format" | "cta") => {
      const map: Record<string, Bucket> = {};
      let anyMetrics = false;

      tests
        .filter((t: any) => t.learning?.winnerVariantId)
        .forEach((t: any) => {
          const winner  = analyticsExps.find(e => e.variantId === t.learning.winnerVariantId);
          if (!winner) return;

          const key =
            field === "hook"   ? winner.hookType       :
            field === "format" ? winner.creativeFormat :
                                 winner.cta;
          if (!key) return;

          if (!map[key]) map[key] = { score: 0, count: 0 };
          map[key].count += 1;

          // Compute performance delta vs other variants in the same test
          const others = analyticsExps.filter(e =>
            (t.variantIds ?? []).includes(e.id) && e.variantId !== t.learning.winnerVariantId
          );
          const winnerM  = latestMetrics(winner);
          const winnerCTR = winnerM?.ctr ?? 0;
          const winnerCPA = winnerM?.cpa ?? 0;
          const avgCTR = others.length
            ? others.reduce((s, e) => s + (latestMetrics(e)?.ctr ?? 0), 0) / others.length : 0;
          const avgCPA = others.length
            ? others.reduce((s, e) => s + (latestMetrics(e)?.cpa ?? 0), 0) / others.length : 0;

          const ctrLift = winnerCTR - avgCTR;
          const cpaLift = avgCPA   - winnerCPA;
          const testScore = ctrLift + (cpaLift > 0 ? cpaLift : 0);

          if (winnerCTR > 0 || winnerCPA > 0) {
            map[key].score += testScore;
            anyMetrics = true;
          }
        });

      const entries = Object.entries(map);
      if (!entries.length) return [] as [string, Bucket][];

      // Sort by score if we have real metrics, else by count
      return entries.sort((a, b) =>
        anyMetrics ? b[1].score - a[1].score : b[1].count - a[1].count
      ).map(([k, v]) => [k, { ...v, hasMetrics: anyMetrics }] as [string, Bucket & { hasMetrics: boolean }]);
    };

    const totalLearnings = tests.filter((t: any) => t.learning?.winnerVariantId).length;
    if (!totalLearnings) return null;

    return {
      count:      totalLearnings,
      topHooks:   scoreBy("hook"),
      topFormats: scoreBy("format"),
      topCTAs:    scoreBy("cta"),
    };
  }, [rawTests, analyticsExps]);

  // ── Action recommendations derived from aggregation ─────────────────────────
  const actionRecs = useMemo(() => {
    if (!learningAggregation) return null;
    type Rec = { field: string; value: string; score: number; count: number };
    const scale: Rec[] = [];
    const focus: Rec[] = [];
    const avoid: Rec[] = [];

    const sources = [
      { field: "Hook",   entries: learningAggregation.topHooks   },
      { field: "Format", entries: learningAggregation.topFormats },
      { field: "CTA",    entries: learningAggregation.topCTAs    },
    ] as const;

    sources.forEach(({ field, entries }) => {
      (entries as [string, { score: number; count: number; hasMetrics: boolean }][]).forEach(([value, b]) => {
        if (b.score > 0 && b.count >= 3) scale.push({ field, value, score: b.score, count: b.count });
        else if (b.score > 0 && b.count < 3)  focus.push({ field, value, score: b.score, count: b.count });
        else if (b.hasMetrics && b.score <= 0 && b.count >= 3) avoid.push({ field, value, score: b.score, count: b.count });
      });
    });

    // Sort each bucket descending by score magnitude, cap at 2
    scale.sort((a, b) => b.score - a.score);
    focus.sort((a, b) => b.score - a.score);
    avoid.sort((a, b) => a.score - b.score);

    const any = scale.length || focus.length || avoid.length;
    if (!any) return null;

    return {
      scale: scale.slice(0, 2),
      focus: focus.slice(0, 2),
      avoid: avoid.slice(0, 2),
    };
  }, [learningAggregation]);

  // ── Winning Patterns — best transitions across all iteration chains ───────────
  const winningPatterns = useMemo(() => {
    const tests = rawTests ?? [];
    const impactMap: Record<string, number> = {};
    const countMap:  Record<string, number> = {};

    tests.forEach((t: any) => {
      if (!t.parentTestId) return;

      const gt        = allGroupedTests.find(g => g.testId === t.id);
      const winnerVId: string | null = t.learning?.winnerVariantId ?? null;
      const winner    = winnerVId && gt
        ? gt.variants.find((v: Variant) => v.variantId === winnerVId) : null;

      const parentRt      = tests.find((p: any) => p.id === t.parentTestId);
      const parentGt      = allGroupedTests.find(g => g.testId === t.parentTestId);
      const parentWinVId: string | null = parentRt?.learning?.winnerVariantId ?? null;
      const parentWinner  = parentWinVId && parentGt
        ? parentGt.variants.find((v: Variant) => v.variantId === parentWinVId) : null;

      if (!winner || !parentWinner) return;

      // Detect primary change (Hook > Format > CTA)
      let label: string | null = null;
      if (parentWinner.hookType       !== winner.hookType       && winner.hookType)
        label = `Hook: ${parentWinner.hookType} \u2192 ${winner.hookType}`;
      else if (parentWinner.creativeFormat !== winner.creativeFormat && winner.creativeFormat)
        label = `Format: ${parentWinner.creativeFormat} \u2192 ${winner.creativeFormat}`;
      else if (parentWinner.cta !== winner.cta && winner.cta)
        label = `CTA: ${parentWinner.cta} \u2192 ${winner.cta}`;
      if (!label) return;

      const currCTR = latestMetrics(winner)?.ctr ?? null;
      const prevCTR = latestMetrics(parentWinner)?.ctr ?? null;
      const impact  = (currCTR != null && prevCTR != null) ? currCTR - prevCTR : 0;

      impactMap[label] = (impactMap[label] ?? 0) + impact;
      countMap[label]  = (countMap[label]  ?? 0) + 1;
    });

    const entries = Object.entries(impactMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, impact]) => ({ label, impact, count: countMap[label] ?? 1 }));

    return entries.length > 0 ? entries : null;
  }, [rawTests, allGroupedTests, analyticsExps]);

  const selectedExp = displayExperiments.find(e => e.id === selectedExpId) ?? null;

  function iterateWinner(exp: Variant) {
    // Write directly — setRawData → useLayoutEffect may not fire before navigate unmounts
    try {
      const key = projectKey("lab:experiments");
      const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify(
        raw.map((e: any) => e.id === exp.id ? { ...e, isIterated: true, status: "Iterated" } : e)
      ));
      window.dispatchEvent(new CustomEvent("clb:write"));
    } catch { /* noop */ }
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
    }));
    navigate("/creative-iteration");
  }

  function startNextIteration(winnerVariantId: string, nextType: IterationType) {
    // Look up the full winner variant so we can prefill the iteration engine
    const winnerExp = experiments.find(e => e.variantId === winnerVariantId);
    localStorage.setItem(projectKey("iteration:pending"), JSON.stringify({
      hookType:       winnerExp?.hookType       ?? "",
      primaryAngle:   winnerExp?.primaryAngle   ?? "",
      creativeFormat: winnerExp?.creativeFormat  ?? "",
      ctaStyle:       winnerExp?.cta            ?? "",
      roas:           "",
      adVariant:      winnerExp?.adVariant      ?? winnerVariantId,
      variantId:      winnerVariantId,
      experimentId:   winnerExp?.id             ?? "",
      iterationType:  nextType,
      adType:         (winnerExp as any)?.adType ?? "video",
    }));
    navigate("/creative-iteration");
  }

  // ── Launch iteration directly from an action recommendation ─────────────────
  function launchFromRec(field: string, value: string, score: number, count: number, reason: "Focus" | "Scale") {
    const varProp =
      field === "Hook"   ? "hookType"       :
      field === "Format" ? "creativeFormat" :
                           "cta";
    const iterType = (NEXT_ITER_TYPE[field.toUpperCase()] ?? "HOOK") as IterationType;

    // Find the most-recent winning variant that has this field value
    const tests = (rawTests ?? []) as any[];
    let sourceExp: Variant | undefined;
    for (const t of tests) {
      if (!t.learning?.winnerVariantId) continue;
      const winner = experiments.find(e => e.variantId === t.learning.winnerVariantId);
      if (winner && (winner as any)[varProp] === value) { sourceExp = winner; break; }
    }

    const confidence = count >= 5 ? "high" : count >= 3 ? "medium" : "low";

    localStorage.setItem(projectKey("iteration:pending"), JSON.stringify({
      hookType:       sourceExp?.hookType       ?? "",
      primaryAngle:   sourceExp?.primaryAngle   ?? "",
      creativeFormat: sourceExp?.creativeFormat ?? "",
      ctaStyle:       sourceExp?.cta            ?? "",
      roas:           "",
      adVariant:      sourceExp?.adVariant      ?? "",
      variantId:      sourceExp?.variantId      ?? "",
      experimentId:   sourceExp?.id             ?? "",
      iterationType:  iterType,
      context: {
        field:      field.toLowerCase() as "hook" | "format" | "cta",
        value,
        impact:     score,
        confidence,
        reason,
      },
    }));
    navigate("/creative-iteration");
  }

  const hookGroups   = useMemo(() => groupBy(analyticsExps, "hookType"),       [analyticsExps]);
  const angleGroups  = useMemo(() => groupBy(analyticsExps, "primaryAngle"),   [analyticsExps]);
  const formatGroups = useMemo(() => groupBy(analyticsExps, "creativeFormat"), [analyticsExps]);
  const ctaGroups    = useMemo(() => groupBy(analyticsExps, "cta"),            [analyticsExps]);

  const topHook   = hookGroups[0];
  const topFormat = formatGroups[0];
  const topCTA    = ctaGroups[0];
  const botHook   = hookGroups[hookGroups.length - 1];
  const botFormat = formatGroups[formatGroups.length - 1];

  const winners  = analyticsExps.filter(e => e.status === "Winner");
  // Win rate only counts variants that have reached the testing phase (Testing/Winner/Loser/Iterate)
  const testedCount = analyticsExps.filter(e => ["Testing","Winner","Loser","Iterate"].includes(e.status)).length;
  const winRate  = testedCount ? Math.round((winners.length / testedCount) * 100) : 0;

  // ── AUTO WINNER DETECTION ────────────────────────────────────────────────────
  // Needs ≥ 2 real experiments; excludes rows already manually marked Winner/Loser.
  const winnerCandidateId = useMemo(() => {
    if (isDemo || experiments.length < 2) return null;
    const pool = experiments.filter(e => {
      const m = latestMetrics(e);
      return e.status === "Testing" && m && (m.ctr > 0 || m.cpa > 0);
    });
    if (pool.length < 1) return null;

    const metOf = (e: Variant) => latestMetrics(e)!;
    const byCTR = [...pool].sort((a, b) => metOf(b).ctr - metOf(a).ctr);
    const withCPA = pool.filter(e => metOf(e).cpa > 0);
    const byCPA   = [...withCPA].sort((a, b) => metOf(a).cpa - metOf(b).cpa);

    const scores: Record<string, number> = {};
    pool.forEach(e => { scores[e.id] = 0; });
    byCTR.forEach((e, i) => { scores[e.id] += i * 1.5; });
    byCPA.forEach((e, i) => { scores[e.id] += i; });

    const best = [...pool].sort((a, b) => scores[a.id] - scores[b.id])[0];
    return best?.id ?? null;
  }, [experiments, isDemo]);

  // ── CREATIVE PATTERN DNA ─────────────────────────────────────────────────────
  const topAngle = angleGroups[0];

  const creativeDNA = useMemo(() => {
    if (analyticsExps.length < 2) return null;

    const hookBarMax   = Math.max(...hookGroups.map(g => g.avgCTR),   0.01);
    const angleBarMax  = Math.max(...angleGroups.map(g => g.avgCTR),  0.01);
    const formatBarMax = Math.max(...formatGroups.map(g => g.avgTSR), 0.01);

    const usedAngles  = new Set(analyticsExps.map(e => e.primaryAngle));
    const usedFormats = new Set(analyticsExps.map(e => e.creativeFormat));
    const usedHooks   = new Set(analyticsExps.map(e => e.hookType));

    const nextAngle  = ANGLES.find(a => !usedAngles.has(a))   ?? angleGroups[1]?.key  ?? null;
    const nextFormat = FORMATS.find(f => !usedFormats.has(f)) ?? formatGroups[1]?.key ?? null;
    const nextHook   = HOOK_TYPES.find(h => !usedHooks.has(h)) ?? hookGroups[1]?.key  ?? null;

    const recs: { rotate: string; next: string; keep: string[]; color: string; hypothesis: string }[] = [];

    if (activeAdType === "static") {
      recs.push({
        rotate: "Headline",
        next: nextFormat ?? "New Headline",
        keep: [topAngle?.key ?? "—", formatGroups[0]?.key ?? "—"].filter(Boolean),
        color: "#f59e0b",
        hypothesis: `Keep your best angle and visual locked. Test a new headline variant to see if different opening copy lifts CTR.`,
      });
      recs.push({
        rotate: "Visual",
        next: nextHook ?? "New Visual",
        keep: [hookGroups[0]?.key ?? "—", topAngle?.key ?? "—"].filter(Boolean),
        color: "#6366f1",
        hypothesis: `Proven headline and angle are locked. Test a new visual execution — image style, layout, or creative treatment can unlock higher CTR.`,
      });
      recs.push({
        rotate: "Angle",
        next: nextAngle ?? "New Angle",
        keep: [hookGroups[0]?.key ?? "—", formatGroups[0]?.key ?? "—"].filter(Boolean),
        color: "#8b5cf6",
        hypothesis: `Headline and visual are validated. Challenge the angle — a different emotional positioning can expand your audience reach.`,
      });
    } else {
      if (nextAngle && hookGroups[0] && formatGroups[0]) recs.push({
        rotate: "Angle", next: nextAngle,
        keep:  [hookGroups[0].key, formatGroups[0].key],
        color: "#f59e0b",
        hypothesis: `Keep your best hook and format locked. Swap to a ${nextAngle} angle to test if a different emotional driver lifts CTR.`,
      });
      if (nextFormat && hookGroups[0] && angleGroups[0]) recs.push({
        rotate: "Format", next: nextFormat,
        keep:  [hookGroups[0].key, angleGroups[0].key],
        color: "#6366f1",
        hypothesis: `Proven hook and angle are locked. Try ${nextFormat} creative — a new format can unlock higher Thumb-Stop with the same message.`,
      });
      if (nextHook && angleGroups[0] && formatGroups[0]) recs.push({
        rotate: "Hook", next: nextHook,
        keep:  [angleGroups[0].key, formatGroups[0].key],
        color: "#8b5cf6",
        hypothesis: `Angle and format are validated. Challenge your current winner with a ${nextHook} opening — hooks are the highest-leverage variable.`,
      });
    }

    return {
      topHook:   hookGroups[0]   ? { ...hookGroups[0],   barPct: Math.min((hookGroups[0].avgCTR   / hookBarMax)   * 100, 100) } : null,
      topAngle:  angleGroups[0]  ? { ...angleGroups[0],  barPct: Math.min((angleGroups[0].avgCTR  / angleBarMax)  * 100, 100) } : null,
      topFormat: formatGroups[0] ? { ...formatGroups[0], barPct: Math.min((formatGroups[0].avgTSR / formatBarMax) * 100, 100) } : null,
      recommendations: recs.slice(0, 3),
      experimentCount: analyticsExps.length,
    };
  }, [analyticsExps, hookGroups, angleGroups, formatGroups, activeAdType, topAngle]);

  // ── STATIC DNA HELPERS ───────────────────────────────────────────────────────
  const topHeadlineDNA = useMemo(() => {
    const groups = groupBy(analyticsExps as any, "headline" as any);
    if (!groups.length) return null;
    const barMax = Math.max(...groups.map(g => g.avgCTR), 0.01);
    return { ...groups[0], barPct: Math.min((groups[0].avgCTR / barMax) * 100, 100) };
  }, [analyticsExps]);

  const topVisualDNA = useMemo(() => {
    const groups = groupBy(analyticsExps as any, "visualConcept" as any);
    if (!groups.length) return null;
    const barMax = Math.max(...groups.map(g => g.avgCTR), 0.01);
    return { ...groups[0], barPct: Math.min((groups[0].avgCTR / barMax) * 100, 100) };
  }, [analyticsExps]);

  // ── INSIGHTS ─────────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { text: string; delta: string; positive: boolean; color: string }[] = [];
    if (hookGroups.length >= 2) {
      const d = delta(topHook.avgCTR, hookGroups[1].avgCTR);
      if (Math.abs(d) > 5) {
        list.push({
          text: `${topHook.key} hooks outperform ${hookGroups[1].key} by ${Math.abs(d)}% in CTR.`,
          delta: `+${Math.abs(d)}% CTR`, positive: true, color: "#8b5cf6",
        });
      }
    }
    if (formatGroups.length >= 2 && botFormat.key !== topFormat.key) {
      const d = delta(topFormat.avgTSR, botFormat.avgTSR);
      if (Math.abs(d) > 5) {
        list.push({
          text: `${topFormat.key} creative generates ${Math.abs(d)}% higher Thumb-Stop than ${botFormat.key}.`,
          delta: `+${Math.abs(d)}% TSR`, positive: true, color: "#6366f1",
        });
      }
    }
    if (analyticsExps.length >= 3) {
      const withCPA = analyticsExps.filter(e => (latestMetrics(e)?.cpa ?? 0) > 0);
      if (withCPA.length) {
        const bestCPAExp = [...withCPA].sort((a, b) => (latestMetrics(a)?.cpa ?? 999) - (latestMetrics(b)?.cpa ?? 999))[0];
        const cpa = latestMetrics(bestCPAExp)!.cpa;
        list.push({
          text: `${bestCPAExp.hookType} + ${bestCPAExp.creativeFormat} combination produces the lowest CPA at $${cpa.toFixed(0)}.`,
          delta: `$${cpa.toFixed(0)} CPA`, positive: true, color: "#10b981",
        });
      }
    }
    if (winRate > 0) {
      list.push({
        text: `${winRate}% of tested variants are Winners. ${100 - winRate}% still need iteration or have been cut.`,
        delta: `${winners.length} of ${testedCount} tested`, positive: winRate >= 33, color: "#f59e0b",
      });
    }
    return list;
  }, [hookGroups, formatGroups, topHook, topFormat, botFormat, botHook, winRate, winners.length, testedCount, analyticsExps]);

  // ── PATTERN MEMORY ───────────────────────────────────────────────────────────
  const patternMemory = useMemo<PatternMemoryResult | null>(
    () => computePatternMemory(analyticsExps),
    [analyticsExps],
  );

  // ── DECISION ENGINE ──────────────────────────────────────────────────────────
  const decisionVariants = useMemo<DecisionVariant[]>(() =>
    analyticsExps
      .map(e => {
        const m = latestMetrics(e);
        if (!m) return null;
        return { id: e.id, metrics: { ctr: m.ctr, holdRate: m.hold, cpa: m.cpa ?? undefined } };
      })
      .filter((v): v is DecisionVariant => v !== null),
    [analyticsExps],
  );

  const decisionState    = useMemo(() => classifyTestState(decisionVariants), [decisionVariants]);
  const recommendation   = useMemo(() => getNextAction(decisionState),        [decisionState]);

  // ── NEXT SUGGESTIONS ─────────────────────────────────────────────────────────
  const winnerHook      = winners.length ? winners[0].hookType         : topHook?.key        ?? null;
  const winnerFormat    = winners.length ? winners[0].creativeFormat   : topFormat?.key      ?? null;
  const winnerCTA       = winners.length ? winners[0].cta              : topCTA?.key         ?? null;
  const winnerHeadline  = winners.length ? (winners[0] as any).headline ?? null      : topHeadlineDNA?.key ?? null;
  const winnerVisual    = winners.length ? (winners[0] as any).visualConcept ?? null : topVisualDNA?.key   ?? null;
  const winnerAngle     = winners.length ? winners[0].primaryAngle     : topAngle?.key       ?? null;

  // ── PENDING DECISIONS ─────────────────────────────────────────────────────────
  const pendingDecisions = [...analyticsExps]
    .filter(e => e.status === "Testing" && e.timeline.length > 0)
    .sort((a, b) => (latestMetrics(a)?.ctr ?? 0) - (latestMetrics(b)?.ctr ?? 0))
    .slice(0, 4);

  // ── FORM FIELD STYLE ─────────────────────────────────────────────────────────
  const inputCls = "w-full bg-background/60 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15";
  const numCls   = `${inputCls} text-right font-mono tabular-nums`;

  return (
    <PageTransition>
      <div className="flex flex-col gap-12 pb-20">

        {/* HEADER */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            Experiment Tracker
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold mt-4 mb-3">Creative Lab</h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Log every ad experiment, track performance metrics, and let the data reveal your winning creative patterns.
          </p>
        </motion.div>

        {/* ══ SECTION 1 — ACTIVE EXPERIMENTS ══════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
          <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">Active Experiments</h2>
              {isDemo ? (
                <p className="text-sm text-muted-foreground">
                  No experiments yet —{" "}
                  <span className="text-primary/70">add your first one to get started</span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {analyticsExps.length} experiment{analyticsExps.length !== 1 ? "s" : ""} logged
                  &nbsp;·&nbsp;
                  {winners.length} winner{winners.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button onClick={() => showTestForm ? cancelTestCreation() : openTestCreation()} size="sm"
              className="gap-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-primary"
              variant="ghost"
            >
              {showTestForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />Add Experiment</>}
            </Button>
          </div>

          {/* ── AD TYPE TABS ────────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 mb-4">
            {(["video", "static"] as const).map(type => (
              <button
                key={type}
                onClick={() => { setActiveAdType(type); setSelectedExpId(null); }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
                  activeAdType === type
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "border-white/8 text-muted-foreground/40 hover:text-muted-foreground/70 hover:border-white/15 bg-transparent"
                }`}
              >
                {type === "video" ? "Video Ads" : "Static Ads"}
              </button>
            ))}
          </div>

          {/* ── CONFIRMATION TOAST ──────────────────────────────────────────────── */}
          <AnimatePresence>
            {addToTestConfirmation && (
              <motion.div key="add-confirm"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className="mb-3 flex items-center gap-2 px-3.5 py-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-400 text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                {addToTestConfirmation}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TEST FORM (New OR Add-to-Existing) ──────────────────────────────── */}
          <AnimatePresence>
            {showTestForm && (
              <motion.div key="test-form"
                initial={{ opacity: 0, y: -8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }} transition={{ duration: 0.22 }}
                className="mb-5"
              >
                <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
                  <div className="h-0.5 bg-gradient-to-r from-primary/60 via-violet-500/30 to-transparent" />
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-primary" />
                        {testFormMode === "new" ? "New Test" : "Add to Existing Test"}
                      </CardTitle>
                      {/* Mode toggle */}
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/8">
                        {(["new", "existing"] as const).map(mode => (
                          <button
                            key={mode}
                            onClick={() => { setTestFormMode(mode); setSelectedExistingTestId(""); }}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                              testFormMode === mode
                                ? "bg-primary/20 text-primary border border-primary/25"
                                : "text-muted-foreground/50 hover:text-muted-foreground/80"
                            }`}
                          >
                            {mode === "new" ? "Create New Test" : "Add to Existing"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5 flex flex-col gap-5">

                    {/* ── MODE: NEW TEST ── test name + platform */}
                    {testFormMode === "new" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Test Name <span className="normal-case font-normal opacity-50">(optional)</span></label>
                          <input className={inputCls} placeholder="e.g. Hook Angle Test — Feb"
                            value={testDraftName}
                            onChange={e => setTestDraftName(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                            Platform <span className="text-red-400/70 font-bold">*</span>
                          </label>
                          <AppDropdown
                            value={testDraftPlatform}
                            onChange={setTestDraftPlatform}
                            options={TEST_PLATFORM_OPTS}
                            placeholder="Select platform…"
                          />
                        </div>
                      </div>
                    )}

                    {/* ── MODE: EXISTING TEST ── test selector */}
                    {testFormMode === "existing" && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Select Test</label>
                        {eligibleTestsForAdding.length === 0 ? (
                          <p className="text-xs text-muted-foreground/40 py-2">
                            No tests in Draft or Producing status. Create a new test first.
                          </p>
                        ) : (
                          <AppDropdown
                            value={selectedExistingTestId}
                            onChange={setSelectedExistingTestId}
                            options={eligibleTestsForAdding.map(t => t.testId)}
                            placeholder="Choose a test…"
                          />
                        )}
                        {selectedExistingTestId && (() => {
                          const t = eligibleTestsForAdding.find(t => t.testId === selectedExistingTestId);
                          return t ? (
                            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                              Currently {t.variantCount} variant{t.variantCount !== 1 ? "s" : ""}
                            </p>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* ── Static prefill notice ── */}
                    {activeAdType === "static" && staticPrefillNotice && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] text-xs text-amber-400">
                        <span className="text-base leading-none">🖼</span>
                        <span>{staticPrefillNotice}</span>
                      </div>
                    )}

                    {/* ── SHARED: Ad Slots ── */}
                    <div className="flex flex-col gap-4">
                      {testDraftAds.map((ad, i) => (
                        <div key={i} className="relative rounded-lg border border-white/8 bg-white/[0.02] p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/40">Ad {i + 1}</span>
                            {testDraftAds.length > 1 && (
                              <button onClick={() => removeTestAdSlot(i)}
                                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              ><X className="w-3 h-3" /></button>
                            )}
                          </div>
                          {activeAdType === "static" ? (
                            <div className="flex flex-col gap-3 mb-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="col-span-2 md:col-span-1 flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Headline</label>
                                  <input className={inputCls} placeholder="e.g. Stop losing leads to competitors"
                                    value={(ad as any).headline ?? ""} onChange={e => updateTestAd(i, "headline" as any, e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Visual Concept</label>
                                  <input className={inputCls} placeholder="e.g. Split-screen: before vs after"
                                    value={(ad as any).visualConcept ?? ""} onChange={e => updateTestAd(i, "visualConcept" as any, e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Angle</label>
                                  <AppDropdown value={ad.primaryAngle} onChange={v => updateTestAd(i, "primaryAngle", v)} options={ANGLES} />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Copy</label>
                                <textarea rows={2} className={`${inputCls} resize-none`}
                                  placeholder="Body text shown under the image..."
                                  value={(ad as any).adCopy ?? ""} onChange={e => updateTestAd(i, "adCopy" as any, e.target.value)} />
                              </div>
                            </div>
                          ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                            <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Ad Variant</label>
                              <input className={inputCls} placeholder="e.g. Bold Claim UGC"
                                value={ad.adVariant} onChange={e => updateTestAd(i, "adVariant", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Hook Type</label>
                              <AppDropdown value={ad.hookType} onChange={v => updateTestAd(i, "hookType", v)} options={HOOK_TYPES} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Primary Angle</label>
                              <AppDropdown value={ad.primaryAngle} onChange={v => updateTestAd(i, "primaryAngle", v)} options={ANGLES} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Format</label>
                              <AppDropdown value={ad.creativeFormat} onChange={v => updateTestAd(i, "creativeFormat", v)} options={FORMATS} />
                            </div>
                          </div>
                          )}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">CTA</label>
                              <AppDropdown value={ad.cta} onChange={v => updateTestAd(i, "cta", v)} options={CTA_TYPES} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</label>
                              <AppDropdown value={ad.status} onChange={v => updateTestAd(i, "status", v as Status)} options={STATUS_OPTS} />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Start Date</label>
                              <input type="date" className={inputCls}
                                value={ad.startDate} onChange={e => updateTestAd(i, "startDate", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button onClick={addTestAdSlot}
                      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/60 hover:text-primary transition-colors py-1 self-start"
                    >
                      <Plus className="w-3.5 h-3.5" />Add Another Ad
                    </button>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1 border-t border-white/6">
                      <Button variant="ghost" size="sm" onClick={cancelTestCreation}
                        className="text-muted-foreground hover:text-foreground border-white/10"
                      >Cancel</Button>

                      {testFormMode === "new" ? (
                        <Button size="sm" onClick={saveNewTest}
                          disabled={
                            (activeAdType === "static"
                              ? !testDraftAds.some(a => a.headline?.trim())
                              : !testDraftAds.some(a => a.adVariant.trim())
                            ) || !testDraftPlatform
                          }
                          className="gap-1.5 bg-primary/15 border border-primary/25 hover:bg-primary/25 text-primary hover:text-primary"
                          variant="ghost"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                          {(() => {
                            const count = activeAdType === "static"
                              ? testDraftAds.filter(a => a.headline?.trim() || a.adVariant.trim()).length
                              : testDraftAds.filter(a => a.adVariant.trim()).length;
                            return `Create Test (${count} ad${count !== 1 ? "s" : ""})`;
                          })()}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={addAdToExistingTest}
                          disabled={!testDraftAds.some(a => a.adVariant.trim()) || !selectedExistingTestId}
                          className="gap-1.5 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300"
                          variant="ghost"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add {testDraftAds.filter(a => a.adVariant.trim()).length} ad{testDraftAds.filter(a => a.adVariant.trim()).length !== 1 ? "s" : ""}
                          {selectedExistingTestId ? ` to ${selectedExistingTestId}` : " to Test"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BRANCH / ITERATION FORM (single ad, triggered from table row) ── */}
          <AnimatePresence>
            {showForm && (
              <motion.div key="branch-form"
                initial={{ opacity: 0, y: -8, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.99 }} transition={{ duration: 0.22 }}
                className="mb-5"
              >
                <Card className="overflow-hidden border-emerald-500/25 bg-emerald-500/[0.03]">
                  <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-emerald-400" />New Iteration of {pendingParentVariantId}
                      </CardTitle>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-bold"
                        style={{ background: "#10b98115", borderColor: "#10b98130", color: "#10b981" }}
                      >
                        <span className="text-[9px] font-sans font-black uppercase tracking-widest opacity-60 mr-0.5">ID</span>
                        {previewVariantId}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                      <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Ad Variant</label>
                        <input className={inputCls} placeholder="e.g. V7 — Bold Claim UGC"
                          value={form.adVariant} onChange={e => updateForm("adVariant", e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Hook Type</label>
                        <AppDropdown value={form.hookType} onChange={v => updateForm("hookType", v)} options={HOOK_TYPES} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Primary Angle</label>
                        <AppDropdown value={form.primaryAngle} onChange={v => updateForm("primaryAngle", v)} options={ANGLES} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Format</label>
                        <AppDropdown value={form.creativeFormat} onChange={v => updateForm("creativeFormat", v)} options={FORMATS} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">CTA</label>
                        <AppDropdown value={form.cta} onChange={v => updateForm("cta", v)} options={CTA_TYPES} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</label>
                        <AppDropdown value={form.status} onChange={v => updateForm("status", v as Status)} options={STATUS_OPTS} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Start Date</label>
                        <input type="date" value={form.startDate}
                          onChange={e => updateForm("startDate", e.target.value)} className={inputCls} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-[10px] text-muted-foreground/35 leading-tight">
                          Metrics are tracked via the Timeline after creation.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={closeForm}
                        className="text-muted-foreground hover:text-foreground border-white/10"
                      >Cancel</Button>
                      <Button size="sm" onClick={() => addExperiment()} disabled={!form.adVariant.trim()}
                        className="gap-1.5 bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300"
                        variant="ghost"
                      >
                        <GitBranch className="w-3.5 h-3.5" />Save Iteration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Learning Aggregation summary ───────────────────────────────── */}
          {learningAggregation && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-yellow-500/15 bg-yellow-500/[0.04] flex flex-wrap items-start gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400/70" />
                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60">
                  Top Learnings
                </span>
                <span className="text-[9px] font-semibold text-muted-foreground/30">
                  across {learningAggregation.count} test{learningAggregation.count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {([
                  { label: "Hook",   entries: learningAggregation.topHooks   },
                  { label: "Format", entries: learningAggregation.topFormats },
                  { label: "CTA",    entries: learningAggregation.topCTAs    },
                ] as const).map(({ label, entries }) => {
                  if (!entries[0]) return null;
                  const [value, bucket] = entries[0] as [string, { score: number; count: number; hasMetrics: boolean }];
                  const conf =
                    bucket.count >= 5 ? { label: "High",   color: "#10b981" } :
                    bucket.count >= 3 ? { label: "Medium", color: "#f59e0b" } :
                                        { label: "Low",    color: "#94a3b8" };
                  return (
                    <div key={label} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35">{label}</span>
                        <span className="text-[11px] font-semibold text-foreground/75">{value}</span>
                        {bucket.hasMetrics && (
                          <span className="text-[9px] font-bold tabular-nums"
                            style={{ color: bucket.score > 0 ? "rgb(250 204 21 / 0.65)" : "rgb(148 163 184 / 0.4)" }}>
                            {bucket.score > 0 ? `+${bucket.score.toFixed(1)}` : "0.0"} impact
                          </span>
                        )}
                        {!bucket.hasMetrics && bucket.count > 1 && (
                          <span className="text-[9px] font-bold text-yellow-400/50 tabular-nums">×{bucket.count}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-semibold tabular-nums"
                          style={{ color: conf.color + "99" }}>
                          {conf.label} confidence
                        </span>
                        <span className="text-[8px] text-muted-foreground/25 tabular-nums">
                          ({bucket.count} test{bucket.count !== 1 ? "s" : ""})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Action Layer ── */}
          {actionRecs && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {([
                {
                  key:     "scale",
                  items:    actionRecs.scale,
                  label:    "Scale this",
                  sub:      "Best performing across tests",
                  nextStep: "Use this as your baseline for the next test",
                  dot:      "#10b981",
                  border:   "border-emerald-500/30",
                  bg:       "bg-emerald-500/[0.09]",
                  head:     "text-emerald-400",
                  sub_c:    "text-emerald-500/55",
                  step_c:   "text-emerald-400/40",
                  btnText:  "Start scaling \u2192",
                },
                {
                  key:      "focus",
                  items:    actionRecs.focus,
                  label:    "Test next",
                  sub:      "Promising but not proven yet",
                  nextStep: "Validate this before scaling",
                  dot:      "#8b5cf6",
                  border:   "border-violet-500/20",
                  bg:       "bg-violet-500/[0.05]",
                  head:     "text-violet-400/90",
                  sub_c:    "text-violet-500/45",
                  step_c:   "text-violet-400/35",
                  btnText:  "Test this next \u2192",
                },
                {
                  key:      "avoid",
                  items:    actionRecs.avoid,
                  label:    "Stop using",
                  sub:      "Consistently underperforming",
                  nextStep: "Stop testing this variable",
                  dot:      "#ef4444",
                  border:   "border-red-500/20",
                  bg:       "bg-red-500/[0.05]",
                  head:     "text-red-400/80",
                  sub_c:    "text-red-500/40",
                  step_c:   "text-red-400/35",
                  btnText:  "",
                },
              ] as const).map(col => (
                <div key={col.key} className={`rounded-xl border ${col.border} ${col.bg} px-3.5 py-3 flex flex-col gap-2`}>
                  {/* Column header */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col.dot }} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${col.head}`}>{col.label}</span>
                      {col.key === "scale" && (
                        <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                          style={{ background:"#10b98120", color:"#10b981CC", border:"1px solid #10b98135" }}>
                          Top performer
                        </span>
                      )}
                    </div>
                    <p className={`text-[8px] font-medium leading-snug ${col.sub_c} pl-3`}>{col.sub}</p>
                  </div>
                  {/* Divider */}
                  <div className="h-px" style={{ background: col.dot + "20" }} />
                  {/* Items */}
                  {col.items.length === 0 ? (
                    <span className="text-[9px] text-muted-foreground/20 italic">None yet</span>
                  ) : col.items.map(r => (
                    <div key={r.field + r.value} className="flex flex-col gap-1.5">
                      {/* Value name — Scale gets heavier treatment */}
                      <span className={`font-bold leading-tight ${col.key === "scale" ? "text-[12px] text-foreground/90" : "text-[11px] text-foreground/75"}`}>
                        {r.value}
                      </span>
                      {/* Context row — differs per bucket */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border"
                          style={{ background: col.dot + "12", color: col.dot + "CC", borderColor: col.dot + "30" }}>
                          {r.field}
                        </span>
                        {col.key === "avoid" ? (
                          <>
                            <span className="text-[9px] font-bold tabular-nums text-red-400/80">
                              {r.score.toFixed(1)} impact
                            </span>
                            <span className="text-[8px] text-red-400/45 font-medium">
                              Lost {r.count} {r.count === 1 ? "test" : "tests"}
                            </span>
                          </>
                        ) : col.key === "focus" ? (
                          <>
                            <span className="text-[9px] font-bold tabular-nums" style={{ color: col.dot + "CC" }}>
                              +{r.score.toFixed(1)} impact
                            </span>
                            <span className="text-[8px] font-semibold" style={{ color: col.dot + "80" }}>
                              Only {r.count} {r.count === 1 ? "test" : "tests"} — needs validation
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[9px] font-bold tabular-nums" style={{ color: col.dot }}>
                              +{r.score.toFixed(1)} impact
                            </span>
                            <span className="text-[8px] text-muted-foreground/40 font-medium">
                              Won {r.count} {r.count === 1 ? "test" : "tests"}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Next step framing */}
                      <p className={`text-[8px] font-semibold italic leading-snug ${col.step_c}`}>
                        {col.nextStep}
                      </p>
                      {/* Action button */}
                      {col.btnText && (
                        <button
                          onClick={() => launchFromRec(r.field, r.value, r.score, r.count, col.key === "focus" ? "Focus" : "Scale")}
                          className="self-start text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all hover:brightness-125 active:scale-95"
                          style={{
                            borderColor: col.dot + "45",
                            color:       col.dot + "E0",
                            background:  col.dot + "18",
                          }}
                        >
                          {col.btnText}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Winning Patterns ── */}
          {winningPatterns && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.025] flex flex-wrap items-start gap-x-6 gap-y-2">
              <div className="flex items-center gap-1.5 shrink-0 w-full mb-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400/60" />
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400/60">Winning Patterns</span>
                <span className="text-[9px] font-semibold text-muted-foreground/25">best transitions across chains</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 w-full">
                {winningPatterns.map((p, i) => {
                  const barMax  = winningPatterns[0].impact || 1;
                  const barPct  = Math.max(0, Math.min(100, (p.impact / barMax) * 100));
                  const impactColor = p.impact > 0.05 ? "#10b981" : p.impact < -0.05 ? "#ef4444" : "#94a3b8";
                  const conf      = p.count >= 5 ? "High" : p.count >= 3 ? "Medium" : "Low";
                  const confColor = p.count >= 5 ? "#10b981" : p.count >= 3 ? "#f59e0b" : "#94a3b8";
                  return (
                    <div key={p.label} className="flex items-center gap-3 min-w-0">
                      <span className="text-[9px] font-black text-muted-foreground/30 tabular-nums w-3 shrink-0">{i + 1}</span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderTransitionLabel(p.label, "text-[11px]")}
                          <span className="text-[9px] font-bold tabular-nums shrink-0" style={{ color: impactColor }}>
                            {p.impact > 0 ? `+${p.impact.toFixed(1)}` : p.impact.toFixed(1)} impact
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-semibold tabular-nums shrink-0" style={{ color: confColor }}>
                            {conf} confidence ({p.count}{p.count === 1 ? "" : "\u00d7"})
                          </span>
                          <div className="h-0.5 rounded-full bg-white/5 w-20 overflow-hidden shrink-0">
                            <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: impactColor + "60" }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Filter + Sort bar ── */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mr-1">Filter</span>
              <FilterChip label="Status"   value={filterStatus}   onChange={setFilterStatus}   options={STATUS_OPTS}    color="#8b5cf6" />
              <FilterChip label="Platform" value={filterPlatform} onChange={setFilterPlatform} options={PLATFORM_OPTS}  color="#6366f1" />
              {activeFiltersCount > 0 && (
                <button onClick={clearFilters} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-red-400/70 hover:text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
                  <X className="w-2.5 h-2.5" />Clear all ({activeFiltersCount})
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Sort</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 bg-white/[0.03] text-muted-foreground/60 hover:bg-white/[0.06] hover:text-foreground/60 transition-all whitespace-nowrap">
                    {{ variantId:"Test ID", startDate:"Created At", ctr:"Avg CTR", cpa:"Avg CPA", tsr:"TSR", hold:"Hold Rate" }[sortBy]}
                    <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-1.5 bg-[#0f1117] border-white/10 shadow-2xl w-auto min-w-[140px]" align="end" sideOffset={5} onOpenAutoFocus={e => e.preventDefault()}>
                  <div className="flex flex-col gap-0.5">
                    {([["variantId","Test ID"],["startDate","Created At"],["ctr","Avg CTR"],["cpa","Avg CPA"]] as [SortKey,string][]).map(([key, label]) => (
                      <button key={key} onClick={() => setSortBy(key)}
                        className={`flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left text-[11px] ${
                          key === sortBy ? "bg-white/[0.07] text-foreground" : "hover:bg-white/[0.04] text-foreground/70"
                        }`}
                      >{label}{key === sortBy && <Check className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <button onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
                className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center transition-colors"
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                {sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/60" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />}
              </button>
            </div>
          </div>

          {/* Empty filter state */}
          {groupedTests.length === 0 && activeFiltersCount > 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-white/8 mb-4">
              <Filter className="w-6 h-6 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground/50">No variants match your filters</p>
              <button onClick={clearFilters} className="mt-3 text-xs text-primary/60 hover:text-primary transition-colors">Clear filters</button>
            </div>
          )}

          {/* Experiments Table */}
          <Card className="border-white/10 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="border-b border-white/8">
                    {[
                      { label: "Test ID",  cls: "w-[160px]" },
                      { label: "Variants", cls: "w-[70px]" },
                      { label: "Platform", cls: "" },
                      { label: "Created",  cls: "" },
                      { label: "Author",   cls: "" },
                      { label: "Status",   cls: "w-[150px]" },
                    ].map((h, i) => (
                      <th key={i} className={`px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 ${h.cls}`}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {groupedTests.map((test, ti) => {
                      const isExpanded = expandedTests.has(test.testId);
                      const variantCount = test.variants.length;
                      const toggleExpand = () => setExpandedTests(prev => {
                        const next = new Set(prev);
                        next.has(test.testId) ? next.delete(test.testId) : next.add(test.testId);
                        return next;
                      });

                      return (
                      <Fragment key={test.testId}>
                        {/* ── Test summary row ── */}
                        <motion.tr
                          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                          transition={{ duration: 0.18, delay: ti * 0.03 }}
                          onClick={toggleExpand}
                          className="cursor-pointer hover:bg-white/[0.025] border-b border-white/5 group"
                        >
                          {/* Test ID + chevron */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={e => { e.stopPropagation(); toggleExpand(); }}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors shrink-0"
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                                  : <ChevronRight className="w-4 h-4 text-muted-foreground/60" />}
                              </button>
                              <span className="font-mono text-[11px] font-bold text-foreground/70 tracking-tight">{test.testId}</span>
                              {test.iterationType && (() => {
                                const c = ITER_TYPE_COLOR[test.iterationType] ?? "#8b5cf6";
                                return (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0"
                                    style={{ color: c, borderColor: `${c}35`, background: `${c}12` }}
                                  >{test.iterationType}</span>
                                );
                              })()}
                              {test.parentTestId && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground/30 shrink-0" title={`Derived from ${test.parentTestId}`}>
                                  <GitBranch className="w-2.5 h-2.5 text-emerald-500/40" />
                                  <span className="text-emerald-400/40">{test.parentTestId}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Variants — number only */}
                          <td className="px-3 py-3">
                            <span className="font-mono text-[13px] font-bold text-foreground/55">{variantCount}</span>
                          </td>
                          {/* Platform — static + hover edit */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            {editingPlatformTestId === test.testId ? (
                              <AppDropdown
                                value={test.testPlatform ?? ""}
                                onChange={val => {
                                  setRawData(prev => prev.map(v =>
                                    (v.testId || v.id) === test.testId ? { ...v, platform: val } : v
                                  ));
                                  setEditingPlatformTestId(null);
                                }}
                                options={TEST_PLATFORM_OPTS}
                                placeholder="—"
                                size="sm"
                                defaultOpen
                              />
                            ) : (
                              <div className="group/plat flex items-center gap-1.5">
                                <span className={test.testPlatform ? "text-[11px] font-semibold text-foreground/70" : "text-muted-foreground/20 text-xs"}>
                                  {test.testPlatform || "—"}
                                </span>
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingPlatformTestId(test.testId); }}
                                  className="opacity-0 group-hover/plat:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground/40 hover:text-foreground/70"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          {/* Created at */}
                          <td className="px-3 py-3">
                            {test.testCreatedAt
                              ? <span className="text-[11px] font-mono text-muted-foreground/50">{fmtDate(test.testCreatedAt)}</span>
                              : <span className="text-muted-foreground/20 text-xs">—</span>}
                          </td>
                          {/* Author */}
                          <td className="px-3 py-3">
                            {test.testAuthor
                              ? <span className="text-[11px] text-foreground/60">{test.testAuthor}</span>
                              : <span className="text-muted-foreground/20 text-xs">—</span>}
                          </td>
                          {/* Status — editable, propagates to all ads (except Winner/Loser) */}
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <EditableStatusCell
                              status={test.testStatus}
                              disabled={isDemo}
                              onSave={s => updateTestStatus(test.testId, s)}
                              adType={(test.variants[0] as any)?.adType}
                            />
                          </td>
                        </motion.tr>

                        {/* ── Expanded: per-ad detail sub-table ── */}
                        {isExpanded && (
                          <motion.tr
                            key={`${test.testId}-expanded`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <td colSpan={6} className="p-0 border-b border-white/8">
                              {(() => {
                                const rawTest   = (rawTests ?? []).find((t: any) => t.id === test.testId);
                                const learning  = rawTest?.learning as { winnerVariantId?: string; insight?: string; nextAction?: string } | undefined;
                                return (
                              <div className="bg-white/[0.012] border-l-2 border-primary/20 ml-8">
                                {/* ── Lineage chain ── */}
                                {test.parentTestId && (() => {
                                  // Walk parentTestId refs to collect ordered chain IDs
                                  type ChainNode = {
                                    id: string;
                                    ctr: number | null;
                                    hook: string | null;
                                    format: string | null;
                                    cta: string | null;
                                  };
                                  const chainIds: string[] = [test.testId];
                                  let cur: string | null = test.parentTestId;
                                  let safety = 0;
                                  while (cur && safety < 10) {
                                    chainIds.unshift(cur);
                                    const p = (rawTests ?? []).find((t: any) => t.id === cur);
                                    cur = p?.parentTestId ?? null;
                                    safety++;
                                  }
                                  // Resolve winner metrics + variant fields for each test in the chain
                                  const chainData: ChainNode[] = chainIds.map(id => {
                                    const rt = (rawTests ?? []).find((t: any) => t.id === id);
                                    const gt = allGroupedTests.find(t => t.testId === id);
                                    const winnerVId: string | null = rt?.learning?.winnerVariantId ?? null;
                                    const winner = winnerVId && gt
                                      ? gt.variants.find((v: Variant) => v.variantId === winnerVId)
                                      : null;
                                    return {
                                      id,
                                      ctr:    winner ? (latestMetrics(winner)?.ctr ?? null) : null,
                                      hook:   winner?.hookType       ?? null,
                                      format: winner?.creativeFormat ?? null,
                                      cta:    winner?.cta            ?? null,
                                    };
                                  });
                                  return (
                                    <div className="flex items-start gap-2 px-4 py-2.5 border-b border-white/5 flex-wrap">
                                      <GitBranch className="w-2.5 h-2.5 text-emerald-500/35 shrink-0 mt-0.5" />
                                      <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/25 mr-0.5 mt-0.5">Chain</span>
                                      {chainData.map((node, idx) => {
                                        const prev  = idx > 0 ? chainData[idx - 1] : null;
                                        const delta = (prev?.ctr != null && node.ctr != null)
                                          ? node.ctr - prev.ctr : null;
                                        const isCurrent = node.id === test.testId;
                                        const deltaColor = delta == null ? "#94a3b8"
                                          : delta >  0.05 ? "#10b981"
                                          : delta < -0.05 ? "#ef4444"
                                          :                  "#94a3b8";
                                        // Detect the highest-priority change vs previous step (Hook > Format > CTA)
                                        const changeLabel = (() => {
                                          if (!prev || (!prev.hook && !node.hook && !prev.format && !node.format)) return null;
                                          if (prev.hook   !== node.hook   && node.hook)   return `Hook: ${prev.hook ?? '?'} \u2192 ${node.hook}`;
                                          if (prev.format !== node.format && node.format) return `Format: ${prev.format ?? '?'} \u2192 ${node.format}`;
                                          if (prev.cta    !== node.cta    && node.cta)    return `CTA: ${prev.cta ?? '?'} \u2192 ${node.cta}`;
                                          return null;
                                        })();
                                        return (
                                          <Fragment key={node.id}>
                                            {idx > 0 && <span className="text-muted-foreground/20 text-[9px] mt-0.5 shrink-0">{'\u2192'}</span>}
                                            <div className="flex flex-col gap-0.5">
                                              <span className="inline-flex items-baseline gap-0.5">
                                                <span className={`font-mono text-[9px] font-bold ${isCurrent ? "text-foreground/60" : "text-emerald-400/40"}`}>
                                                  {node.id}
                                                </span>
                                                {node.ctr != null && (
                                                  <span className="text-[8px] tabular-nums text-muted-foreground/35 font-semibold">
                                                    {node.ctr.toFixed(1)}%
                                                  </span>
                                                )}
                                                {delta != null && (
                                                  <span className="text-[8px] font-bold tabular-nums" style={{ color: deltaColor }}>
                                                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}%
                                                  </span>
                                                )}
                                              </span>
                                              {changeLabel && (
                                                <span className="leading-tight">
                                                  {renderTransitionLabel(changeLabel, "text-[7px]")}
                                                </span>
                                              )}
                                            </div>
                                          </Fragment>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-white/5">
                                      {(activeAdType === "static"
                                        ? ["Variant ID","Ad Variant","Headline","Visual Concept","Angle","CTA","CTR","CPA","Status",""]
                                        : ["Variant ID","Ad Variant","Hook","Angle","Format","CTA","TSR","Hold","CTR","CPA","Status",""]
                                      ).map((h, i) => (
                                        <th key={i} className={`px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 ${
                                          ["TSR","Hold","CTR","CPA"].includes(h) ? "text-center" : ""
                                        }`}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {test.variants.map((exp: Variant, vi: number) => {
                                      const isCandidate = winnerCandidateId === exp.id;
                                      const isSelected  = selectedExpId === exp.id;
                                      const isWinner    = !!learning?.winnerVariantId && exp.variantId === learning.winnerVariantId;
                                      const m = latestMetrics(exp);
                                      const metCell = (val: number | null, fmt: (n: number) => string, lo: number, hi: number, lower?: boolean) => {
                                        if (val == null) return <span className="text-muted-foreground/20 text-xs font-mono">—</span>;
                                        const good = lower ? val <= lo : val >= hi;
                                        const ok   = lower ? val <= hi : val >= lo;
                                        const cls  = good ? "text-emerald-400" : ok ? "text-amber-400" : "text-red-400/80";
                                        return <span className={`font-mono tabular-nums text-xs font-bold ${cls}`}>{fmt(val)}</span>;
                                      };
                                      return (
                                        <tr key={exp.id} id={`var-${exp.id}`}
                                          onClick={() => setSelectedExpId(isSelected ? null : exp.id)}
                                          className={`transition-colors group cursor-pointer ${
                                            isSelected
                                              ? "bg-primary/[0.07] border-b border-primary/20"
                                              : isDemo
                                              ? "opacity-45 hover:opacity-60 border-b border-white/4"
                                              : isWinner
                                                ? "bg-yellow-500/[0.05] hover:bg-yellow-500/[0.08] border-b border-yellow-500/15"
                                                : isCandidate
                                                  ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.07] border-b border-amber-500/15"
                                                  : "hover:bg-white/[0.02] border-b border-white/4"
                                          }`}
                                        >
                                          {/* Variant ID */}
                                          <td className={`px-3 py-2.5 whitespace-nowrap ${isWinner ? "border-l-2 border-yellow-400/70" : isCandidate ? "border-l-2 border-amber-400/60" : ""}`}>
                                            <div className="flex flex-col gap-0.5">
                                              {exp.variantId ? (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border w-fit ${
                                                  exp.parentVariantId
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-white/[0.05] text-foreground/60 border-white/10"
                                                }`}>
                                                  {exp.parentVariantId && <GitBranch className="w-2.5 h-2.5 shrink-0" />}
                                                  {isWinner && <Trophy className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
                                                  {exp.variantId}
                                                </span>
                                              ) : (
                                                <span className="text-muted-foreground/25 text-xs font-mono">—</span>
                                              )}
                                              {isWinner && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400/80 border border-yellow-500/20 w-fit">
                                                  <Trophy className="w-2 h-2" />Winner
                                                </span>
                                              )}
                                              {exp.isIterated && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400/80 border border-indigo-500/20 w-fit">
                                                  <RotateCcw className="w-2 h-2" />Iterated
                                                </span>
                                              )}
                                              {((exp as any).source === "iteration" || exp.parentVariantId) && (
                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400/70 border border-violet-500/20 w-fit">
                                                  <Sparkles className="w-2 h-2" />Iteration
                                                </span>
                                              )}
                                              {exp.startDate && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/30">
                                                  <Calendar className="w-2 h-2" />{fmtDate(exp.startDate)}
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          {/* Ad Variant name */}
                                          <td className="px-3 py-2.5 max-w-[180px]" title={exp.adVariant}>
                                            <div className="flex flex-col gap-0.5 min-w-0">
                                              <span className="truncate text-[12px] font-medium text-foreground/85">{exp.adVariant}</span>
                                              {isCandidate && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 w-fit">
                                                  <Trophy className="w-2 h-2 shrink-0" />Winner Candidate
                                                </span>
                                              )}
                                              {isDemo && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/12 text-amber-400/70 border border-amber-500/20 w-fit">
                                                  Example
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                          {/* Hook / Headline */}
                                          <td className="px-3 py-2.5 whitespace-nowrap max-w-[150px]">
                                            {activeAdType === "static"
                                              ? (exp.headline
                                                  ? <span className="truncate text-xs text-foreground/70 block">{exp.headline}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)
                                              : (exp.hookType
                                                  ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/12 text-violet-400 border border-violet-500/20">{exp.hookType}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)}
                                          </td>
                                          {/* Angle / Visual Concept */}
                                          <td className="px-3 py-2.5 whitespace-nowrap max-w-[150px]">
                                            {activeAdType === "static"
                                              ? (exp.visualConcept
                                                  ? <span className="truncate text-xs text-foreground/60 block">{exp.visualConcept}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)
                                              : (exp.primaryAngle
                                                  ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/12 text-blue-400 border border-blue-500/20">{exp.primaryAngle}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)}
                                          </td>
                                          {/* Format / Angle (static shows angle here) */}
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            {activeAdType === "static"
                                              ? (exp.primaryAngle
                                                  ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/12 text-blue-400 border border-blue-500/20">{exp.primaryAngle}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)
                                              : (exp.creativeFormat
                                                  ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/12 text-emerald-400 border border-emerald-500/20">{exp.creativeFormat}</span>
                                                  : <span className="text-muted-foreground/20 text-xs">—</span>)}
                                          </td>
                                          {/* CTA */}
                                          <td className="px-3 py-2.5 whitespace-nowrap">
                                            {exp.cta
                                              ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/12 text-amber-400 border border-amber-500/20">{exp.cta}</span>
                                              : <span className="text-muted-foreground/20 text-xs">—</span>}
                                          </td>
                                          {/* TSR / Hold — video only */}
                                          {activeAdType !== "static" && <>
                                            <td className="px-3 py-2.5 text-center">{metCell(m?.tsr  ?? null, n => n.toFixed(1)+"%", 35, 45)}</td>
                                            <td className="px-3 py-2.5 text-center">{metCell(m?.hold ?? null, n => n.toFixed(1)+"%", 48, 56)}</td>
                                          </>}
                                          {/* CTR / CPA — always shown */}
                                          <td className="px-3 py-2.5 text-center">{metCell(m?.ctr  ?? null, n => n.toFixed(1)+"%", 2.5, 4)}</td>
                                          <td className="px-3 py-2.5 text-center">{metCell(m?.cpa  ?? null, n => "$"+n.toFixed(0), 50, 35, true)}</td>
                                          {/* Individual status */}
                                          <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                                            <EditableStatusCell status={exp.status} disabled={isDemo} onSave={s => updateExperiment(exp.id, { status: s })} adType={(exp as any).adType} />
                                          </td>
                                          {/* Actions */}
                                          <td className="px-3 py-2.5 w-[160px]" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                              {exp.status === "Winner" && (exp as any).adType !== "static" && (
                                                <button onClick={e => { e.stopPropagation(); iterateWinner(exp); }}
                                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/10 text-violet-400/60 hover:text-violet-400 hover:bg-violet-500/20 transition-all text-[10px] font-semibold whitespace-nowrap"
                                                  title="Iterate this winner"
                                                >
                                                  <RotateCcw className="w-3 h-3 shrink-0" />Iterate
                                                </button>
                                              )}
                                              {exp.status === "Winner" && (exp as any).adType === "static" && (
                                                <button onClick={e => { e.stopPropagation(); iterateWinner(exp); }}
                                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/20 transition-all text-[10px] font-semibold whitespace-nowrap"
                                                  title="Iterate this winner"
                                                >
                                                  🖼 Iterate
                                                </button>
                                              )}
                                              <button
                                                onClick={e => { e.stopPropagation(); navigate(`/experiment-timeline?exp=${exp.id}`); }}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/20 transition-all text-[10px] font-semibold"
                                                title="View timeline"
                                              >
                                                <History className="w-3 h-3 shrink-0" />
                                              </button>
                                              {!isDemo && (
                                                <button onClick={e => { e.stopPropagation(); deleteExperiment(exp.id); }}
                                                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/15 transition-all shrink-0"
                                                ><Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" /></button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>

                                {/* ── Learning section ────────────────────────── */}
                                {!isDemo && (
                                  <div className="border-t border-white/[0.06] px-4 py-3">
                                    {learning?.insight || learning?.winnerVariantId || learning?.nextAction ? (() => {
                                      // resolve winner variant for tags + metric delta
                                      const winV = learning.winnerVariantId
                                        ? experiments.find(e => e.variantId === learning.winnerVariantId || e.id === learning.winnerVariantId)
                                        : null;
                                      const winM = winV ? latestMetrics(winV) : null;
                                      const otherMs = (test.variantIds ?? [])
                                        .map((vid: string) => experiments.find(e => e.variantId === vid || e.id === vid))
                                        .filter((e): e is Variant => !!e && e.variantId !== learning.winnerVariantId)
                                        .map(e => latestMetrics(e))
                                        .filter(Boolean) as TLEntry[];
                                      const avgCTROth = otherMs.length ? otherMs.reduce((s, m) => s + m.ctr, 0) / otherMs.length : 0;
                                      const avgCPAOth = otherMs.length ? otherMs.reduce((s, m) => s + (m.cpa ?? 0), 0) / otherMs.length : 0;
                                      const ctrDelta  = winM && avgCTROth > 0 ? winM.ctr - avgCTROth : null;
                                      const cpaDelta  = winM && winM.cpa && avgCPAOth > 0 ? avgCPAOth - winM.cpa : null;
                                      return (
                                        <div className="flex flex-col gap-2.5">
                                          {/* Header row */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                              <Lightbulb className="w-3.5 h-3.5 text-yellow-400/70" />
                                              <span className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60">Learning</span>
                                            </div>
                                            <button
                                              onClick={() => openLearningModal(test.testId)}
                                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground/40 hover:text-foreground/60 border border-white/[0.06] transition-all"
                                            >
                                              <Pencil className="w-3 h-3" />Edit
                                            </button>
                                          </div>
                                          {/* Winner row with type tags */}
                                          {learning.winnerVariantId && (
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <div className="flex items-center gap-1.5">
                                                <Trophy className="w-3 h-3 text-yellow-400/70 shrink-0" />
                                                <span className="text-[11px] font-bold text-yellow-300/90 font-mono">{learning.winnerVariantId}</span>
                                              </div>
                                              {winV?.hookType && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-violet-500/10 text-violet-400/80 border-violet-500/20">{winV.hookType}</span>
                                              )}
                                              {winV?.creativeFormat && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20">{winV.creativeFormat}</span>
                                              )}
                                              {winV?.cta && (
                                                <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-amber-500/10 text-amber-400/80 border-amber-500/20">{winV.cta}</span>
                                              )}
                                            </div>
                                          )}
                                          {/* Metric delta row */}
                                          {(ctrDelta !== null || cpaDelta !== null) && (
                                            <div className="flex items-center gap-3">
                                              {ctrDelta !== null && ctrDelta > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400/90">
                                                  <TrendingUp className="w-3 h-3" />
                                                  +{ctrDelta.toFixed(1)}% CTR
                                                  <span className="text-muted-foreground/35 font-normal">({winM!.ctr.toFixed(1)}% vs {avgCTROth.toFixed(1)}% avg)</span>
                                                </span>
                                              )}
                                              {cpaDelta !== null && cpaDelta > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400/90">
                                                  <TrendingDown className="w-3 h-3" />
                                                  −${cpaDelta.toFixed(0)} CPA
                                                  <span className="text-muted-foreground/35 font-normal">(${winM!.cpa!.toFixed(0)} vs ${avgCPAOth.toFixed(0)} avg)</span>
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          {/* Insight */}
                                          {learning.insight && (
                                            <p className="text-[11px] text-foreground/55 leading-relaxed">{learning.insight}</p>
                                          )}
                                          {/* Next action */}
                                          {learning.nextAction && (
                                            <div className="flex items-start gap-1.5 bg-primary/[0.05] border border-primary/10 rounded-lg px-2.5 py-2">
                                              <ArrowRight className="w-3 h-3 text-primary/60 shrink-0 mt-0.5" />
                                              <p className="text-[11px] text-primary/70 leading-relaxed font-medium">{learning.nextAction}</p>
                                            </div>
                                          )}
                                          {/* Next iteration CTA */}
                                          {learning.winnerVariantId && test.iterationType && (() => {
                                            const nextType = NEXT_ITER_TYPE[test.iterationType];
                                            if (!nextType) return null;
                                            const currentColor = ITER_TYPE_COLOR[test.iterationType] ?? "#8b5cf6";
                                            const nextColor    = ITER_TYPE_COLOR[nextType]           ?? "#8b5cf6";
                                            return (
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-semibold text-muted-foreground/30 uppercase tracking-widest">
                                                  <span style={{ color: currentColor }}>{test.iterationType}</span>
                                                  {" done → "}
                                                  <span style={{ color: nextColor }}>test {nextType}</span>
                                                </span>
                                                <button
                                                  onClick={() => startNextIteration(learning.winnerVariantId!, nextType)}
                                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border"
                                                  style={{ background:`${nextColor}12`, color:nextColor, borderColor:`${nextColor}30` }}
                                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${nextColor}22`; }}
                                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${nextColor}12`; }}
                                                >
                                                  <RotateCcw className="w-3 h-3" />Start {nextType} Test
                                                  <ArrowRight className="w-3 h-3" />
                                                </button>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      );
                                    })() : (
                                      <div className="flex items-center gap-3">
                                        <Lightbulb className="w-3.5 h-3.5 text-yellow-400/20 shrink-0" />
                                        <span className="text-[11px] text-muted-foreground/30 italic">No learning recorded yet</span>
                                        <button
                                          onClick={() => openLearningModal(test.testId)}
                                          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-yellow-400/[0.07] hover:bg-yellow-400/[0.14] text-yellow-400/50 hover:text-yellow-400/80 border border-yellow-400/[0.12] hover:border-yellow-400/25 transition-all"
                                        >
                                          <Plus className="w-3 h-3" />Add Learning
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* ── Add Variant footer ──────────────────────── */}
                                {!isDemo && (test.testStatus === "Draft" || test.testStatus === "Producing") && (
                                  <div className="border-t border-white/[0.06] px-4 py-3">
                                    {addVariantTestId === test.testId ? (
                                      <div className="flex flex-col gap-4">
                                        {/* Row 1 */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                          <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Ad Variant</label>
                                            <input className={inputCls} placeholder="e.g. Bold Claim UGC"
                                              value={addVariantDraft.adVariant}
                                              onChange={e => setAddVariantDraft(prev => ({ ...prev, adVariant: e.target.value }))}
                                              autoFocus
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Hook Type</label>
                                            <AppDropdown value={addVariantDraft.hookType} onChange={v => setAddVariantDraft(prev => ({ ...prev, hookType: v }))} options={HOOK_TYPES} />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Angle</label>
                                            <AppDropdown value={addVariantDraft.primaryAngle} onChange={v => setAddVariantDraft(prev => ({ ...prev, primaryAngle: v }))} options={ANGLES} />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Format</label>
                                            <AppDropdown value={addVariantDraft.creativeFormat} onChange={v => setAddVariantDraft(prev => ({ ...prev, creativeFormat: v }))} options={FORMATS} />
                                          </div>
                                        </div>
                                        {/* Row 2 */}
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">CTA</label>
                                            <AppDropdown value={addVariantDraft.cta} onChange={v => setAddVariantDraft(prev => ({ ...prev, cta: v }))} options={CTA_TYPES} />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Status</label>
                                            <AppDropdown value={addVariantDraft.status} onChange={v => setAddVariantDraft(prev => ({ ...prev, status: v as Status }))} options={STATUS_OPTS} />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Start Date</label>
                                            <input type="date" className={inputCls}
                                              value={addVariantDraft.startDate}
                                              onChange={e => setAddVariantDraft(prev => ({ ...prev, startDate: e.target.value }))}
                                            />
                                          </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex items-center gap-3 pt-1">
                                          <Button size="sm" onClick={saveVariantToTest}
                                            disabled={!addVariantDraft.adVariant.trim()}
                                            className="gap-1.5 bg-primary/15 border border-primary/25 hover:bg-primary/25 text-primary hover:text-primary"
                                            variant="ghost"
                                          >
                                            <Plus className="w-3.5 h-3.5" />Save Variant
                                          </Button>
                                          <button
                                            onClick={() => { setAddVariantTestId(null); setAddVariantDraft(blankForm()); }}
                                            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors"
                                          >Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => { setAddVariantTestId(test.testId); setAddVariantDraft(blankForm()); }}
                                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/50 hover:text-primary transition-colors py-0.5"
                                      >
                                        <Plus className="w-3.5 h-3.5" />Add Variant
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                                ); })()}
                            </td>
                          </motion.tr>
                        )}
                      </Fragment>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* ══ SECTION 2 — VARIABLE PERFORMANCE ANALYSIS ═══════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.06 }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Variable Performance Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Averages auto-calculated from your experiment log. Rankings update as you add data.
            </p>
          </div>

          {/* Top performers summary */}
          {analyticsExps.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {(activeAdType === "static"
                ? [
                    { label:"Top Angle", value:topAngle?.key,  metric:`${topAngle?.avgCTR.toFixed(1)}% avg CTR`,  color:"#a78bfa", icon:TrendingUp },
                    { label:"Top CTA",   value:topCTA?.key,    metric:`${topCTA?.avgCTR.toFixed(1)}% avg CTR`,    color:"#10b981", icon:Target    },
                  ]
                : [
                    { label:"Top Hook",   value:topHook?.key,   metric:`${topHook?.avgCTR.toFixed(1)}% avg CTR`,   color:"#8b5cf6", icon:Zap      },
                    { label:"Top Format", value:topFormat?.key, metric:`${topFormat?.avgTSR.toFixed(1)}% avg TSR`, color:"#6366f1", icon:FileText  },
                    { label:"Top CTA",    value:topCTA?.key,    metric:`${topCTA?.avgCTR.toFixed(1)}% avg CTR`,    color:"#10b981", icon:Target   },
                  ]
              ).map(({ label, value, metric, color, icon: Icon }) => (
                <Card key={label} className="border-white/10 bg-card/50 overflow-hidden">
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg,${color}60,transparent)` }} />
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</span>
                    </div>
                    <p className="text-base font-bold text-foreground mb-0.5">{value ?? "—"}</p>
                    <p className="text-xs text-muted-foreground/60">{metric}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {analyticsExps.length < 2 ? (
            <Card className="border-white/10 bg-card/50">
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm font-semibold text-foreground/50">Need at least 2 experiments</p>
                  <p className="text-xs text-muted-foreground/40">Add more data to unlock performance analysis.</p>
                </div>
              </CardContent>
            </Card>
          ) : activeAdType === "static" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <AnalysisGroup title="Primary Angle" groups={angleGroups} color="#a78bfa" icon={TrendingUp}/>
              <AnalysisGroup title="CTA Style"     groups={ctaGroups}   color="#10b981" icon={Target}    />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <AnalysisGroup title="Hook Type"       groups={hookGroups}   color="#8b5cf6" icon={Zap}      />
              <AnalysisGroup title="Primary Angle"   groups={angleGroups}  color="#a78bfa" icon={TrendingUp}/>
              <AnalysisGroup title="Creative Format" groups={formatGroups} color="#6366f1" icon={FileText}  />
              <AnalysisGroup title="CTA Style"       groups={ctaGroups}    color="#10b981" icon={Target}    />
            </div>
          )}
        </motion.div>

        {/* ══ SECTION 2.5 — WINNING CREATIVE DNA ══════════════════════════════ */}
        {creativeDNA && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Creative Intelligence</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold tracking-tight">Winning Creative DNA</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-violet-500/12 text-violet-400 border border-violet-500/20">
                  Auto-Detected
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Highest-performing variables across {creativeDNA.experimentCount} experiments. Lock these in — they are your proven creative foundation.
              </p>
            </div>

            {/* ── DNA Attributes ──────────────────────────────────────────────── */}
            <Card className="border-white/10 bg-card/50 overflow-hidden mb-5">
              <div className="h-[2px] bg-gradient-to-r from-violet-500/50 via-amber-500/40 to-indigo-500/50" />
              <CardContent className="pt-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                  {(activeAdType === "static"
                    ? [
                        {
                          label: "Top Headline",
                          item:  topHeadlineDNA,
                          color: "#8b5cf6",
                          Icon:  FileText,
                          metricLabel: "avg CTR",
                          metricVal:   topHeadlineDNA ? `${topHeadlineDNA.avgCTR.toFixed(1)}%` : "—",
                        },
                        {
                          label: "Top Angle",
                          item:  creativeDNA.topAngle,
                          color: "#f59e0b",
                          Icon:  TrendingUp,
                          metricLabel: "avg CTR",
                          metricVal:   creativeDNA.topAngle ? `${creativeDNA.topAngle.avgCTR.toFixed(1)}%` : "—",
                        },
                        {
                          label: "Top Visual",
                          item:  topVisualDNA,
                          color: "#6366f1",
                          Icon:  Eye,
                          metricLabel: "avg CTR",
                          metricVal:   topVisualDNA ? `${topVisualDNA.avgCTR.toFixed(1)}%` : "—",
                        },
                      ]
                    : [
                        {
                          label: "Top Hook",
                          item:  creativeDNA.topHook,
                          color: "#8b5cf6",
                          Icon:  Zap,
                          metricLabel: "avg CTR",
                          metricVal:   creativeDNA.topHook ? `${creativeDNA.topHook.avgCTR.toFixed(1)}%` : "—",
                        },
                        {
                          label: "Top Angle",
                          item:  creativeDNA.topAngle,
                          color: "#f59e0b",
                          Icon:  TrendingUp,
                          metricLabel: "avg CTR",
                          metricVal:   creativeDNA.topAngle ? `${creativeDNA.topAngle.avgCTR.toFixed(1)}%` : "—",
                        },
                        {
                          label: "Top Format",
                          item:  creativeDNA.topFormat,
                          color: "#6366f1",
                          Icon:  FileText,
                          metricLabel: "avg TSR",
                          metricVal:   creativeDNA.topFormat ? `${creativeDNA.topFormat.avgTSR.toFixed(1)}%` : "—",
                        },
                      ]
                  ).map(({ label, item, color, Icon, metricLabel, metricVal }, idx) => (
                    <div key={label} className={`flex flex-col gap-4 py-4 sm:py-0 ${idx === 0 ? "sm:pr-6" : idx === 1 ? "sm:px-6" : "sm:pl-6"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color }} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</span>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-foreground leading-tight mb-2">{item?.key ?? "—"}</p>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{ background: `${color}12`, color, borderColor: `${color}25` }}
                          >
                            {metricVal} {metricLabel}
                          </span>
                          <span className="text-[10px] text-muted-foreground/35">
                            {item?.count ?? 0} test{(item?.count ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg,${color},${color}70)` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${item?.barPct ?? 0}%` }}
                            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 + idx * 0.1 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Next Experiment Recommendations ─────────────────────────────── */}
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">
              Recommended Next Experiments
            </p>
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {creativeDNA.recommendations.map((rec, i) => (
                <motion.div key={rec.rotate} variants={cardAnim}>
                  <Card className="border-white/10 bg-card/50 overflow-hidden hover:border-white/15 transition-colors h-full">
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg,${rec.color}60,transparent)` }} />
                    <CardContent className="pt-4 pb-5 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                          style={{ background: `${rec.color}15`, color: rec.color }}
                        >
                          Rotate {rec.rotate}
                        </span>
                        <span className="text-[9px] font-black font-mono tabular-nums text-muted-foreground/30">
                          #{String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-0.5">Test Next</p>
                        <p className="text-sm font-bold text-foreground">{rec.next}</p>
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-1.5">Keep Locked</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.keep.map(k => (
                            <span key={k} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground/60 leading-relaxed">{rec.hypothesis}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ══ SECTION 2.7 — PATTERN MEMORY ════════════════════════════════════ */}
        {patternMemory && (
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Pattern Memory</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight mb-1">Pattern Memory</h2>
              <p className="text-sm text-muted-foreground">
                Aggregated performance patterns from {patternMemory.totalExperiments} experiments. Surfaces what's working without influencing decisions.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([patternMemory.hooks, patternMemory.formats, patternMemory.angles] as const).map(cat => {
                const CAT_COLOR: Record<string, string> = {
                  Hook: "#8b5cf6", Format: "#6366f1", Angle: "#f59e0b",
                };
                const color = CAT_COLOR[cat.name] ?? "#8b5cf6";
                const maxCTR = Math.max(...cat.top.map(e => e.avgCTR), 0.01);

                return (
                  <Card key={cat.name} className="border-white/10 bg-card/50 overflow-hidden">
                    <div className="h-[2px]" style={{ background: `linear-gradient(90deg,${color}60,transparent)` }} />
                    <CardContent className="pt-4 pb-4">

                      {/* Category header */}
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{cat.name} Type</p>
                        <span className="text-[9px] text-muted-foreground/35 font-mono">avg CTR</span>
                      </div>

                      {/* Top performers */}
                      <div className="flex flex-col gap-2 mb-3">
                        {cat.top.map((entry, idx) => {
                          const barPct = maxCTR > 0 ? Math.min((entry.avgCTR / maxCTR) * 100, 100) : 0;
                          const isTop = idx === 0;
                          return (
                            <div key={entry.label}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isTop && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color }}>
                                      #1
                                    </span>
                                  )}
                                  <span className={`text-[11px] truncate ${isTop ? "font-semibold text-foreground/90" : "font-normal text-foreground/60"}`}>
                                    {entry.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {entry.winRate > 0 && (
                                    <span className="text-[9px] text-emerald-400/60 font-mono">{Math.round(entry.winRate * 100)}% win</span>
                                  )}
                                  <span className="text-[11px] font-mono tabular-nums text-muted-foreground/70 w-10 text-right">
                                    {entry.avgCTR.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${barPct}%`, background: isTop ? color : `${color}55` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Worst performers */}
                      {cat.worst.length > 0 && (
                        <div className="pt-2.5 border-t border-white/6">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/25 mb-1.5">Lowest CTR</p>
                          <div className="flex flex-col gap-1">
                            {cat.worst.filter(e => !cat.top.slice(0, 1).some(t => t.label === e.label)).map(entry => (
                              <div key={entry.label} className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground/40 truncate">{entry.label}</span>
                                <span className="text-[10px] font-mono text-red-400/50">{entry.avgCTR.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Insight sentence */}
                      <div className="mt-3 pt-3 border-t border-white/6">
                        <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic">{cat.insight}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══ SECTION 3 — CREATIVE INSIGHTS ═══════════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Creative Insights</h2>
            <p className="text-sm text-muted-foreground">
              Patterns detected from your experiment data. Insights update automatically as you log more results.
            </p>
          </div>

          {insights.length === 0 ? (
            <Card className="border-white/10 bg-card/50">
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Lightbulb className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm font-semibold text-foreground/50">No insights yet</p>
                  <p className="text-xs text-muted-foreground/40">Add 3+ experiments across different hook types to generate insights.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {insights.map((ins, i) => (
                <motion.div key={i} variants={cardAnim}>
                  <Card className="border-white/10 bg-card/50 overflow-hidden hover:border-white/15 transition-colors">
                    <div className="h-0.5" style={{ background: `linear-gradient(90deg,${ins.color}60,transparent)` }} />
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${ins.color}15` }}
                        >
                          <Sparkles className="w-4 h-4" style={{ color: ins.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground/85 leading-relaxed mb-2">{ins.text}</p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                            style={{ background: `${ins.color}12`, color: ins.color, borderColor: `${ins.color}25` }}
                          >
                            {ins.positive ? <TrendingUp className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {ins.delta}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* ══ SECTION 3.5 — DECISION LAYER ════════════════════════════════════ */}
        {decisionVariants.length > 0 && (() => {
          const STATE_META: Record<DecisionState, { color: string; icon: React.ReactNode; badge: string }> = {
            NO_SIGNAL:       { color: "#ef4444", badge: "No Signal",      icon: <XCircle    className="w-5 h-5" style={{ color: "#ef4444" }} /> },
            WEAK_SIGNAL:     { color: "#f59e0b", badge: "Weak Signal",    icon: <Zap        className="w-5 h-5" style={{ color: "#f59e0b" }} /> },
            VALIDATED_BODY:  { color: "#10b981", badge: "Body Validated", icon: <CheckCircle2 className="w-5 h-5" style={{ color: "#10b981" }} /> },
          };
          const meta = STATE_META[decisionState];
          const entryCount = displayExperiments.reduce(
            (sum, e) => sum + (e.timeline?.length ?? 0), 0
          );
          const confidence = computeDecisionConfidence(decisionVariants, Math.max(entryCount, 1));
          const guard = applyDecisionGuard(recommendation, confidence);
          return (
            <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Decision Layer</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight mb-1">State-Aware Decision</h2>
                <p className="text-sm text-muted-foreground">
                  Diagnosis based on your current experiment metrics. Drives what to test next.
                </p>
              </div>
              <Card className="border-white/10 bg-card/50 overflow-hidden">
                <div className="h-[2px]" style={{ background: `linear-gradient(90deg,${meta.color}60,transparent)` }} />
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    {/* State indicator */}
                    <div className="flex-1 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}15` }}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                              style={{ background: `${meta.color}15`, color: meta.color, borderColor: `${meta.color}30` }}>
                              {meta.badge}
                            </span>
                            <ConfidenceBadge result={confidence} />
                          </div>
                          <p className="text-lg font-bold text-foreground leading-tight">{recommendation.title}</p>
                        </div>
                      </div>
                      <div className="pl-[52px]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Recommended Action</p>
                        <p className="text-sm font-semibold text-foreground/80">{recommendation.action}</p>
                      </div>
                    </div>
                    {/* Instructions */}
                    <div className="sm:w-72 rounded-xl border border-white/8 bg-white/3 px-5 py-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Instructions</p>
                      <ul className="flex flex-col gap-2.5">
                        {recommendation.instructions.map((instr, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm text-foreground/75">
                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.color }} />
                            {instr}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Guard advisory — informational only, no blocking */}
                  {guard.mode === "BLOCKED" && (
                    <div className="mt-5 pt-5 border-t border-white/8 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80" />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-amber-300/80 leading-snug mb-1">
                          This decision is based on limited data
                        </p>
                        <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                          You can still proceed — logging more entries or testing additional variants will strengthen this signal over time.
                        </p>
                      </div>
                    </div>
                  )}

                  {guard.mode === "LIMITED" && (
                    <div className="mt-5 pt-5 border-t border-white/8 flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 mt-0.5">
                        <Info className="w-3.5 h-3.5 text-blue-400/70" />
                      </div>
                      <p className="text-[11px] text-muted-foreground/55 leading-relaxed pt-1">
                        Consider testing smaller variations first to consolidate the signal before committing to a larger change.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* ══ SECTION 4 — NEXT TEST SUGGESTIONS ═══════════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">What To Test Next</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Next Test Suggestions</h2>
            <p className="text-sm text-muted-foreground">
              Lock in your winning variables and rotate the next weakest link. One change per test round.
            </p>
          </div>

          {displayExperiments.length < 2 ? (
            <Card className="border-white/10 bg-card/50">
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <Target className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm font-semibold text-foreground/50">Add more experiments to unlock suggestions</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Winning variables to keep */}
              <Card className="border-emerald-500/20 bg-emerald-500/[0.02] overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 to-transparent" />
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/15 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Lock In — Keep These</p>
                      <p className="text-sm font-bold text-foreground">Winning Variables</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(activeAdType === "static"
                      ? [
                          { label:"Winning Headline", value:winnerHeadline, color:"#8b5cf6" },
                          { label:"Winning Visual",   value:winnerVisual,   color:"#6366f1" },
                          { label:"Winning Angle",    value:winnerAngle,    color:"#10b981" },
                        ]
                      : [
                          { label:"Winning Hook",   value:winnerHook,   color:"#8b5cf6" },
                          { label:"Winning Format", value:winnerFormat, color:"#6366f1" },
                          { label:"Winning CTA",    value:winnerCTA,    color:"#10b981" },
                        ]
                    ).map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/8">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">{label}</span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold border"
                          style={{ background:`${color}12`, color, borderColor:`${color}25` }}
                        >{value ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pending Decisions */}
              <Card className="border-blue-500/20 bg-blue-500/[0.02] overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-blue-500/60 to-transparent" />
                <CardContent className="pt-5 pb-5">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/70">Awaiting Decision</p>
                      <p className="text-sm font-bold text-foreground">Pending Decisions</p>
                    </div>
                  </div>

                  {/* Content */}
                  {analyticsExps.length === 0 || pendingDecisions.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-3 rounded-lg border border-green-500/20 bg-green-500/[0.04]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                      <p className="text-xs text-green-400/80">All testing variants have been decided ✓</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {pendingDecisions.map(exp => {
                        const m = latestMetrics(exp);
                        const ctr = m?.ctr ?? null;
                        const ctrColor = ctr === null
                          ? "text-muted-foreground/40"
                          : ctr < 2
                            ? "text-red-400"
                            : ctr <= 3.5
                              ? "text-amber-400"
                              : "text-green-400";
                        return (
                          <div key={exp.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-colors">
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">{exp.variantId}</span>
                                <span className="text-xs text-foreground/70 truncate">{exp.adVariant}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ctr !== null && (
                                  <span className={`text-[10px] font-mono font-bold ${ctrColor}`}>{ctr.toFixed(1)}% CTR</span>
                                )}
                                {m?.cpa != null && m.cpa > 0 && (
                                  <span className="text-[10px] text-muted-foreground/40 font-mono">${m.cpa} CPA</span>
                                )}
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setRawData(prev => prev.map(v => v.id === exp.id ? { ...v, status: "Winner" } : v));
                                  window.dispatchEvent(new CustomEvent("clb:write"));
                                }}
                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/35 text-green-400 transition-all"
                              >
                                Winner
                              </button>
                              <button
                                onClick={() => {
                                  setRawData(prev => prev.map(v => v.id === exp.id ? { ...v, status: "Loser" } : v));
                                  window.dispatchEvent(new CustomEvent("clb:write"));
                                }}
                                className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/35 text-red-400 transition-all"
                              >
                                Loser
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        <NextStepBanner
          step="Phase 4"
          title="Creative Iteration"
          cta="Start Iterating"
          description="Take your winning experiments and systematically scale them through rapid creative iteration."
          href="/creative-iteration"
          icon={Zap}
          color="#06b6d4"
        />
      </div>

      {/* ── Variant Detail Sidebar ── */}
      <AnimatePresence>
        {selectedExp && (
          <VariantDetailSidebar
            key={selectedExp.id}
            exp={selectedExp}
            allExperiments={experiments}
            isDemo={isDemo}
            onClose={() => setSelectedExpId(null)}
            onUpdate={fields => updateExperiment(selectedExp.id, fields)}
            onOpenTimeline={() => {
              setSelectedExpId(null);
              navigate(`/experiment-timeline?exp=${selectedExp.id}`);
            }}
            onSelectVariant={id => setSelectedExpId(id)}
          />
        )}
      </AnimatePresence>

      {/* ── Learning Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {learningModalTestId && (() => {
          const modalTest = (rawTests ?? []).find((t: any) => t.id === learningModalTestId);
          const modalVariants: Variant[] = (() => {
            const byVarIds = (modalTest?.variantIds ?? [])
              .map((vid: string) =>
                experiments.find(e => e.id === vid) ??
                experiments.find(e => e.variantId === vid)
              )
              .filter(Boolean) as Variant[];
            if (byVarIds.length > 0) return byVarIds;
            return experiments.filter(e => (e as any).testId === learningModalTestId);
          })();
          return (
            <motion.div
              key="learning-modal-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={closeLearningModal}
            >
              <motion.div
                key="learning-modal"
                initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="relative w-full max-w-lg bg-[#0f1117] border border-white/10 rounded-xl shadow-2xl p-6 flex flex-col gap-5"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-bold text-foreground tracking-tight">Test Learning</span>
                    <span className="text-[10px] font-mono text-muted-foreground/40">{learningModalTestId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateSuggestions}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 hover:bg-violet-500/20 text-violet-400/70 hover:text-violet-400 border border-violet-500/20 hover:border-violet-500/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Re-generate suggestions from variant data"
                    >
                      {isGenerating
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                        : <><Sparkles className="w-3 h-3" />Generate Suggestions</>
                      }
                    </button>
                    <button
                      onClick={closeLearningModal}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-muted-foreground/50 hover:text-foreground transition-all"
                    ><X className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* No-data hint */}
                {modalVariants.length === 0 && (
                  <p className="text-[10px] text-amber-400/60 text-center mt-1">
                    No tracked variants found for this test. Log performance data in Experiment Timeline first.
                  </p>
                )}

                {/* Auto-suggestion notice */}
                {(learningDraft.insight || learningDraft.winnerVariantId) && !((rawTests ?? []).find((t: any) => t.id === learningModalTestId)?.learning?.insight) && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/[0.07] border border-violet-500/15">
                    <Sparkles className="w-3 h-3 text-violet-400/60 shrink-0" />
                    <span className="text-[10px] text-violet-300/60 leading-relaxed">
                      Auto-generated from variant performance data — review and edit before saving
                    </span>
                  </div>
                )}

                {/* Winner dropdown */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-yellow-400/60" />Winner Variant
                  </label>
                  <select
                    value={learningDraft.winnerVariantId}
                    onChange={e => setLearningDraft(d => ({ ...d, winnerVariantId: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground/80 focus:outline-none focus:border-primary/40 transition-colors appearance-none"
                  >
                    <option value="">— None —</option>
                    {modalVariants.map((v: Variant) => (
                      <option key={v.id} value={v.variantId ?? v.id} className="bg-[#0f1117]">
                        {v.variantId ? `${v.variantId} — ${v.adVariant || "unnamed"}` : (v.adVariant || v.id)}
                      </option>
                    ))}
                    {modalVariants.length === 0 && (
                      <option value="" disabled className="bg-[#0f1117] text-muted-foreground">No variants found — type an ID below</option>
                    )}
                  </select>
                  {modalVariants.length === 0 && (
                    <input
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors"
                      placeholder="e.g. LEAD-V01-H02"
                      value={learningDraft.winnerVariantId}
                      onChange={e => setLearningDraft(d => ({ ...d, winnerVariantId: e.target.value }))}
                    />
                  )}
                </div>

                {/* Insight */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-yellow-400/60" />Insight — Why it worked
                  </label>
                  <textarea
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed"
                    placeholder="e.g. The pain-point hook with social proof outperformed feature-led hooks..."
                    value={learningDraft.insight}
                    onChange={e => setLearningDraft(d => ({ ...d, insight: e.target.value }))}
                  />
                </div>

                {/* Next Action */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-primary/60" />Next Action — What to test next
                  </label>
                  <textarea
                    rows={2}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed"
                    placeholder="e.g. Test different social proof sources — customer count vs testimonial..."
                    value={learningDraft.nextAction}
                    onChange={e => setLearningDraft(d => ({ ...d, nextAction: e.target.value }))}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={closeLearningModal}
                    className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                  >Cancel</button>
                  <Button
                    size="sm"
                    onClick={saveLearning}
                    disabled={learningSaved}
                    className={`gap-1.5 border transition-all ${learningSaved
                      ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400 cursor-default"
                      : "bg-primary/15 border-primary/25 hover:bg-primary/25 text-primary hover:text-primary"
                    }`}
                    variant="ghost"
                  >
                    <Check className={`w-3.5 h-3.5 ${learningSaved ? "text-emerald-400" : ""}`} />
                    {learningSaved ? "Saved ✓" : "Save Learning"}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </PageTransition>
  );
}

// ── METRIC COLOR ──────────────────────────────────────────────────────────────
function metricColor(value: number, thresholds: [number, number], lowerIsBetter?: boolean): string {
  if (!lowerIsBetter) {
    if (value >= thresholds[1])      return "#10b981";
    if (value >= thresholds[0])      return "#f59e0b";
    return "#ef4444";
  } else {
    if (value <= thresholds[1])      return "#10b981";
    if (value <= thresholds[0])      return "#f59e0b";
    return "#ef4444";
  }
}

function fmtMetric(value: number, suffix?: string, prefix?: string): string {
  return `${prefix ?? ""}${value.toFixed(suffix === "%" && value < 10 ? 1 : 0)}${suffix ?? ""}`;
}

// ── EDITABLE METRIC CELL ──────────────────────────────────────────────────────
function EditableMetricCell({ value, suffix, prefix, thresholds, lowerIsBetter, onSave, disabled }: {
  value:          number;
  suffix?:        string;
  prefix?:        string;
  thresholds:     [number, number];
  lowerIsBetter?: boolean;
  onSave:         (v: number) => void;
  disabled?:      boolean;
}) {
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState("");
  const [flash,   setFlash]     = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  const color = metricColor(value, thresholds, lowerIsBetter);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function startEdit() {
    if (disabled) return;
    setDraft(fmtMetric(value, suffix, "").replace(/[^0-9.]/g, ""));
    setEditing(true);
  }

  function commit() {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed)) {
      onSave(parsed);
      clearTimeout(flashTimer.current);
      setFlash(true);
      flashTimer.current = setTimeout(() => setFlash(false), 800);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter")  commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-16 text-center text-xs font-mono tabular-nums font-semibold bg-primary/10 border border-primary/35 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50"
        style={{ color }}
      />
    );
  }

  return (
    <motion.span
      onClick={startEdit}
      animate={{ backgroundColor: flash ? "rgba(16,185,129,0.14)" : "rgba(0,0,0,0)" }}
      transition={{ duration: flash ? 0.05 : 0.65 }}
      title={disabled ? undefined : "Click to edit"}
      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded-md ${
        disabled ? "" : "cursor-pointer hover:bg-white/8 hover:ring-1 hover:ring-white/15 group/cell"
      }`}
      style={{ color }}
    >
      {fmtMetric(value, suffix, prefix)}
      {!disabled && (
        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/cell:opacity-40 transition-opacity shrink-0" />
      )}
    </motion.span>
  );
}

// ── EDITABLE STATUS CELL ──────────────────────────────────────────────────────
function EditableStatusCell({ status, onSave, disabled, adType }: {
  status:    Status;
  onSave:    (s: Status) => void;
  disabled?: boolean;
  adType?:   string;
}) {
  const [open,  setOpen]  = useState(false);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Draft"];
  const rawAllowedNext = STATUS_TRANSITIONS[status] ?? [];
  const allowedNext: Status[] = rawAllowedNext;

  function handleSelect(val: Status) {
    onSave(val);
    setOpen(false);
    clearTimeout(flashTimer.current);
    setFlash(true);
    flashTimer.current = setTimeout(() => setFlash(false), 800);
  }

  const noTransitions = !disabled && allowedNext.length === 0;

  return (
    <Popover open={open} onOpenChange={(noTransitions || disabled) ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <motion.span
          animate={{ boxShadow: flash ? ["0 0 0 2px rgba(16,185,129,0.4)", "0 0 0 0px rgba(16,185,129,0)"] : "none" }}
          transition={{ duration: 0.6 }}
          title={disabled ? undefined : allowedNext.length ? "Click to advance status" : "No further transitions"}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all ${
            disabled || noTransitions ? "cursor-default opacity-80" : "cursor-pointer hover:brightness-110 hover:scale-[1.03]"
          }`}
          style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        >
          <cfg.Icon className="w-3 h-3" />{status}
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                  style={{ background: c.bg, color: c.color, borderColor: c.border }}
                >
                  <c.Icon className="w-3 h-3" />{s}
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
