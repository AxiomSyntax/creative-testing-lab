import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Lightbulb, ArrowRight,
  Eye, Trophy, Target, Sparkles, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/contexts/ProjectContext";
import { Variant, migrateVariant } from "@/pages/experiment-timeline";

// ── Raw data types (mirrors the pages' interfaces) ────────────────────────────
interface CompRow {
  id: string;
  brand: string;
  hookType: string;
  angle: string;
  format: string;
  emotion: string;
  cta: string;
}

type Experiment = Variant;

function expCtr(e: Experiment): number {
  if (!e.timeline.length) return 0;
  return [...e.timeline].sort((a, b) => b.day - a.day)[0].ctr;
}

// ── Insight output types ───────────────────────────────────────────────────────
interface MarketInsight {
  hasData: boolean;
  competitorCount: number;
  topAngle: string;
  topAnglePct: number;
  topAngleCount: number;
  topFormat: string;
  suggestedAngle: string;
  hookDiversity: number;
}

interface ExperimentInsight {
  hasData: boolean;
  experimentCount: number;
  winnerCount: number;
  bestHook: string;
  bestHookCtr: number;
  avgCtr: number;
  ctrDelta: number;
  bestAngle: string;
  bestAngleCtr: number;
  multipleHooks: boolean;
}

interface NextTestSuggestion {
  hasData: boolean;
  keepVariable: string;
  keepValue: string;
  testVariable: string;
  testReason: string;
  suggestions: string[];
  baselineVariant: string;
}

interface StrategyInsights {
  market: MarketInsight;
  experiment: ExperimentInsight;
  nextTest: NextTestSuggestion;
  lastUpdated: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function countBy<T>(arr: T[], key: (v: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  arr.forEach(v => {
    const k = key(v);
    if (k) result[k] = (result[k] ?? 0) + 1;
  });
  return result;
}

function topEntry(counts: Record<string, number>): [string, number] {
  const entries = Object.entries(counts);
  if (!entries.length) return ["", 0];
  return entries.sort((a, b) => b[1] - a[1])[0];
}

function safeJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// All possible angles — used to find untested ones
const ALL_ANGLES = [
  "Pain Point","Transformation","Social Proof","Curiosity","Authority",
  "Comparison","Urgency","Ease of Use","Time Saving","Cost Reduction",
  "Fear + Relief","Mechanism Reveal","Transformation Story",
];

// ── Core computation ─────────────────────────────────────────────────────────
function computeInsights(projectKey: (s: string) => string): StrategyInsights {
  // ── Read raw data ──────────────────────────────────────────────────────────
  const compRows = safeJSON<CompRow[]>(
    localStorage.getItem(projectKey("competitors:rows")), []
  ).filter(r => r.brand.trim() !== "");

  const experiments: Experiment[] = safeJSON<any[]>(
    localStorage.getItem(projectKey("lab:experiments")), []
  ).map(migrateVariant);

  // ── Market Insight ─────────────────────────────────────────────────────────
  const market: MarketInsight = (() => {
    if (compRows.length === 0) {
      return { hasData: false, competitorCount: 0, topAngle: "", topAnglePct: 0,
               topAngleCount: 0, topFormat: "", suggestedAngle: "", hookDiversity: 0 };
    }

    const angleCounts = countBy(compRows, r => r.angle);
    const formatCounts = countBy(compRows, r => r.format);

    const [topAngle, topAngleCount] = topEntry(angleCounts);
    const [topFormat]               = topEntry(formatCounts);

    const topAnglePct = Math.round((topAngleCount / compRows.length) * 100);
    const hookDiversity = Object.keys(countBy(compRows, r => r.hookType)).length;

    // Suggest the angle competitors are NOT using
    const usedAngles = new Set(Object.keys(angleCounts));
    const suggestedAngle = ALL_ANGLES.find(a => !usedAngles.has(a)) ?? "Curiosity";

    return { hasData: true, competitorCount: compRows.length,
             topAngle, topAnglePct, topAngleCount,
             topFormat, suggestedAngle, hookDiversity };
  })();

  // ── Experiment Insight ─────────────────────────────────────────────────────
  const experiment: ExperimentInsight = (() => {
    if (experiments.length === 0) {
      return { hasData: false, experimentCount: 0, winnerCount: 0, bestHook: "",
               bestHookCtr: 0, avgCtr: 0, ctrDelta: 0, bestAngle: "",
               bestAngleCtr: 0, multipleHooks: false };
    }

    const winners = experiments.filter(e => e.status === "Winner");
    const totalAvgCtr = avg(experiments.map(expCtr));

    // Group by hook type → avg CTR
    const hookGroups: Record<string, number[]> = {};
    experiments.forEach(e => {
      if (!e.hookType) return;
      (hookGroups[e.hookType] ??= []).push(expCtr(e));
    });
    const hookAvgs = Object.fromEntries(
      Object.entries(hookGroups).map(([h, ctrs]) => [h, avg(ctrs)])
    );
    const sortedHooks = Object.entries(hookAvgs).sort((a, b) => b[1] - a[1]);
    const [bestHook, bestHookCtr] = sortedHooks[0] ?? ["", 0];
    const secondCtr = sortedHooks[1]?.[1] ?? totalAvgCtr;
    const ctrDelta = secondCtr ? ((bestHookCtr - secondCtr) / secondCtr) * 100 : 0;

    // Best angle by avg CTR
    const angleGroups: Record<string, number[]> = {};
    experiments.forEach(e => {
      if (!e.primaryAngle) return;
      (angleGroups[e.primaryAngle] ??= []).push(expCtr(e));
    });
    const angleAvgs = Object.entries(angleGroups).map(([a, ctrs]) => [a, avg(ctrs)] as [string, number]);
    const [bestAngle, bestAngleCtr] = angleAvgs.sort((a, b) => b[1] - a[1])[0] ?? ["", 0];

    return { hasData: true, experimentCount: experiments.length,
             winnerCount: winners.length, bestHook, bestHookCtr,
             avgCtr: totalAvgCtr, ctrDelta, bestAngle, bestAngleCtr,
             multipleHooks: sortedHooks.length > 1 };
  })();

  // ── Next Test Suggestion ───────────────────────────────────────────────────
  const nextTest: NextTestSuggestion = (() => {
    if (experiments.length === 0) {
      return { hasData: false, keepVariable: "", keepValue: "", testVariable: "",
               testReason: "", suggestions: [], baselineVariant: "" };
    }

    const winners = experiments.filter(e => e.status === "Winner");
    const baseline = winners.length > 0
      ? winners.sort((a, b) => expCtr(b) - expCtr(a))[0]
      : experiments.sort((a, b) => expCtr(b) - expCtr(a))[0];

    // Keep the best-performing hook type
    const keepVariable = "Hook Type";
    const keepValue    = baseline.hookType || experiment.bestHook;

    // Suggest angles not yet tested with this hook or not in winners
    const testedAngles = new Set(experiments.map(e => e.primaryAngle));
    const untestedAngles = ALL_ANGLES.filter(a => !testedAngles.has(a));

    // Fallback: tested angles that were losers (worth retesting with better hook)
    const loserAngles = experiments
      .filter(e => e.status === "Loser")
      .map(e => e.primaryAngle)
      .filter((a, i, arr) => arr.indexOf(a) === i && a !== baseline.primaryAngle);

    const suggestions = [
      ...untestedAngles,
      ...loserAngles,
    ].filter(a => a !== baseline.primaryAngle).slice(0, 3);

    // Pad to 3 if needed
    const extras = ALL_ANGLES.filter(a => !suggestions.includes(a) && a !== baseline.primaryAngle);
    while (suggestions.length < 3 && extras.length) {
      suggestions.push(extras.shift()!);
    }

    const testVariable = "Body Angle";
    const testReason = untestedAngles.length > 0
      ? `${untestedAngles.length} angle${untestedAngles.length > 1 ? "s" : ""} not yet tested`
      : "Retry lower-performing angles with winning hook";

    return { hasData: true, keepVariable, keepValue, testVariable,
             testReason, suggestions: suggestions.slice(0, 3),
             baselineVariant: baseline.adVariant || `${baseline.hookType} / ${baseline.primaryAngle}` };
  })();

  return { market, experiment, nextTest, lastUpdated: Date.now() };
}

// ── Hook: reactive insights ───────────────────────────────────────────────────
function useStrategyInsights() {
  const { projectKey } = useProject();

  const [insights, setInsights] = useState<StrategyInsights>(() =>
    computeInsights(projectKey)
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const refresh = useCallback(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setInsights(computeInsights(projectKey));
    }, 900);
  }, [projectKey]);

  useEffect(() => {
    setInsights(computeInsights(projectKey));
    window.addEventListener("clb:write", refresh);
    return () => {
      window.removeEventListener("clb:write", refresh);
      clearTimeout(debounceRef.current);
    };
  }, [projectKey, refresh]);

  return insights;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, label, href, color }: {
  icon: React.ElementType; label: string; href: string; color: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 px-4 gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 opacity-50" />
      </div>
      <p className="text-xs text-muted-foreground/50 leading-relaxed max-w-[160px]">
        {label}
      </p>
      <Link href={href}>
        <span className="text-[11px] font-medium text-primary/60 hover:text-primary flex items-center gap-1 transition-colors">
          Add data <ArrowRight className="w-3 h-3" />
        </span>
      </Link>
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg ${accent}`}>
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</span>
    </div>
  );
}

// ── Card 1: Market Insight ────────────────────────────────────────────────────
function MarketInsightCard({ data }: { data: MarketInsight }) {
  return (
    <Card className="flex flex-col bg-card/40 border-violet-500/15 overflow-hidden h-full">
      <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent" />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-400/60">Market Insight</p>
            <h3 className="text-sm font-bold text-white leading-tight">Competitor Pattern Analysis</h3>
          </div>
        </div>

        {!data.hasData ? (
          <EmptyState
            icon={BarChart3}
            label="Log competitor ads to reveal market saturation patterns"
            href="/competitor-intelligence"
            color="bg-violet-500/8 text-violet-400"
          />
        ) : (
          <>
            {/* Stats row */}
            <div className="flex gap-2">
              <StatPill label="Competitors" value={String(data.competitorCount)} accent="bg-white/[0.04]" />
              <StatPill label="Hook Types" value={String(data.hookDiversity)} accent="bg-white/[0.04]" />
              <StatPill label="Top Angle" value={`${data.topAnglePct}%`} accent="bg-violet-500/10" />
            </div>

            {/* Insight text */}
            <div className="bg-violet-500/[0.06] border border-violet-500/15 rounded-xl p-3.5 flex flex-col gap-2">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <span className="font-semibold text-violet-300">{data.topAnglePct}%</span> of competitors use{" "}
                <span className="font-semibold text-white">{data.topAngle}</span> messaging —
                this angle is getting crowded.
              </p>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                Most use <span className="text-foreground/70 font-medium">{data.topFormat}</span> format.
                Testing <span className="text-violet-300 font-medium">{data.suggestedAngle}</span> may
                help you stand out from the field.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Card 2: Experiment Insight ────────────────────────────────────────────────
function ExperimentInsightCard({ data }: { data: ExperimentInsight }) {
  return (
    <Card className="flex flex-col bg-card/40 border-emerald-500/15 overflow-hidden h-full">
      <div className="h-0.5 bg-gradient-to-r from-emerald-500/50 via-teal-500/30 to-transparent" />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/60">Experiment Insight</p>
            <h3 className="text-sm font-bold text-white leading-tight">Performance Variable Analysis</h3>
          </div>
        </div>

        {!data.hasData ? (
          <EmptyState
            icon={Trophy}
            label="Log experiments in Creative Lab to see which variables drive results"
            href="/creative-lab"
            color="bg-emerald-500/8 text-emerald-400"
          />
        ) : (
          <>
            {/* Stats row */}
            <div className="flex gap-2">
              <StatPill label="Experiments" value={String(data.experimentCount)} accent="bg-white/[0.04]" />
              <StatPill label="Winners" value={String(data.winnerCount)} accent="bg-emerald-500/10" />
              <StatPill label="Avg CTR" value={`${data.avgCtr.toFixed(1)}%`} accent="bg-white/[0.04]" />
            </div>

            {/* Insight text */}
            <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl p-3.5 flex flex-col gap-2">
              {data.multipleHooks ? (
                <>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    <span className="font-semibold text-white">{data.bestHook}</span> outperforms
                    other hooks by{" "}
                    <span className="font-semibold text-emerald-300">
                      {data.ctrDelta > 0 ? "+" : ""}{data.ctrDelta.toFixed(0)}% CTR
                    </span>.
                  </p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">
                    Best angle:{" "}
                    <span className="text-foreground/70 font-medium">{data.bestAngle}</span>
                    {data.bestAngleCtr > 0 && (
                      <> at <span className="text-emerald-300 font-medium">{data.bestAngleCtr.toFixed(1)}% avg CTR</span></>
                    )}.
                  </p>
                </>
              ) : (
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Only one hook type tested so far.{" "}
                  <span className="text-emerald-300 font-medium">{data.bestHook}</span> is your
                  current baseline at <span className="text-white font-semibold">{data.bestHookCtr.toFixed(1)}% CTR</span>.
                  Add more experiments to compare.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Card 3: Next Test Suggestion ──────────────────────────────────────────────
function NextTestCard({ data }: { data: NextTestSuggestion }) {
  return (
    <Card className="flex flex-col bg-card/40 border-amber-500/15 overflow-hidden h-full">
      <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-orange-500/30 to-transparent" />
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/60">Next Test Suggestion</p>
            <h3 className="text-sm font-bold text-white leading-tight">Recommended Experiment</h3>
          </div>
        </div>

        {!data.hasData ? (
          <EmptyState
            icon={Target}
            label="Log your first experiment to get a personalised next test recommendation"
            href="/creative-lab"
            color="bg-amber-500/8 text-amber-400"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Keep row */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-emerald-400">✓</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-0.5">Keep</p>
                <p className="text-xs font-semibold text-white">{data.keepVariable}</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">{data.keepValue}</p>
              </div>
            </div>

            {/* Test next row */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Target className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-0.5">Test Next</p>
                <p className="text-xs font-semibold text-white">{data.testVariable}</p>
                <p className="text-[11px] text-amber-300/60 mt-0.5">{data.testReason}</p>
              </div>
            </div>

            {/* Suggested variants */}
            {data.suggestions.length > 0 && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-2">Suggested Variants</p>
                <div className="flex flex-col gap-1.5">
                  {data.suggestions.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-white/[0.08] text-[9px] flex items-center justify-center text-muted-foreground/50 shrink-0 font-bold">
                        {i + 1}
                      </span>
                      <span className="text-xs text-foreground/70">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function StrategyAssistant() {
  const insights = useStrategyInsights();
  const [refreshing, setRefreshing] = useState(false);
  const { projectKey } = useProject();

  function manualRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  const hasAnyData = insights.market.hasData || insights.experiment.hasData || insights.nextTest.hasData;

  return (
    <section className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Strategy Assistant</h2>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            Live analysis
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent w-12" />
        </div>

        <div className="flex items-center gap-3">
          {hasAnyData && (
            <span className="text-[10px] text-muted-foreground/30 hidden md:block">
              Updates as you work
            </span>
          )}
          <button
            onClick={manualRefresh}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-muted-foreground/25 hover:text-muted-foreground/60 transition-all"
            title="Refresh insights"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 3-column card grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <MarketInsightCard    data={insights.market}     />
        <ExperimentInsightCard data={insights.experiment} />
        <NextTestCard          data={insights.nextTest}   />
      </motion.div>

      {!hasAnyData && (
        <p className="text-xs text-muted-foreground/30 text-center mt-1">
          The assistant learns from your data — start by adding competitors or experiments.
        </p>
      )}
    </section>
  );
}
