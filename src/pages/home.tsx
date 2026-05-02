import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Users, BarChart3, FlaskConical, Zap, GitFork, BookMarked,
  Lightbulb, TrendingUp, Trophy, Target, Eye, Layers, MousePointerClick,
  ChevronRight, Sparkles, CheckCircle2, Pause,
  GitBranch, XCircle, Crosshair, Mic2, Copy, AlertTriangle,
  Image, Network, Radio, FileText,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { PageTransition } from "@/components/page-transition";
import { Variant, TLEntry, migrateVariant } from "./experiment-timeline";

// ─── Constants (mirror creative-lab constants) ─────────────────────────────────
const ALL_FORMATS = ["UGC","Talking Head","Motion Graphic","Split Screen","Text-Only","Product Demo","Screen Recording","Testimonial","Founder POV","Animation"];
const VIDEO_FORMATS  = ["UGC","Talking Head","Motion Graphic","Split Screen","Text-Only","Product Demo","Screen Recording","Testimonial","Founder POV","Animation"];
const STATIC_FORMATS = ["Single Image","Carousel","Infographic","Quote Card","Product Shot","Comparison Graphic","Meme/Humor","Text-Heavy","Lifestyle Photo","Pattern Interrupt"];

// ─── Action types ─────────────────────────────────────────────────────────────
type ActionType = "WINNER" | "LOSER" | "WEAK_CTR" | "WEAK_HOLD";
interface ActionItem {
  type:      ActionType;
  variantId: string;
  expId:     string;
  reason:    string;
  ctr:       number;
  hold:      number;
  priority:  number;
}

// ─── Raw types ────────────────────────────────────────────────────────────────
type Experiment = Variant;
interface CompRow { id: string; brand: string; hookType: string; angle: string; format: string; }
interface ScriptEntry { type: string; text: string; }
interface Avatar { audience: string; problem: string; outcome: string; identity: string; }

function latestCtr(v: Variant): number {
  if (!v.timeline.length) return 0;
  return [...v.timeline].sort((a, b) => b.date.localeCompare(a.date))[0].ctr;
}

// ─── Computed dashboard data ──────────────────────────────────────────────────
interface WinnerCard { label: string; value: string; avgCtr: number; count: number; icon: React.ElementType; color: string; href: string; }
interface PerfPoint { date: string; ctr: number; tsr: number; hold: number; cpa: number; }
interface DashData {
  projectName: string;
  avatarSummary: string;
  competitorCount: number;
  scriptVariants: number;
  experimentsRunning: number;
  experimentsTotal: number;
  staticCount: number;
  staticRunning: number;
  videoCount: number;
  videoRunning: number;
  winners: WinnerCard[];
  activeTests: Experiment[];
  dominantHook: string;
  dominantFormat: string;
  keepHook: string;
  keepAngle: string;
  suggestedFormats: string[];
  hasExperiments: boolean;
  hasCompetitors: boolean;
  pipelineCounts: { Producing: number; Testing: number; Paused: number; Winner: number };
  perfData: PerfPoint[];
  kpis: { avgCTR: number; avgHold: number; avgTSR: number; avgCPA: number };
  actions: ActionItem[];
  topHeadline: { value: string; avgCtr: number; count: number };
  topVisual:   { value: string; avgCtr: number; count: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeJSON<T>(s: string | null, fb: T): T {
  if (!s) return fb;
  try { return JSON.parse(s) as T; } catch { return fb; }
}
function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function countBy<T>(arr: T[], key: (v: T) => string) {
  const r: Record<string, number> = {};
  arr.forEach(v => { const k = key(v); if (k) r[k] = (r[k] ?? 0) + 1; });
  return r;
}
function topByAvgCtr(exps: Experiment[], field: "hookType" | "creativeFormat" | "primaryAngle"): { value: string; avgCtr: number; count: number } {
  const groups: Record<string, number[]> = {};
  exps.forEach(e => { const k = String(e[field]); if (k) (groups[k] ??= []).push(latestCtr(e)); });
  const sorted = Object.entries(groups).map(([v, ctrs]) => ({ value: v, avgCtr: avg(ctrs), count: ctrs.length }))
    .sort((a, b) => b.avgCtr - a.avgCtr);
  return sorted[0] ?? { value: "", avgCtr: 0, count: 0 };
}

// ─── Data computation ─────────────────────────────────────────────────────────
function computeDashData(pk: (s: string) => string, projectName: string, adTypeFilter: "video" | "static" = "video"): DashData {
  const avatar = safeJSON<Avatar>(localStorage.getItem(pk("market:avatar")), { audience: "", problem: "", outcome: "", identity: "" });
  const compRows = safeJSON<CompRow[]>(localStorage.getItem(pk("competitors:rows")), []).filter(r => r.brand.trim());
  const hooks = safeJSON<ScriptEntry[]>(localStorage.getItem(pk("script:hooks")), []);
  const bodies = safeJSON<ScriptEntry[]>(localStorage.getItem(pk("script:bodies")), []);
  const ctas = safeJSON<ScriptEntry[]>(localStorage.getItem(pk("script:ctas")), []);
  const exps: Variant[] = safeJSON<any[]>(localStorage.getItem(pk("lab:experiments")), []).map(migrateVariant);
  const videoExps  = exps.filter(e => (!(e as any).adType || (e as any).adType === "video") && e.status !== "Killed");
  const staticExps = exps.filter(e => (e as any).adType === "static" && e.status !== "Killed");
  const filteredExps = adTypeFilter === "static" ? staticExps : videoExps;

  const avatarSummary = avatar.audience.trim() || "Not defined";
  const scriptVariants = hooks.length && bodies.length && ctas.length
    ? hooks.length * bodies.length * ctas.length : 0;
  const experimentsRunning = videoExps.filter(e => e.status === "Testing").length;
  const staticRunning      = staticExps.filter(e => e.status === "Testing").length;
  const videoRunning       = experimentsRunning;

  // Competitor dominance
  const hookCounts = countBy(compRows, r => r.hookType);
  const formatCounts = countBy(compRows, r => r.format);
  const topHookEntry = Object.entries(hookCounts).sort((a, b) => b[1] - a[1])[0];
  const topFormatEntry = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0];
  const dominantHook = topHookEntry?.[0] ?? "—";
  const dominantFormat = topFormatEntry?.[0] ?? "—";

  // Winning variables (from experiments)
  const topHookData    = topByAvgCtr(filteredExps, "hookType");
  const topFormatData  = topByAvgCtr(filteredExps, "creativeFormat");
  const topAngleData    = topByAvgCtr(filteredExps, "primaryAngle");
  const topHeadlineData = topByAvgCtr(staticExps, "headline" as any);
  const topVisualData   = topByAvgCtr(staticExps, "visualConcept" as any);

  const winners: WinnerCard[] = [
    { label: "Top Hook",   value: topHookData.value   || "—", avgCtr: topHookData.avgCtr,   count: topHookData.count,   icon: MousePointerClick, color: "emerald", href: "/creative-lab" },
    { label: "Top Format", value: topFormatData.value || "—", avgCtr: topFormatData.avgCtr, count: topFormatData.count, icon: Layers,            color: "blue",    href: "/creative-lab" },
    { label: "Top Angle",  value: topAngleData.value  || "—", avgCtr: topAngleData.avgCtr,  count: topAngleData.count,  icon: Target,            color: "violet",  href: "/creative-lab" },
  ];

  // Active tests: last 5 (most recent = end of array)
  const activeTests = [...exps]
    .filter(e => e.status !== "Killed" && (adTypeFilter === "static"
      ? (e as any).adType === "static"
      : !(e as any).adType || (e as any).adType === "video"))
    .reverse()
    .slice(0, 5);

  // Pipeline counts
  const pipelineCounts = {
    Producing: filteredExps.filter(e => e.status === "Producing").length,
    Testing:   filteredExps.filter(e => e.status === "Testing").length,
    Paused:    filteredExps.filter(e => e.status === "Paused").length,
    Winner:    filteredExps.filter(e => e.status === "Winner").length,
  };

  // Performance time series: aggregate all TLEntry by date
  const allTL: TLEntry[] = filteredExps.flatMap(e => e.timeline);
  const perfByDate: Record<string, { ctr:number[]; tsr:number[]; hold:number[]; cpa:number[] }> = {};
  allTL.forEach(t => {
    if (!perfByDate[t.date]) perfByDate[t.date] = { ctr:[], tsr:[], hold:[], cpa:[] };
    perfByDate[t.date].ctr.push(t.ctr);
    perfByDate[t.date].tsr.push(t.tsr);
    perfByDate[t.date].hold.push(t.hold);
    perfByDate[t.date].cpa.push(t.cpa);
  });
  const perfData: PerfPoint[] = Object.entries(perfByDate)
    .map(([date, m]) => ({ date, ctr: avg(m.ctr), tsr: avg(m.tsr), hold: avg(m.hold), cpa: avg(m.cpa) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const kpis = {
    avgCTR:  avg(allTL.map(t => t.ctr)),
    avgHold: avg(allTL.map(t => t.hold)),
    avgTSR:  avg(allTL.map(t => t.tsr)),
    avgCPA:  avg(allTL.map(t => t.cpa)),
  };

  // Next experiment suggestion
  const winnerExps = filteredExps.filter(e => e.status === "Winner");
  const best = winnerExps.length ? winnerExps.sort((a, b) => latestCtr(b) - latestCtr(a))[0]
    : filteredExps.length ? [...filteredExps].sort((a, b) => latestCtr(b) - latestCtr(a))[0] : null;
  const keepHook = best?.hookType ?? "";
  const keepAngle = best?.primaryAngle ?? "";
  const formatPool = adTypeFilter === "static" ? STATIC_FORMATS : VIDEO_FORMATS;
  const usedFormats = new Set(exps.map(e => e.creativeFormat));
  const untestedFormats = formatPool.filter(f => !usedFormats.has(f));
  const suggestedFormats = untestedFormats.length >= 3
    ? untestedFormats.slice(0, 3)
    : [...untestedFormats, ...formatPool.filter(f => !untestedFormats.includes(f))].slice(0, 3);

  // ── Action engine ────────────────────────────────────────────────────────
  const actions: ActionItem[] = [];
  const measuredExps = filteredExps.filter(e => e.timeline.length > 0);
  if (measuredExps.length > 0) {
    const allCtrs  = measuredExps.map(e => latestCtr(e));
    const avgAllCtr = avg(allCtrs);
    const avgAllHold = avg(measuredExps.map(e => {
      const t = [...e.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
      return t.hold;
    }));

    // Dedup guard — track which expIds already have an action
    const seen = new Set<string>();

    // 1 · WINNER — status Winner (iterate it), skip already-iterated
    filteredExps.filter(e => e.status === "Winner" && !e.isIterated && !seen.has(e.id)).forEach(e => {
      seen.add(e.id);
      const ctr = latestCtr(e);
      const holdEntry = e.timeline.length ? [...e.timeline].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
      actions.push({
        type: "WINNER", variantId: e.variantId, expId: e.id,
        reason: `${e.variantId} is your top performer with ${ctr.toFixed(1)}% CTR. Time to build more variants from it.`,
        ctr, hold: holdEntry?.hold ?? 0, priority: 1,
      });
    });

    // 2 · LOSER — status Loser (kill it)
    filteredExps.filter(e => e.status === "Loser" && !seen.has(e.id)).forEach(e => {
      seen.add(e.id);
      const ctr = latestCtr(e);
      actions.push({
        type: "LOSER", variantId: e.variantId, expId: e.id,
        reason: `${e.variantId} is underperforming at ${ctr.toFixed(1)}% CTR. Retire it to free up budget.`,
        ctr, hold: 0, priority: 2,
      });
    });

    // 3 · Rule-based signals on Testing variants
    const testingExps = measuredExps.filter(e => e.status === "Testing" && !e.isIterated && !seen.has(e.id));
    const testCtrs    = testingExps.map(e => latestCtr(e));
    const testAvgCtr  = avg(testCtrs);

    // Top performer among Testing — WINNER signal
    if (testingExps.length >= 2) {
      const sorted = [...testingExps].sort((a, b) => latestCtr(b) - latestCtr(a));
      const topExp = sorted[0];
      const topCtr = latestCtr(topExp);
      const secondCtr = latestCtr(sorted[1]);
      if (!seen.has(topExp.id) && topCtr > secondCtr * 1.25 && topCtr > testAvgCtr * 1.2) {
        const holdEntry = [...topExp.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
        seen.add(topExp.id);
        actions.push({
          type: "WINNER", variantId: topExp.variantId, expId: topExp.id,
          reason: `${topExp.variantId} is leading the pack at ${topCtr.toFixed(1)}% CTR — ${Math.round((topCtr / secondCtr - 1) * 100)}% ahead of next best.`,
          ctr: topCtr, hold: holdEntry?.hold ?? 0, priority: 1,
        });
      }

      // Bottom performer among Testing — LOSER signal
      const bottomExp = sorted[sorted.length - 1];
      const bottomCtr = latestCtr(bottomExp);
      if (!seen.has(bottomExp.id) && bottomCtr < testAvgCtr * 0.6 && bottomCtr < avgAllCtr * 0.5) {
        const holdEntry = [...bottomExp.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
        seen.add(bottomExp.id);
        actions.push({
          type: "LOSER", variantId: bottomExp.variantId, expId: bottomExp.id,
          reason: `${bottomExp.variantId} is significantly below average (${bottomCtr.toFixed(1)}% CTR vs ${testAvgCtr.toFixed(1)}% avg). Cut it.`,
          ctr: bottomCtr, hold: holdEntry?.hold ?? 0, priority: 2,
        });
      }
    }

    // WEAK_CTR — strong hold, weak CTR → test new hooks
    testingExps.filter(e => !seen.has(e.id)).forEach(e => {
      const tl = [...e.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
      const ctr = tl.ctr; const hold = tl.hold;
      if (hold >= 45 && ctr < (testAvgCtr || avgAllCtr) * 0.85) {
        seen.add(e.id);
        actions.push({
          type: "WEAK_CTR", variantId: e.variantId, expId: e.id,
          reason: `${e.variantId} holds attention (${hold.toFixed(0)}% hold) but click-through is weak (${ctr.toFixed(1)}% CTR). The hook needs work.`,
          ctr, hold, priority: 3,
        });
      }
    });

    // WEAK_HOLD — low hold rate → body/script is weak
    testingExps.filter(e => !seen.has(e.id)).forEach(e => {
      const tl = [...e.timeline].sort((a, b) => b.date.localeCompare(a.date))[0];
      const hold = tl.hold; const ctr = tl.ctr;
      if (hold < 25 && hold < avgAllHold * 0.7) {
        seen.add(e.id);
        actions.push({
          type: "WEAK_HOLD", variantId: e.variantId, expId: e.id,
          reason: `${e.variantId} is losing viewers fast (${hold.toFixed(0)}% hold rate). The script body isn't landing.`,
          ctr, hold, priority: 4,
        });
      }
    });
  }

  // Sort by priority, cap at 7
  const sortedActions = actions.sort((a, b) => a.priority - b.priority).slice(0, 7);

  return {
    projectName, avatarSummary, competitorCount: compRows.length,
    scriptVariants, experimentsRunning, experimentsTotal: videoExps.length,
    staticCount: staticExps.length, staticRunning,
    videoCount: videoExps.length, videoRunning,
    winners, activeTests,
    topHeadline: { value: topHeadlineData.value || "—", avgCtr: topHeadlineData.avgCtr, count: topHeadlineData.count },
    topVisual:   { value: topVisualData.value   || "—", avgCtr: topVisualData.avgCtr,   count: topVisualData.count  },
    dominantHook, dominantFormat,
    keepHook, keepAngle, suggestedFormats,
    hasExperiments: exps.length > 0,
    hasCompetitors: compRows.length > 0,
    pipelineCounts, perfData, kpis,
    actions: sortedActions,
  };
}

// ─── Reactive hook ────────────────────────────────────────────────────────────
function useDashboardData(adTypeFilter: "video" | "static" = "video") {
  const { projectKey, activeProject } = useProject();
  const [data, setData] = useState<DashData>(() =>
    computeDashData(projectKey, activeProject?.name ?? "My Project", adTypeFilter)
  );
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setData(computeDashData(projectKey, activeProject?.name ?? "My Project", adTypeFilter));
    }, 600);
  }, [projectKey, activeProject?.name, adTypeFilter]);

  useEffect(() => {
    setData(computeDashData(projectKey, activeProject?.name ?? "My Project", adTypeFilter));
    window.addEventListener("clb:write", refresh);
    return () => { window.removeEventListener("clb:write", refresh); clearTimeout(debounce.current); };
  }, [projectKey, refresh, activeProject?.name, adTypeFilter]);

  return data;
}

// ─── Animation variants ───────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Experiment["status"] }) {
  const cfg: Record<string, { cls: string; dot: string }> = {
    Winner:  { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
    Testing: { cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",         dot: "bg-blue-400 animate-pulse" },
    Loser:   { cls: "bg-red-500/15 text-red-400 border-red-500/25",            dot: "bg-red-400" },
    Paused:  { cls: "bg-amber-500/15 text-amber-400 border-amber-500/25",      dot: "bg-amber-400" },
    Planned: { cls: "bg-slate-500/15 text-slate-400 border-slate-500/25",      dot: "bg-slate-400" },
  };
  const c = cfg[status] ?? cfg.Testing;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {status}
    </span>
  );
}

// ─── Section header (shared) ──────────────────────────────────────────────────
function SectionHeader({ title, badge, action }: { title: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="font-display text-lg font-bold text-white whitespace-nowrap">{title}</h2>
      {badge && (
        <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      {action}
    </div>
  );
}

// ─── Action Required ──────────────────────────────────────────────────────────
const ACTION_CFG: Record<ActionType, {
  label:       string;
  color:       string;
  bg:          string;
  border:      string;
  Icon:        React.ElementType;
  actionLabel: string;
  actionDesc:  string;
}> = {
  WINNER:    { label: "Iterate",       color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", Icon: Trophy,        actionLabel: "Iterate",   actionDesc: "Build more variants from this winner" },
  LOSER:     { label: "Kill",          color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     Icon: XCircle,       actionLabel: "Kill",      actionDesc: "Retire this ad and stop spending" },
  WEAK_CTR:  { label: "Test new hooks",color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   Icon: Crosshair,     actionLabel: "Iterate",   actionDesc: "Keep body — test new opening hooks" },
  WEAK_HOLD: { label: "Rewrite script",color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  Icon: Mic2,          actionLabel: "Iterate",   actionDesc: "Body is losing viewers — rewrite the script" },
};

function ActionRequired({ d, projectKey }: { d: DashData; projectKey: (s: string) => string }) {
  const [, navigate] = useLocation();
  const [killedIds, setKilledIds] = useState<Set<string>>(new Set());

  function handleIterate(a: ActionItem) {
    const exp = (() => {
      try {
        const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
        return raw.find(e => e.id === a.expId);
      } catch { return null; }
    })();
    if (exp) {
      // Mark source variant as iterated so it won't resurface in action signals
      try {
        const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
        localStorage.setItem(projectKey("lab:experiments"), JSON.stringify(
          raw.map(e => e.id === a.expId ? { ...e, isIterated: true, status: "Iterated" } : e)
        ));
        // clb:write fires automatically via the patched localStorage.setItem
      } catch { /* noop */ }

      const decisionState = exp.timeline?.length
        ? (() => {
            const t = [...(exp.timeline as any[])].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
            if (t.ctr > 3 && t.hold > 50) return "VALIDATED_BODY";
            if (t.ctr < 1 && t.hold > 40) return "WEAK_SIGNAL";
            return "NO_SIGNAL";
          })()
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
        decisionState,
        iterationType:  a.type === "WEAK_HOLD" ? "HOOK" : a.type === "WEAK_CTR" ? "HOOK" : "HOOK",
      }));
    }
    navigate("/creative-iteration");
  }

  function handleKill(a: ActionItem) {
    setKilledIds(prev => { const s = new Set(prev); s.add(a.expId); return s; });
    try {
      const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const now = new Date().toISOString();
      const updated = raw.map(e => e.id === a.expId
        ? { ...e, status: "Killed", killedAt: now }
        : e);
      localStorage.setItem(projectKey("lab:experiments"), JSON.stringify(updated));
      // clb:write fires automatically via the patched localStorage.setItem
    } catch { /* noop */ }
  }

  function handleView(a: ActionItem) {
    navigate(`/experiment-timeline?exp=${a.expId}`);
  }

  if (d.actions.length === 0) {
    return (
      <section>
        <SectionHeader title="Action Required" />
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/6 bg-white/[0.015]">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground/25 shrink-0" />
          <p className="text-sm text-muted-foreground/35">No clear actions right now. Continue testing and collecting data.</p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Action Required" badge={`${d.actions.length} signal${d.actions.length !== 1 ? "s" : ""}`} />
      <AnimatePresence initial={false}>
        <div className="flex flex-col gap-2.5">
          {d.actions.map((a) => {
            const cfg = ACTION_CFG[a.type];
            const isKilled = killedIds.has(a.expId);
            return (
              <motion.div
                key={a.expId + a.type}
                variants={item}
                exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className={`flex items-start sm:items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-300
                  ${isKilled
                    ? "border-white/6 bg-white/[0.015] opacity-40 pointer-events-none"
                    : `${cfg.border} ${cfg.bg}`}`}
              >
                {/* Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border
                  ${isKilled ? "bg-white/[0.04] border-white/10" : `${cfg.bg} ${cfg.border}`}`}>
                  {isKilled
                    ? <CheckCircle2 className="w-4 h-4 text-muted-foreground/40" />
                    : <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {isKilled
                      ? <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Killed</span>
                      : <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>}
                    <span className="font-mono text-[11px] font-bold text-foreground/80 bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded">
                      {a.variantId}
                    </span>
                    {isKilled
                      ? <span className="text-[10px] text-muted-foreground/30 font-medium">Removed from testing</span>
                      : <span className="text-[10px] text-muted-foreground/30 font-medium">
                          CTR {a.ctr.toFixed(1)}%{a.hold > 0 ? ` · Hold ${a.hold.toFixed(0)}%` : ""}
                        </span>}
                  </div>
                  <p className="text-[11px] text-foreground/55 leading-relaxed truncate">{a.reason}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(a.type === "WINNER" || a.type === "WEAK_CTR" || a.type === "WEAK_HOLD") && (
                    <button
                      onClick={() => handleIterate(a)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] border border-white/10 text-foreground/70 hover:bg-white/[0.12] hover:text-foreground transition-colors"
                    >
                      <GitBranch className="w-3 h-3" />Iterate
                    </button>
                  )}
                  {a.type === "LOSER" && (
                    isKilled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.04] border border-white/8 text-muted-foreground/35 cursor-default select-none">
                        <CheckCircle2 className="w-3 h-3" />Killed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleKill(a)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3 h-3" />Kill
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handleView(a)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.04] border border-white/8 text-muted-foreground/50 hover:text-foreground/70 hover:bg-white/[0.08] transition-colors"
                  >
                    <Eye className="w-3 h-3" />View
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </section>
  );
}

// ─── Section 1: Project Overview ──────────────────────────────────────────────
function ProjectOverview({ d, adTypeFilter }: { d: DashData; adTypeFilter: "video" | "static" }) {
  const stats = [
    { label: "Customer Avatar", value: d.avatarSummary, icon: Users,         href: "/market-understanding", empty: d.avatarSummary === "Not defined" },
    { label: "Competitor Ads",  value: d.competitorCount > 0 ? String(d.competitorCount) : "None logged", icon: Eye,  href: "/competitor-intelligence", empty: d.competitorCount === 0 },
    { label: "Script Variants", value: d.scriptVariants > 0 ? String(d.scriptVariants) : "None built",   icon: GitFork, href: "/script-testing",         empty: d.scriptVariants === 0 },
    { label: "Experiments",     value: (() => {
        if (adTypeFilter === "video") {
          if (d.videoCount === 0) return "None yet";
          return `${d.videoRunning} active / ${d.videoCount} total`;
        }
        if (adTypeFilter === "static") {
          if (d.staticCount === 0) return "None yet";
          return `${d.staticRunning} static active`;
        }
        if (d.experimentsTotal === 0 && d.staticCount === 0) return "None yet";
        if (d.staticCount > 0 && d.experimentsTotal > 0) return `${d.experimentsRunning} video · ${d.staticRunning} static`;
        if (d.staticCount > 0) return `${d.staticRunning} static ads active`;
        return `${d.experimentsRunning} active / ${d.experimentsTotal} total`;
      })(), icon: FlaskConical, href: "/creative-lab", empty: d.experimentsTotal === 0 && d.staticCount === 0 },
  ];

  return (
    <div className="rounded-2xl border border-white/8 bg-card/30 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-primary/60 via-accent/40 to-transparent" />
      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Project name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 border border-white/10 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Active Project</p>
            <h1 className="text-lg font-display font-extrabold text-white leading-tight">{d.projectName}</h1>
          </div>
        </div>

        <div className="hidden sm:block w-px h-10 bg-white/8 shrink-0" />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          {stats.map(s => (
            <Link key={s.label} href={s.href}>
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 group cursor-pointer ${s.empty ? "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"}`}>
                <s.icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${s.empty ? "text-muted-foreground/20" : "text-primary/60 group-hover:text-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/35">{s.label}</p>
                  <p className={`text-xs font-semibold truncate ${s.empty ? "text-muted-foreground/30" : "text-white"}`}>{s.value}</p>
                </div>
                {s.label === "Experiments" && d.staticCount > 0 && (
                  <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">
                    🖼 {d.staticCount} static
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Section 2: Winning Variables ─────────────────────────────────────────────
function WinningVariables({ d, filter }: { d: DashData; filter: "video" | "static" }) {
  const colorMap: Record<string, { card: string; bar: string; pill: string; icon: string }> = {
    emerald: { card: "border-emerald-500/20", bar: "bg-emerald-500",    pill: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", icon: "bg-emerald-500/10 text-emerald-400" },
    blue:    { card: "border-blue-500/20",    bar: "bg-blue-500",      pill: "bg-blue-500/10 text-blue-300 border-blue-500/20",         icon: "bg-blue-500/10 text-blue-400" },
    violet:  { card: "border-violet-500/20",  bar: "bg-violet-500",    pill: "bg-violet-500/10 text-violet-300 border-violet-500/20",   icon: "bg-violet-500/10 text-violet-400" },
  };

  const videoWinners = [
    { label: "Top Hook",   value: d.winners[0]?.value || "—", avgCtr: d.winners[0]?.avgCtr || 0, count: d.winners[0]?.count || 0, icon: MousePointerClick, color: "emerald", href: "/creative-lab" },
    { label: "Top Format", value: d.winners[1]?.value || "—", avgCtr: d.winners[1]?.avgCtr || 0, count: d.winners[1]?.count || 0, icon: Layers,            color: "blue",    href: "/creative-lab" },
    { label: "Top Angle",  value: d.winners[2]?.value || "—", avgCtr: d.winners[2]?.avgCtr || 0, count: d.winners[2]?.count || 0, icon: Target,            color: "violet",  href: "/creative-lab" },
  ];
  const staticWinners = [
    { label: "Top Headline", value: d.topHeadline.value, avgCtr: d.topHeadline.avgCtr, count: d.topHeadline.count, icon: FileText, color: "violet",  href: "/creative-lab" },
    { label: "Top Visual",   value: d.topVisual.value,   avgCtr: d.topVisual.avgCtr,   count: d.topVisual.count,   icon: Image,    color: "blue",    href: "/creative-lab" },
    { label: "Top Angle",    value: d.winners[2]?.value || "—", avgCtr: d.winners[2]?.avgCtr || 0, count: d.winners[2]?.count || 0, icon: Target, color: "emerald", href: "/creative-lab" },
  ];
  const winners = filter === "static" ? staticWinners : videoWinners;

  type WEntry = typeof videoWinners[number];
  const renderCard = (w: WEntry) => {
    const c = colorMap[w.color];
    const hasData = w.value !== "—";
    return (
      <motion.div key={w.label} variants={item}>
        <Card className={`bg-card/40 overflow-hidden h-full ${c.card}`}>
          <div className={`h-0.5 ${c.bar} opacity-60`} />
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
                <w.icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{w.label}</p>
            </div>
            {hasData ? (
              <div className="flex flex-col gap-2">
                <p className="text-base font-bold text-white leading-tight">{w.value}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.pill}`}>
                    {w.avgCtr.toFixed(1)}% avg CTR
                  </span>
                  <span className="text-[10px] text-muted-foreground/30">{w.count} exp.</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${c.bar} opacity-70`} style={{ width: `${Math.min(100, w.avgCtr * 12)}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/30">No data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (!d.hasExperiments) {
    return (
      <section>
        <SectionHeader title="Winning Variables" badge="From Creative Lab" />
        <div className="grid grid-cols-3 gap-4">
          {winners.map(w => (
            <Card key={w.label} className="bg-card/30 border-white/5 overflow-hidden">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center gap-2.5 min-h-[120px]">
                <w.icon className="w-5 h-5 text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground/30">{w.label}</p>
                <Link href={w.href}>
                  <span className="text-[11px] font-medium text-primary/40 hover:text-primary flex items-center gap-1 transition-colors">
                    Add experiments <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title="Winning Variables" badge="From Creative Lab" action={
        <Link href="/creative-lab">
          <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </span>
        </Link>
      } />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.map(w => renderCard(w))}
      </div>
    </section>
  );
}

// ─── Section 3a: Active Tests ─────────────────────────────────────────────────
function ActiveTests({ d }: { d: DashData }) {
  return (
    <Card className="bg-card/40 border-white/8 flex flex-col h-full">
      <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-cyan-500/30 to-transparent" />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/50">Active Tests</p>
              <h3 className="text-sm font-bold text-white">Recent Experiments</h3>
            </div>
          </div>
          <Link href="/creative-lab">
            <span className="text-[11px] font-medium text-primary/40 hover:text-primary flex items-center gap-1 transition-colors">
              All experiments <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>

        {!d.hasExperiments ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
            <FlaskConical className="w-8 h-8 text-muted-foreground/15" />
            <p className="text-xs text-muted-foreground/40">No experiments yet</p>
            <Link href="/creative-lab">
              <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
                Add first experiment <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-2 pb-1 border-b border-white/5">
              {["ID", "Variant", "Hook", "Format", "CTR", "Status"].map(h => (
                <span key={h} className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">{h}</span>
              ))}
            </div>
            {d.activeTests.map(exp => (
              <div key={exp.id} className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 items-center px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${exp.parentVariantId ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/[0.05] text-foreground/50 border-white/10"}`}>
                  {exp.variantId || "—"}
                </span>
                <span className="text-xs font-medium text-foreground/80 truncate" title={exp.adVariant}>
                  {exp.adVariant || "—"}
                </span>
                <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap truncate max-w-[80px]" title={exp.hookType}>
                  {exp.hookType || "—"}
                </span>
                <span className="text-[10px] text-muted-foreground/50 whitespace-nowrap truncate max-w-[80px]" title={exp.creativeFormat}>
                  {exp.creativeFormat || "—"}
                </span>
                <span className={`text-xs font-bold whitespace-nowrap ${latestCtr(exp) >= 4 ? "text-emerald-400" : latestCtr(exp) >= 2 ? "text-white" : "text-muted-foreground/50"}`}>
                  {latestCtr(exp) > 0 ? `${latestCtr(exp).toFixed(1)}%` : "—"}
                </span>
                <StatusBadge status={exp.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 3b: Market Snapshot ──────────────────────────────────────────────
function MarketSnapshot({ d }: { d: DashData }) {
  return (
    <Card className="bg-card/40 border-white/8 flex flex-col h-full">
      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/50">Market Snapshot</p>
            <h3 className="text-sm font-bold text-white">Competitor Research</h3>
          </div>
        </div>

        {!d.hasCompetitors ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
            <BarChart3 className="w-8 h-8 text-muted-foreground/15" />
            <p className="text-xs text-muted-foreground/40">No competitor ads logged</p>
            <Link href="/competitor-intelligence">
              <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
                Log competitors <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            {/* Count badge */}
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/15">
              <span className="text-xs text-muted-foreground/60">Competitor ads logged</span>
              <span className="text-lg font-extrabold text-white">{d.competitorCount}</span>
            </div>

            {/* Dominant hook */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/6">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Dominant Hook</p>
              <p className="text-sm font-bold text-white">{d.dominantHook}</p>
              <p className="text-[11px] text-muted-foreground/40">Most used hook across competitors</p>
            </div>

            {/* Dominant format */}
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/6">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Dominant Format</p>
              <p className="text-sm font-bold text-white">{d.dominantFormat}</p>
              <p className="text-[11px] text-muted-foreground/40">Most common creative format used</p>
            </div>

            <Link href="/competitor-intelligence" className="mt-auto">
              <span className="text-[11px] font-medium text-violet-400/50 hover:text-violet-400 flex items-center gap-1 transition-colors">
                View full competitor board <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section: Performance Overview ───────────────────────────────────────────
type PerfMetric = "ctr" | "tsr" | "hold" | "cpa";

const METRIC_CFG: Record<PerfMetric, { label:string; color:string; unit:string; decimals:number }> = {
  ctr:  { label:"CTR",       color:"#8b5cf6", unit:"%",  decimals:1 },
  tsr:  { label:"TSR",       color:"#06b6d4", unit:"%",  decimals:1 },
  hold: { label:"Hold Rate", color:"#f59e0b", unit:"%",  decimals:1 },
  cpa:  { label:"CPA",       color:"#10b981", unit:"$",  decimals:0 },
};

const KPI_CFG = [
  { key:"avgCTR"  as const, label:"Avg CTR",       unit:"%",  decimals:1, color:"violet" },
  { key:"avgHold" as const, label:"Avg Hold Rate",  unit:"%",  decimals:1, color:"amber" },
  { key:"avgTSR"  as const, label:"Avg TSR",        unit:"%",  decimals:1, color:"cyan" },
  { key:"avgCPA"  as const, label:"Avg CPA",        unit:"$",  decimals:0, color:"emerald" },
];

const KPI_COLOR: Record<string, string> = {
  violet:  "bg-violet-500/[0.08] border-violet-500/20 text-violet-300",
  amber:   "bg-amber-500/[0.08]  border-amber-500/20  text-amber-300",
  cyan:    "bg-cyan-500/[0.08]   border-cyan-500/20   text-cyan-300",
  emerald: "bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-300",
};

function formatDate(d: string) {
  const [, m, day] = d.split("-");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${MONTHS[parseInt(m,10)-1]} ${parseInt(day,10)}`;
}

function PerformanceOverview({ d, adTypeFilter }: { d: DashData; adTypeFilter: "video" | "static" }) {
  const isVideo = adTypeFilter === "video";
  const [metric, setMetric] = useState<PerfMetric>("ctr");
  // Reset to CTR when switching away from video if current metric is video-only
  const visibleMetric: PerfMetric = (!isVideo && (metric === "tsr" || metric === "hold")) ? "ctr" : metric;
  const cfg = METRIC_CFG[visibleMetric];
  const hasData = d.perfData.length > 0;
  const visibleKpis = isVideo ? KPI_CFG : KPI_CFG.filter(k => k.key === "avgCTR" || k.key === "avgCPA");
  const visibleMetrics = (Object.keys(METRIC_CFG) as PerfMetric[]).filter(m => isVideo || (m !== "tsr" && m !== "hold"));

  return (
    <section>
      <SectionHeader
        title="Performance Overview"
        badge="Experiment Timeline data"
        action={
          <Link href="/experiment-timeline">
            <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
              Open Timeline <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />

      {/* KPI cards */}
      <div className={`grid gap-3 mb-5 ${isVideo ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}>
        {visibleKpis.map(k => {
          const val = d.kpis[k.key];
          const cls = KPI_COLOR[k.color];
          return (
            <div key={k.key} className={`flex flex-col gap-1.5 px-4 py-3.5 rounded-xl border ${cls}`}>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{k.label}</p>
              <p className="text-2xl font-extrabold text-white leading-none">
                {val > 0 ? (k.unit === "$" ? `$${val.toFixed(k.decimals)}` : `${val.toFixed(k.decimals)}${k.unit}`) : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Chart card */}
      <Card className="bg-card/40 border-white/8 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-cyan-500/30 to-transparent" />
        <CardContent className="p-5 flex flex-col gap-4">
          {/* Metric toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Performance Over Time</p>
              <h3 className="text-sm font-bold text-white">Aggregated across all experiments</h3>
            </div>
            <div className="flex gap-1.5 bg-white/[0.04] border border-white/8 rounded-xl p-1">
              {visibleMetrics.map(m => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${visibleMetric === m ? "bg-white/10 text-white" : "text-muted-foreground/40 hover:text-muted-foreground/70"}`}
                >
                  {METRIC_CFG[m].label}
                </button>
              ))}
            </div>
          </div>

          {!hasData ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/10" />
              <p className="text-xs text-muted-foreground/35 max-w-xs">
                No performance data yet. Add timeline entries to your experiments to see the chart.
              </p>
              <Link href="/experiment-timeline">
                <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
                  Open Experiment Timeline <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.perfData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize:10, fill:"rgba(255,255,255,0.25)", fontWeight:600 }}
                  axisLine={{ stroke:"rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => cfg.unit === "$" ? `$${v}` : `${v}${cfg.unit}`}
                  tick={{ fontSize:10, fill:"rgba(255,255,255,0.25)", fontWeight:600 }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />
                <Tooltip
                  contentStyle={{ background:"#0f0f1a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", fontSize:11 }}
                  labelFormatter={formatDate}
                  formatter={(val: number) => [
                    cfg.unit === "$" ? `$${val.toFixed(cfg.decimals)}` : `${val.toFixed(cfg.decimals)}${cfg.unit}`,
                    cfg.label,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={visibleMetric}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ fill:cfg.color, r:3, strokeWidth:0 }}
                  activeDot={{ r:5, strokeWidth:0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Section: Experiment Pipeline ─────────────────────────────────────────────
const PIPELINE_CFG = [
  { key:"Producing" as const, label:"Producing", icon:Layers,        color:"bg-violet-500/[0.08] border-violet-500/20", num:"text-violet-300", icon_cls:"text-violet-400" },
  { key:"Testing"   as const, label:"Testing",   icon:FlaskConical,  color:"bg-amber-500/[0.08]  border-amber-500/20",  num:"text-amber-300",  icon_cls:"text-amber-400" },
  { key:"Paused"    as const, label:"Paused",    icon:Pause,         color:"bg-slate-500/[0.08]  border-slate-500/20",  num:"text-slate-300",  icon_cls:"text-slate-400" },
  { key:"Winner"    as const, label:"Winners",   icon:CheckCircle2,  color:"bg-emerald-500/[0.08] border-emerald-500/20", num:"text-emerald-300", icon_cls:"text-emerald-400" },
];

function ExperimentPipeline({ d }: { d: DashData }) {
  return (
    <section>
      <SectionHeader
        title="Experiment Pipeline"
        badge="Status counts"
        action={
          <Link href="/creative-lab">
            <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
              View Creative Lab <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PIPELINE_CFG.map(p => {
          const count = d.pipelineCounts[p.key];
          return (
            <Link key={p.key} href="/creative-lab">
              <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all hover:bg-white/[0.04] cursor-pointer ${p.color}`}>
                <div className={`w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0`}>
                  <p.icon className={`w-4 h-4 ${p.icon_cls}`} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{p.label}</p>
                  <p className={`text-2xl font-extrabold leading-none mt-0.5 ${p.num}`}>{count}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Section 4: Next Experiment ───────────────────────────────────────────────
function NextExperiment({ d, filter }: { d: DashData; filter: "video" | "static" }) {
  return (
    <section>
      <SectionHeader title="Next Experiment" badge="Recommendation" />
      <Card className="bg-card/40 border-amber-500/15 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-orange-500/30 to-transparent" />
        <CardContent className="p-6">
          {!d.hasExperiments ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground/15" />
              <p className="text-xs text-muted-foreground/40 max-w-xs">
                Log experiments in Creative Lab to get personalised next-test recommendations.
              </p>
              <Link href="/creative-lab">
                <span className="text-[11px] font-medium text-primary/50 hover:text-primary flex items-center gap-1 transition-colors">
                  Add first experiment <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Keep */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Trophy className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Keep</p>
                </div>
                <div className="flex flex-col gap-2">
                  {d.keepHook && (
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="w-3 h-3 text-emerald-400/50 shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider">Hook</p>
                        <p className="text-sm font-bold text-white">{d.keepHook}</p>
                      </div>
                    </div>
                  )}
                  {d.keepAngle && (
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-emerald-400/50 shrink-0" />
                      <div>
                        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider">Angle</p>
                        <p className="text-sm font-bold text-white">{d.keepAngle}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test next */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-amber-500/[0.07] border border-amber-500/15">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Target className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/60">Test Next</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-bold text-white">
                    {filter === "static" ? "New Visual Combinations" : "New Creative Formats"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
                    {filter === "static"
                      ? "Isolate visual as the variable — hold headline and angle constant."
                      : "Isolate format as the variable — hold hook and angle constant."}
                  </p>
                </div>
              </div>

              {/* Suggested tests */}
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/6">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-2.5 h-2.5 text-muted-foreground/60" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Suggested Tests</p>
                </div>
                <div className="flex flex-col gap-2">
                  {d.suggestedFormats.map((f, i) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-white/[0.06] text-[9px] flex items-center justify-center text-muted-foreground/40 shrink-0 font-bold">{i + 1}</span>
                      <span className="text-xs text-foreground/70 font-medium">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Navigation module card ───────────────────────────────────────────────────
const strategyModules = [
  { title: "Framework",    description: "Interactive 4-phase ad testing methodology.",      icon: GitFork,      href: "/framework",               color: "from-violet-500 to-indigo-500",   badge: "Methodology" },
  { title: "Market Intel", description: "Define avatars, map pain points and key angles.",  icon: Users,        href: "/market-understanding",    color: "from-blue-500 to-cyan-400",       badge: "Phase 1" },
  { title: "Competitors",  description: "Reverse-engineer winning ads in your space.",       icon: BarChart3,    href: "/competitor-intelligence", color: "from-purple-500 to-pink-500",     badge: "Phase 2" },
  { title: "Hypothesis",   description: "Generate structured hypotheses before you test.",  icon: Lightbulb,    href: "/hypothesis",              color: "from-amber-400 to-yellow-500",    badge: "Phase 2b" },
];

const executionModules = [
  { title: "Script Matrix",      description: "Test hooks, bodies, and CTAs systematically.",          icon: FlaskConical, href: "/script-testing",         color: "from-amber-500 to-orange-500",  badge: "Phase 3" },
  { title: "Creative Lab",       description: "Track, measure and compare all your ad experiments.",   icon: TrendingUp,   href: "/creative-lab",           color: "from-emerald-500 to-green-400", badge: "Experiments" },
  { title: "Experiment Timeline",description: "Visualise the full arc of every creative experiment.",  icon: Eye,          href: "/experiment-timeline",    color: "from-blue-500 to-cyan-400",     badge: "Tracking" },
  { title: "Iteration",          description: "Scale winners through rapid creative iteration.",        icon: Zap,          href: "/creative-iteration",     color: "from-emerald-500 to-teal-400",  badge: "Phase 4" },
];

const knowledgeBaseModules = [
  { title: "Awareness Levels",  description: "Match messaging to customer awareness stage.",           icon: Radio,      href: "/awareness-levels",   color: "from-cyan-400 to-blue-500",     badge: "REFERENCE" },
  { title: "Angle Library",     description: "Research angles and unique positioning frameworks.",     icon: Crosshair,  href: "/angle-library",      color: "from-purple-400 to-indigo-500", badge: "REFERENCE" },
  { title: "Hook Library",      description: "10 proven hook frameworks with swipe-ready examples.",   icon: BookMarked, href: "/hook-library",       color: "from-amber-400 to-yellow-500",  badge: "REFERENCE" },
  { title: "Format Library",    description: "Creative formats and production templates.",              icon: Layers,     href: "/format-library",     color: "from-blue-400 to-cyan-500",     badge: "REFERENCE" },
  { title: "Static Ad Library", description: "Proven ad designs and layout combinations.",              icon: Image,      href: "/static-ad-library",  color: "from-pink-400 to-rose-500",     badge: "REFERENCE" },
  { title: "Campaign Structure",description: "Plan campaigns across channels and cohorts.",             icon: Network,    href: "/campaign-structure", color: "from-emerald-400 to-teal-500",  badge: "REFERENCE" },
];

function ModuleCard({ mod }: { mod: typeof strategyModules[0] }) {
  return (
    <motion.div variants={item}>
      <Link href={mod.href} className="block group h-full">
        <Card className="h-full bg-card/30 border-white/5 hover:border-white/15 transition-all duration-300 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/[0.03] group-hover:to-transparent transition-all duration-500 pointer-events-none" />
          <CardContent className="p-5 flex flex-col gap-3 h-full relative z-10">
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${mod.color} p-[1px] group-hover:-translate-y-0.5 transition-transform duration-300`}>
                <div className="w-full h-full bg-card rounded-[11px] flex items-center justify-center">
                  <mod.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {mod.badge}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{mod.title}</h3>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">{mod.description}</p>
            </div>
            <div className="mt-auto flex items-center text-[11px] font-semibold text-primary/50 group-hover:text-primary transition-colors">
              Open <ArrowRight className="w-3 h-3 ml-1 transform group-hover:translate-x-0.5 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [adTypeFilter, setAdTypeFilter] = useState<"video" | "static">("video");
  const d = useDashboardData(adTypeFilter);
  const { projectKey } = useProject();

  return (
    <PageTransition>
      <motion.div
        className="flex flex-col gap-8 py-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* 1 · My Project */}
        <motion.div variants={item}>
          <ProjectOverview d={d} adTypeFilter={adTypeFilter} />
        </motion.div>

        {/* 2 · Ad type filter */}
        <motion.div variants={item}>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/8 w-fit">
            {([
              { key: "video",  label: "🎬 Video" },
              { key: "static", label: "🖼 Static" },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setAdTypeFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  adTypeFilter === tab.key
                    ? "bg-primary/15 border border-primary/25 text-primary"
                    : "text-muted-foreground/50 hover:text-muted-foreground/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 3 · Performance Overview */}
        <motion.div variants={item}>
          <PerformanceOverview d={d} adTypeFilter={adTypeFilter} />
        </motion.div>

        {/* 3 · Action Required */}
        <motion.div variants={item}>
          <ActionRequired d={d} projectKey={projectKey} />
        </motion.div>

        {/* 4 · Winning Variables */}
        <motion.div variants={item}>
          <WinningVariables d={d} filter={adTypeFilter} />
        </motion.div>

        {/* 5 · Experiment Pipeline */}
        <motion.div variants={item}>
          <ExperimentPipeline d={d} />
        </motion.div>

        {/* 5b · Active Tests + Market Snapshot */}
        <motion.div variants={item}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3">
              <ActiveTests d={d} />
            </div>
            <div className="lg:col-span-2">
              <MarketSnapshot d={d} />
            </div>
          </div>
        </motion.div>

        {/* 6 · Next Experiment */}
        <motion.div variants={item}>
          <NextExperiment d={d} filter={adTypeFilter} />
        </motion.div>

        {/* 7 · Navigation: Strategy */}
        <section>
          <SectionHeader title="Strategy" badge={`${strategyModules.length} tools`} />
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {strategyModules.map(m => <ModuleCard key={m.href} mod={m} />)}
          </motion.div>
        </section>

        {/* 8 · Navigation: Execution */}
        <section>
          <SectionHeader title="Execution" badge={`${executionModules.length} tools`} />
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {executionModules.map(m => <ModuleCard key={m.href} mod={m} />)}
          </motion.div>
        </section>

        {/* 9 · Navigation: Knowledge Base */}
        <section>
          <SectionHeader title="Knowledge Base" badge={`${knowledgeBaseModules.length} resources`} />
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {knowledgeBaseModules.map(m => <ModuleCard key={m.href} mod={m} />)}
          </motion.div>
        </section>

      </motion.div>
    </PageTransition>
  );
}
