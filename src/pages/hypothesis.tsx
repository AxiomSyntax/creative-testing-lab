import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Sparkles, RotateCcw, Plus,
  GitFork, ArrowRight, ChevronDown, Check, CheckCheck, Wand2,
  Database, TrendingUp, TrendingDown, AlertTriangle,
} from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { useProject } from "@/contexts/ProjectContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { HOOK_TYPES } from "@/data/hooks";
import { AppDropdown } from "@/components/app-dropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HypothesisCard {
  id: number;
  angle: string;
  angleColor: string;
  hookType: string;
  hypothesis: string;
  suggestedHook: string;
  suggestedBody: string;
  suggestedCta: string;
  rationale: string;
}

interface FormData {
  product: string;
  audience: string;
  problem: string;
  outcome: string;
}

const BLANK_FORM: FormData = {
  product: "", audience: "", problem: "", outcome: "",
};

// ─── Creative Direction ────────────────────────────────────────────────────────

const DIR_AWARENESS = ["Unaware", "Problem Aware", "Solution Aware", "Product Aware", "Most Aware"];
const DIR_ANGLES    = ["Mechanism Reveal", "Fear + Solution", "Transformation Story", "Social Proof", "Contrarian Claim", "Dream Outcome", "Scientific Principle", "Empathy Bridge"];
const DIR_FORMATS   = ["UGC", "Talking Head", "Motion Graphic", "Split Screen", "VSL", "Product Demo", "Testimonial", "Animation"];
const DIR_TRIGGERS  = ["Fear", "Desire", "Curiosity", "Urgency", "Social Proof", "Authority", "Novelty", "Relief"];
const DIR_CTAS      = ["Free Trial", "Demo", "Learn More", "Download", "Shop Now", "Get Started", "Book Call", "Watch Video"];

interface CreativeDirection {
  awareness: string;
  hookType:  string;
  angle:     string;
  format:    string;
  trigger:   string;
  ctaStyle:  string;
}

const BLANK_DIRECTION: CreativeDirection = { awareness: "", hookType: "", angle: "", format: "", trigger: "", ctaStyle: "" };

// ─── Embedded Simulator data ──────────────────────────────────────────────────

const SIM_HOOKS = [
  { id: "question",    label: "Question Hook"       },
  { id: "negative",    label: "Negative Hook"       },
  { id: "statistic",   label: "Statistic Hook"      },
  { id: "curiosity",   label: "Curiosity Hook"      },
  { id: "controversial", label: "Controversial Hook" },
  { id: "promise",     label: "Promise Hook"        },
  { id: "story",       label: "Story Hook"          },
  { id: "result",      label: "Result-Oriented Hook" },
];

const SIM_ANGLES = [
  { id: "mechanism",      label: "Mechanism Reveal"     },
  { id: "contrarian",     label: "Contrarian Claim"     },
  { id: "empathy",        label: "Empathy Bridge"       },
  { id: "transformation", label: "Transformation Story"  },
  { id: "social",         label: "Social Proof"         },
  { id: "fear",           label: "Fear + Solution"      },
  { id: "desire",         label: "Dream Outcome"        },
  { id: "scientific",     label: "Scientific Principle"  },
];

const SIM_FORMATS = [
  { id: "ugc",     label: "UGC"              },
  { id: "vsl",     label: "VSL"              },
  { id: "talking", label: "Talking Head"     },
  { id: "motion",  label: "Motion Graphic"   },
  { id: "static",  label: "Static Image"     },
  { id: "reels",   label: "Reels / Short-form" },
  { id: "demo",    label: "Product Demo"     },
  { id: "split",   label: "Split Screen"     },
];

const SIM_PERSONAS = [
  { id: "pain-aware",     label: "Pain-Aware"      },
  { id: "solution-aware", label: "Solution-Aware"  },
  { id: "product-aware",  label: "Product-Aware"   },
  { id: "skeptic",        label: "Skeptic"         },
  { id: "new",            label: "New to Problem"  },
  { id: "aspirer",        label: "Aspirer"         },
];

const SIM_TRIGGERS = [
  { id: "frustration", label: "Frustration" },
  { id: "hope",        label: "Hope"        },
  { id: "trust",       label: "Trust"       },
  { id: "urgency",     label: "Urgency"     },
  { id: "curiosity",   label: "Curiosity"   },
  { id: "pride",       label: "Pride"       },
  { id: "relief",      label: "Relief"      },
  { id: "fomo",        label: "FOMO"        },
];

const SIM_CTAS = ["Free Trial", "Demo", "Learn More", "Download", "Shop Now", "Get Started", "Book Call", "Watch Video"];

interface SimConcept {
  hookType:  string;
  angle:     string;
  format:    string;
  trigger:   string;
  awareness: string;
  ctaStyle:  string;
}

interface SimConceptLabeled extends SimConcept {
  label:   string;
  dirType: "aligned" | "contrarian" | "random";
}

// ─── Competitor pattern analysis helpers ──────────────────────────────────────

interface MinCompRow {
  hookType: string;
  angle:    string;
  format:   string;
  cta:      string;
}

interface PatternEntry {
  label: string;
  pct:   number;
}

interface CompPatterns {
  topHooks:   PatternEntry[];
  topAngles:  PatternEntry[];
  topFormats: PatternEntry[];
  topCtas:    PatternEntry[];
  hasData:    boolean;
}

function topValsWithPct(vals: string[], n = 2): PatternEntry[] {
  const nz = vals.filter(Boolean);
  if (!nz.length) return [];
  const total = nz.length;
  const f: Record<string, number> = {};
  for (const v of nz) f[v] = (f[v] || 0) + 1;
  return Object.entries(f)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, count]) => ({ label: k, pct: Math.round((count / total) * 100) }));
}

function analyzeComp(rows: MinCompRow[] | undefined | null): CompPatterns {
  const r = rows ?? [];
  return {
    topHooks:   topValsWithPct(r.map(x => x.hookType)),
    topAngles:  topValsWithPct(r.map(x => x.angle)),
    topFormats: topValsWithPct(r.map(x => x.format)),
    topCtas:    topValsWithPct(r.map(x => x.cta)),
    hasData:    r.length > 0,
  };
}

function simPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildDirections(patterns: CompPatterns): SimConceptLabeled[] {
  if (!patterns.hasData) {
    return Array.from({ length: 3 }, (_, i) => ({
      label:     `Direction ${i + 1}`,
      dirType:   "random" as const,
      hookType:  simPick(SIM_HOOKS).label,
      angle:     simPick(SIM_ANGLES).label,
      format:    simPick(SIM_FORMATS).label,
      trigger:   simPick(SIM_TRIGGERS).label,
      awareness: simPick(SIM_PERSONAS).label,
      ctaStyle:  simPick(SIM_CTAS),
    }));
  }

  const topHookLabels   = patterns.topHooks.map(e => e.label);
  const topAngleLabels  = patterns.topAngles.map(e => e.label);
  const topFormatLabels = patterns.topFormats.map(e => e.label);
  const topCtaLabels    = patterns.topCtas.map(e => e.label);

  const aligned: SimConceptLabeled = {
    label:     "Market Aligned",
    dirType:   "aligned",
    hookType:  topHookLabels[0]   || simPick(SIM_HOOKS).label,
    angle:     topAngleLabels[0]  || simPick(SIM_ANGLES).label,
    format:    topFormatLabels[0] || simPick(SIM_FORMATS).label,
    ctaStyle:  topCtaLabels[0]    || simPick(SIM_CTAS),
    trigger:   simPick(SIM_TRIGGERS).label,
    awareness: simPick(SIM_PERSONAS).label,
  };

  const contraHook   = SIM_HOOKS.find(h => !topHookLabels.includes(h.label))?.label    || simPick(SIM_HOOKS).label;
  const contraAngle  = SIM_ANGLES.find(a => !topAngleLabels.includes(a.label))?.label   || simPick(SIM_ANGLES).label;
  const contraFormat = SIM_FORMATS.find(f => !topFormatLabels.includes(f.label))?.label || simPick(SIM_FORMATS).label;
  const contraCta    = SIM_CTAS.find(c => !topCtaLabels.includes(c))                    || simPick(SIM_CTAS);

  const contrarian: SimConceptLabeled = {
    label:     "Contrarian",
    dirType:   "contrarian",
    hookType:  contraHook,
    angle:     contraAngle,
    format:    contraFormat,
    ctaStyle:  contraCta,
    trigger:   simPick(SIM_TRIGGERS).label,
    awareness: simPick(SIM_PERSONAS).label,
  };

  return [aligned, contrarian];
}

// ─── Direction Assistant Panel (embedded simulator) ───────────────────────────

function DirectionAssistant({
  onApply,
  compRows,
}: {
  onApply:   (c: SimConcept) => void;
  compRows:  MinCompRow[];
}) {
  const [concepts,   setConcepts]   = useState<SimConceptLabeled[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [generated,  setGenerated]  = useState(false);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);
  const [open,       setOpen]       = useState(true);

  const patterns = useMemo(() => analyzeComp(compRows), [compRows]);

  function handleGenerate() {
    setLoading(true);
    setAppliedIdx(null);
    setTimeout(() => {
      setConcepts(buildDirections(patterns));
      setGenerated(true);
      setLoading(false);
    }, 380);
  }

  const dirTypeConfig = {
    aligned:    { icon: TrendingUp,   color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   label: "Market Aligned"  },
    contrarian: { icon: TrendingDown, color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20", label: "Contrarian"      },
    random:     { icon: Sparkles,     color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", label: ""              },
  };

  return (
    <div className="rounded-xl border border-white/8 bg-[#080b12] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
          <span className="text-xs font-semibold text-slate-400">Direction Assistant</span>
          <span className="text-[9px] text-slate-600 font-medium">(optional)</span>
          {patterns.hasData && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
              <Database className="w-2.5 h-2.5" />
              {compRows.length} competitor{compRows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/6">

              {/* ── Market Pattern Summary ────────────────────────────────── */}
              {patterns.hasData && (
                <div className="mx-3.5 mt-3 rounded-lg border border-white/8 bg-white/[0.02] p-3 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-blue-400/70 shrink-0" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Market Pattern</p>
                    <span className="text-[9px] text-slate-600">from {compRows.length} competitor{compRows.length !== 1 ? "s" : ""}</span>
                  </div>
                  {([
                    { label: "Hooks used most",   entries: patterns.topHooks   },
                    { label: "Angles used most",  entries: patterns.topAngles  },
                    { label: "Formats used most", entries: patterns.topFormats },
                  ] as { label: string; entries: PatternEntry[] }[]).map(({ label, entries }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                      {entries.length ? entries.map(e => (
                        <div key={e.label} className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 shrink-0">•</span>
                          <span className="text-[10px] text-slate-300 font-medium flex-1 leading-tight truncate">{e.label}</span>
                          <span className="text-[10px] text-blue-400 font-bold tabular-nums shrink-0">{e.pct}%</span>
                        </div>
                      )) : (
                        <p className="text-[9px] text-slate-600">—</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!patterns.hasData && (
                <div className="mx-3.5 mt-3 rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    No competitor data — add ads in Competitor Intel for market-aligned and contrarian directions.
                  </p>
                </div>
              )}

              <div className="px-3.5 pt-3">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/15 disabled:opacity-50"
                >
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}>
                      <Sparkles className="w-3 h-3" />
                    </motion.div>
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {generated ? "Regenerate Directions" : patterns.hasData ? "Suggest Aligned + Contrarian" : "Suggest Directions"}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {loading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="px-3.5 py-4 flex items-center justify-center gap-2 text-[11px] text-slate-500"
                  >
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <Sparkles className="w-3 h-3 text-violet-400" />
                    </motion.div>
                    Building suggestions…
                  </motion.div>
                )}

                {generated && !loading && (
                  <motion.div key="concepts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="p-2.5 space-y-2">
                      {concepts.map((c, i) => {
                        const isApplied = appliedIdx === i;
                        const cfg = dirTypeConfig[c.dirType];
                        const DirIcon = cfg.icon;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border p-3 transition-all duration-200 ${
                              isApplied ? "border-emerald-500/30 bg-emerald-500/6" : "border-white/8 bg-white/[0.015]"
                            }`}
                          >
                            {/* Direction label badge */}
                            <div className="flex items-center gap-1.5 mb-2.5">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                                <DirIcon className="w-2.5 h-2.5" />
                                {c.label}
                              </span>
                              {c.dirType === "aligned" && (
                                <span className="text-[9px] text-slate-600">— mirrors dominant market patterns</span>
                              )}
                              {c.dirType === "contrarian" && (
                                <span className="text-[9px] text-slate-600">— deliberately different from market</span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2.5">
                              {([
                                { label: "Hook Type",         value: c.hookType  },
                                { label: "Angle",             value: c.angle     },
                                { label: "Format",            value: c.format    },
                                { label: "Emotional Trigger", value: c.trigger   },
                                { label: "Market Awareness",  value: c.awareness },
                                { label: "CTA Style",         value: c.ctaStyle  },
                              ] as { label: string; value: string }[]).map(({ label, value }) => (
                                <div key={label}>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-0.5">{label}</p>
                                  <p className="text-[11px] font-semibold text-slate-300 leading-tight">{value}</p>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => { onApply(c); setAppliedIdx(i); }}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150 ${
                                isApplied
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-violet-500/20 bg-violet-500/8 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/35"
                              }`}
                            >
                              {isApplied
                                ? <><Check className="w-3 h-3" />Applied to Creative Direction</>
                                : <>Apply to Creative Direction</>
                              }
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-center text-[10px] text-slate-600 pb-2.5 px-3">
                      Applying fills Market Awareness and Creative Direction automatically.
                    </p>
                  </motion.div>
                )}

                {!generated && !loading && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="px-3.5 py-3 text-center"
                  >
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      {patterns.hasData
                        ? <>Click above to generate a <span className="text-blue-400/80 font-semibold">Market Aligned</span> and a <span className="text-amber-400/80 font-semibold">Contrarian</span> direction — then apply one to pre-fill your Creative Direction.</>
                        : <>Click "Suggest Directions" to generate 3 creative combinations —<br />select one to auto-fill your Creative Direction fields.</>
                      }
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Generator ────────────────────────────────────────────────────────────────

function generate(f: FormData, dir?: CreativeDirection): HypothesisCard[] {
  const p = f.product || "the product";
  const a = f.audience || "the audience";
  const prob = f.problem || "their problem";
  const out = f.outcome || "the desired outcome";
  const aw = dir?.awareness || null;

  // Build direction context strings (only when a field is selected)
  const dirHook    = dir?.hookType  || null;
  const dirAngle   = dir?.angle     || null;
  const dirFormat  = dir?.format    || null;
  const dirTrigger = dir?.trigger   || null;
  const dirCTA     = dir?.ctaStyle  || null;
  const hasDir = !!(dirHook || dirAngle || dirFormat || dirTrigger || dirCTA);

  // Format-specific creative note appended to rationale when direction is set
  const formatNote  = dirFormat  ? ` Deliver this in a ${dirFormat} format to match the audience's preferred content style.` : "";
  const triggerNote = dirTrigger ? ` Lean into ${dirTrigger} as the primary emotional lever throughout the creative.` : "";
  const ctaNote     = dirCTA     ? ` Close with a ${dirCTA} call-to-action for maximum conversion alignment.` : "";

  return [
    {
      id: 1,
      angle: "Mechanism Reveal",
      angleColor: "#6366f1",
      hookType: "Curiosity Hook",
      hypothesis: `If we frame ${p} as a unique mechanism that solves ${prob} for ${a} — rather than positioning it as another generic solution — then attention will increase and purchase intent will rise because ${a} will see it as something they haven't tried before.`,
      suggestedHook: `Most ${a} fail to achieve ${out} because they're missing this one mechanism.`,
      suggestedBody: `Most people try to fix ${prob} by doing more of the same things. But ${p} takes a completely different approach — one that targets the root cause directly. It's not another workaround. It's a named process that ${a} haven't seen before, which means no skepticism and no comparison shopping. Here's how it works.`,
      suggestedCta: `Try ${p} free — see the mechanism in action.`,
      rationale: `Mechanism-led angles bypass skepticism. By naming a specific, named process, ${p} feels proprietary and harder to compare against alternatives.`,
    },
    {
      id: 2,
      angle: "Fear + Solution",
      angleColor: "#ef4444",
      hookType: "Negative Hook",
      hypothesis: `If we open by naming the exact frustration ${a} feel around ${prob} — before revealing ${p} as the counterintuitive fix — then emotional resonance will be high enough to hold attention through to the call to action.`,
      suggestedHook: `Stop letting ${prob} hold you back. Here's what actually works for ${a}.`,
      suggestedBody: `Every day stuck with ${prob} is another day further from ${out}. The worst part? Most solutions make it worse — they add complexity instead of cutting through it. ${p} was built specifically for ${a} who are done settling. It removes the friction, eliminates the guesswork, and gets you to ${out} faster than you thought possible.`,
      suggestedCta: `Get started with ${p} today — results without the frustration.`,
      rationale: `Agitating a known pain before offering relief follows a proven persuasion arc. The viewer feels seen — which builds the trust needed to hear the solution.`,
    },
    {
      id: 3,
      angle: "Transformation Story",
      angleColor: "#f59e0b",
      hookType: "Story Hook",
      hypothesis: `If we show a before-and-after narrative of someone who was stuck with ${prob} and used ${p} to achieve ${out}, then watch time will increase and the conversion rate will improve because the story makes the outcome feel real and reachable.`,
      suggestedHook: `I struggled with ${prob} for months. Then I found this — and everything changed.`,
      suggestedBody: `Six months ago I was exactly where you are — buried in ${prob}, frustrated, and ready to quit. A friend showed me ${p}. I was skeptical. But within [timeframe], I had achieved ${out}. Not because I worked harder. Because I finally had the right system. If you're a ${a} tired of spinning your wheels, this is what I wish someone had shown me sooner.`,
      suggestedCta: `Start your transformation — try ${p} today.`,
      rationale: `Transformation stories reduce perceived risk. ${a} see themselves in the protagonist, making the outcome feel personally attainable rather than abstract.`,
    },
    {
      id: 4,
      angle: "Social Proof",
      angleColor: "#10b981",
      hookType: "Statistic Hook",
      hypothesis: `If we lead with a specific number of ${a} who have already achieved ${out} using ${p}, skepticism will decrease and credibility will rise — making the rest of the ad easier to believe and act on.`,
      suggestedHook: `Thousands of ${a} have already solved ${prob} with this — here's exactly how.`,
      suggestedBody: `Over [X] ${a} have used ${p} to go from stuck with ${prob} to achieving ${out} — in as little as [timeframe]. They're not special. They just stopped guessing and started using a system that's proven to work. The results speak for themselves. Join them and see why ${p} is the #1 choice for ${a} who want real results.`,
      suggestedCta: `Join [X]+ ${a} — get started with ${p} now.`,
      rationale: `Social proof shortcuts the skepticism loop. When ${a} see peers succeeding, the decision to try feels lower-risk and socially validated.`,
    },
    {
      id: 5,
      angle: "Contrarian Claim",
      angleColor: "#8b5cf6",
      hookType: "Controversial Hook",
      hypothesis: `If we challenge the conventional advice ${a} have been given about ${prob} — and position ${p} as the counterintuitive path to ${out} — we will stand out in a crowded feed and attract the most frustrated, solution-ready buyers.`,
      suggestedHook: `Everything you've been told about ${prob} is wrong — and it's costing ${a} their results.`,
      suggestedBody: `The standard advice for ${a} dealing with ${prob} is to [conventional approach]. But that's exactly why it doesn't work. The real path to ${out} requires throwing out the playbook. ${p} is built on a completely different premise — one that [contrarian mechanism]. It sounds counterintuitive. But the data and the results don't lie.${aw ? ` And if you're at a ${aw} level of awareness, you already know the old advice isn't cutting it.` : ""}`,
      suggestedCta: `Try the approach that actually works — start with ${p} today.`,
      rationale: `Contrarian angles cut through noise because they promise a new frame. ${a} who have tried and failed are the most motivated to hear a different perspective.${aw ? ` Given that most ${a} are at a ${aw} level of awareness, this approach meets them where they are.` : ""}`,
    },
    // ── Creative Direction card (only added when direction is applied) ──────────
    ...(hasDir ? [{
      id: 6,
      angle: dirAngle ?? "Custom Direction",
      angleColor: "#06b6d4",
      hookType: dirHook ?? "Custom Hook",
      hypothesis: `If we build a creative using ${dirHook ? `a ${dirHook}` : "a targeted hook"} with a ${dirAngle ?? "focused"} angle${dirFormat ? ` in ${dirFormat} format` : ""}${dirTrigger ? `, driving ${dirTrigger} as the core emotion` : ""} — then this combination of variables should produce a tightly aligned ad for ${a} that converts ${prob} into a compelling reason to try ${p} and achieve ${out}.`,
      suggestedHook: dirHook
        ? `[${dirHook}] — ${a} who struggle with ${prob}: this is what changes everything.`
        : `The one thing ${a} need to go from ${prob} to ${out} — and why ${p} is it.`,
      suggestedBody: `This concept is built around a specific creative direction: ${[dirHook && `${dirHook} hook`, dirAngle && `${dirAngle} angle`, dirFormat && `${dirFormat} format`, dirTrigger && `${dirTrigger} emotional trigger`].filter(Boolean).join(", ")}. Use this framing to speak directly to ${a} who are actively dealing with ${prob}. Lead with the emotional trigger (${dirTrigger ?? "resonance"}), build through the ${dirAngle ?? "core"} narrative, and close with a ${dirCTA ?? "compelling"} CTA that removes friction and gets ${a} to take the next step toward ${out}.`,
      suggestedCta: dirCTA
        ? `[${dirCTA}] — Start with ${p} and get to ${out} faster.`
        : `Take the next step — try ${p} today.`,
      rationale: `This hypothesis is purpose-built from your Creative Direction selections.${formatNote}${triggerNote}${ctaNote} Test this against the organic hypotheses above to see whether a guided direction outperforms the algorithm's suggestions.`,
    }] : []),
  ];
}

// ─── Add-to-Matrix button ─────────────────────────────────────────────────────

function AddBtn({ label, added, onClick }: { label: string; added: boolean; onClick: () => void }) {
  return (
    <button
      onClick={added ? undefined : onClick}
      disabled={added}
      className={`flex items-center gap-1 text-[11px] font-semibold border px-2.5 py-1.5 rounded-lg transition-all duration-150 shrink-0 ${added ? "opacity-50 cursor-not-allowed" : ""}`}
      style={
        added
          ? { borderColor: "#10b98155", color: "#10b981", background: "#10b98112" }
          : { borderColor: "#334155", color: "#64748b", background: "transparent" }
      }
    >
      {added
        ? <><CheckCheck className="w-3 h-3" />Added</>
        : <><Plus className="w-3 h-3" />{label}</>
      }
    </button>
  );
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  hoverAccent,
  selected,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  hoverAccent: string;
  selected?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-[11px] font-semibold transition-all duration-150 group ${
        selected
          ? "border-violet-500/45 bg-violet-500/15 text-violet-300 [&_svg]:text-violet-400"
          : `border-white/10 bg-white/[0.03] text-slate-400 ${hoverAccent}`
      }`}
    >
      <Icon className="w-3 h-3 shrink-0 transition-colors" />
      {selected ? "Sent to Script Matrix" : label}
    </button>
  );
}

// ─── CTA Type classifier ──────────────────────────────────────────────────────

const CTA_TYPES_ORDERED: [string, string[]][] = [
  ["Free Trial",  ["free trial", "trial", "try for free", "try free", "free for"]],
  ["Demo",        ["demo", "see it in action", "see the system", "watch demo"]],
  ["Book Call",   ["book", "schedule", "call", "consultation", "speak with"]],
  ["Watch Video", ["watch video", "watch the", "see the video"]],
  ["Download",    ["download", "get the guide", "get the pdf", "get the report"]],
  ["Shop Now",    ["shop now", "buy now", "order now", "get yours"]],
  ["Learn More",  ["learn more", "find out more", "discover", "read more"]],
  ["Get Started", ["get started", "start now", "start today", "join now", "sign up", "create account", "start your"]],
];

function classifyCtaType(text: string): string {
  const lower = text.toLowerCase();
  for (const [type, keywords] of CTA_TYPES_ORDERED) {
    if (keywords.some(kw => lower.includes(kw))) return type;
  }
  return "Get Started";
}

// ─── Hypothesis card ─────────────────────────────────────────────────────────

function HypCard({ card, index, sent, onSent }: { card: HypothesisCard; index: number; sent?: boolean; onSent?: () => void }) {
  const { projectKey } = useProject();

  const [feedback, setFeedback] = useState<{ msg: string; href: string; label: string } | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sectionAdded, setSectionAdded] = useState<{ hook: boolean; body: boolean; cta: boolean }>({ hook: false, body: false, cta: false });

  function flash(msg: string, href: string, label: string) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ msg, href, label });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 3000);
  }

  function addToMatrix(section: "hook" | "body" | "cta", entry: { type: string; text: string }) {
    const keyMap = { hook: "script:hooks", body: "script:bodies", cta: "script:ctas" } as const;
    const storageKey = projectKey(keyMap[section]);
    const existing = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as { type: string; text: string }[];
    localStorage.setItem(storageKey, JSON.stringify([...existing, entry]));
    window.dispatchEvent(new CustomEvent("clb:write"));
    setSectionAdded(prev => ({ ...prev, [section]: true }));
  }

  function handleAddHook() {
    addToMatrix("hook", { type: card.hookType, text: card.suggestedHook });
  }
  function handleAddBody() {
    addToMatrix("body", { type: card.angle, text: card.suggestedBody });
  }
  function handleAddCta() {
    addToMatrix("cta", { type: classifyCtaType(card.suggestedCta), text: card.suggestedCta });
  }

  function handleScriptVariant() {
    const qKey = projectKey("script:pending");
    const queue = JSON.parse(localStorage.getItem(qKey) ?? "[]") as object[];
    queue.push({
      hookType:  card.hookType,
      hookText:  card.suggestedHook,
      angle:     card.angle,
      angleText: card.suggestedBody,
      ctaType:   classifyCtaType(card.suggestedCta),
      ctaText:   card.suggestedCta,
    });
    localStorage.setItem(qKey, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent("clb:write"));
    onSent?.();
    flash("Script variant queued in Script Matrix", "/script-testing", "Open Script Matrix");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.09, ease: "easeOut" }}
      className="rounded-xl border bg-[#111827] overflow-hidden"
      style={{ borderColor: card.angleColor + "40" }}
    >
      {/* Card top bar */}
      <div
        className="px-5 py-3 flex items-center justify-between border-b"
        style={{ borderColor: card.angleColor + "28", background: card.angleColor + "10" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: card.angleColor }}
          >
            {card.id}
          </span>
          <span className="font-bold text-sm text-white">{card.angle}</span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: card.angleColor, background: card.angleColor + "20" }}
          >
            {card.hookType}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Hypothesis */}
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Hypothesis</p>
          <p className="text-sm text-slate-200 leading-relaxed">{card.hypothesis}</p>
        </div>

        <div className="h-px bg-white/5" />

        {/* Hook */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Suggested Hook</p>
            <AddBtn label="+ Add Hook to Script Matrix" added={sectionAdded.hook} onClick={handleAddHook} />
          </div>
          <div
            className="rounded-lg px-4 py-3 border-l-2 bg-[#0f1117]"
            style={{ borderColor: card.angleColor }}
          >
            <p className="text-sm italic font-medium text-white leading-relaxed">
              {card.suggestedHook}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Suggested Body</p>
            <AddBtn label="+ Add Body to Script Matrix" added={sectionAdded.body} onClick={handleAddBody} />
          </div>
          <div className="rounded-lg px-4 py-3 bg-[#0f1117] border border-white/5">
            <p className="text-sm text-slate-300 leading-relaxed">{card.suggestedBody}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Suggested CTA</p>
            <AddBtn label="+ Add CTA to Script Matrix" added={sectionAdded.cta} onClick={handleAddCta} />
          </div>
          <div
            className="rounded-lg px-4 py-3 border-l-2 bg-[#0f1117]"
            style={{ borderColor: card.angleColor + "80" }}
          >
            <p className="text-sm font-semibold text-white leading-relaxed">{card.suggestedCta}</p>
          </div>
        </div>

        {/* Why It Works */}
        <div className="space-y-1.5">
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-500">Why It Works</p>
          <p className="text-xs text-slate-400 leading-relaxed">{card.rationale}</p>
        </div>

        {/* ── Action ──────────────────────────────────────────────────────── */}
        <div className="h-px bg-white/5" />

        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
            >
              <div className="flex items-center gap-2">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-emerald-300">{feedback.msg}</span>
              </div>
              {feedback.href && (
                <Link href={feedback.href}>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap">
                    {feedback.label} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full"
            >
              <ActionBtn
                icon={GitFork}
                label="Create Script Variant"
                onClick={handleScriptVariant}
                hoverAccent="hover:bg-violet-500/10 hover:border-violet-500/25 hover:text-violet-300 [&_svg]:group-hover:text-violet-400"
                selected={sent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function Field({ label, placeholder, value, onChange, hint }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all duration-150"
      />
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Hypothesis() {
  const { projectKey } = useProject();
  const [form, setForm] = useLocalStorage<FormData>(projectKey("hypothesis:form"), BLANK_FORM);
  const [cards, setCards] = useLocalStorage<HypothesisCard[]>(projectKey("hypothesis:cards"), []);
  const [generated, setGenerated] = useLocalStorage<boolean>(projectKey("hypothesis:generated"), false);
  const [sentIds, setSentIds] = useLocalStorage<number[]>(projectKey("hypothesis:sentIds"), []);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<CreativeDirection>(BLANK_DIRECTION);
  const [dirApplied, setDirApplied] = useState(false);
  const [dirOpen, setDirOpen] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);

  // ── Read competitor + market data from localStorage ──────────────────────
  const [compRows] = useLocalStorage<MinCompRow[]>(projectKey("competitors:rows"), []);
  const marketAvatar = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(projectKey("market:avatar")) ?? "null") as Record<string,string> | null; }
    catch { return null; }
  }, [projectKey]);
  const marketForm = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(projectKey("market:form")) ?? "null") as Record<string,string> | null; }
    catch { return null; }
  }, [projectKey]);

  const hasMarketData = !!(marketAvatar || marketForm);
  const formHasData   = Object.values(form).some(v => v.trim() !== "");

  function doImport() {
    setForm(f => ({
      product:  marketForm?.product   || f.product,
      audience: marketAvatar?.audience || f.audience,
      problem:  marketAvatar?.problem  || f.problem,
      outcome:  marketAvatar?.outcome  || f.outcome,
    }));
    if (marketAvatar?.awareness) {
      setDirection(d => ({ ...d, awareness: marketAvatar.awareness }));
      setDirApplied(true);
      setDirOpen(true);
    }
    setConfirmImport(false);
  }

  function handleImportClick() {
    if (formHasData) {
      setConfirmImport(true);
    } else {
      doImport();
    }
  }

  // Consume any legacy simulator:pending data (backward compat)
  useEffect(() => {
    const raw = localStorage.getItem(projectKey("simulator:pending"));
    if (!raw) return;
    localStorage.removeItem(projectKey("simulator:pending"));
    try {
      const { angle, awareness, hookHint, triggerHint, format } = JSON.parse(raw) as {
        angle?: string; awareness?: string;
        hookHint?: string; triggerHint?: string; format?: string;
      };
      setDirection(d => ({
        ...d,
        awareness: awareness   ? awareness   : d.awareness,
        hookType:  hookHint    ? hookHint    : d.hookType,
        angle:     angle       ? angle       : d.angle,
        format:    format      ? format      : d.format,
        trigger:   triggerHint ? triggerHint : d.trigger,
      }));
      if (angle || hookHint || triggerHint || format || awareness) {
        setDirApplied(true);
        setDirOpen(true);
      }
    } catch {}
  }, []); // projectKey is stable within a mounted instance

  const set = (key: keyof FormData) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  function handleSimApply(c: SimConcept) {
    setDirection(d => ({
      ...d,
      awareness: c.awareness,
      hookType:  c.hookType,
      angle:     c.angle,
      format:    c.format,
      trigger:   c.trigger,
      ctaStyle:  c.ctaStyle,
    }));
    setDirApplied(true);
    setDirOpen(true);
  }

  const canGenerate =
    form.product.trim() || form.audience.trim() || form.problem.trim() || form.outcome.trim();

  const handleGenerate = () => {
    setLoading(true);
    setCards([]);
    setTimeout(() => {
      setCards(generate(form, dirApplied ? direction : undefined));
      setGenerated(true);
      setLoading(false);
    }, 550);
  };

  const handleReset = () => {
    setForm(BLANK_FORM);
    setCards([]);
    setGenerated(false);
    setSentIds([]);
    setDirection(BLANK_DIRECTION);
    setDirApplied(false);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              Strategic Tool
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Creative Hypothesis Generator</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Enter your product details and get 5 structured ad testing hypotheses — each with a hook, body, CTA, and strategic rationale ready to send to Script Matrix.
            </p>
          </div>
          {generated && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm text-slate-400 hover:text-white hover:border-white/30 transition-all duration-150 mt-1"
            >
              <RotateCcw className="w-4 h-4" />
              Start over
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ── Input panel ── */}
          <div className="xl:col-span-2">
            <div className="rounded-xl border border-white/10 bg-[#0f1117] p-5 space-y-5 sticky top-6">
              {/* ── Market Intel preview card ────────────────────────────── */}
              {hasMarketData ? (
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-emerald-400/70 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Market Intel</span>
                    </div>
                    {!confirmImport ? (
                      <button
                        type="button"
                        onClick={handleImportClick}
                        className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 hover:border-emerald-500/45 bg-emerald-500/10 hover:bg-emerald-500/18 px-2 py-1 rounded-lg transition-all duration-150"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        Import into Hypothesis
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-amber-400 font-semibold">Overwrite fields?</span>
                        <button type="button" onClick={doImport}
                          className="text-[10px] font-bold text-emerald-400 border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 transition-all duration-150"
                        >Yes</button>
                        <button type="button" onClick={() => setConfirmImport(false)}
                          className="text-[10px] font-bold text-slate-500 border border-white/10 bg-white/[0.03] px-2 py-0.5 rounded-md hover:text-slate-400 transition-all duration-150"
                        >Cancel</button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {([
                      { label: "Avatar",    value: marketAvatar?.audience  },
                      { label: "Pain",      value: marketAvatar?.problem   },
                      { label: "Desire",    value: marketAvatar?.outcome   },
                      { label: "Awareness", value: marketAvatar?.awareness },
                      { label: "Product",   value: marketForm?.product     },
                    ] as { label: string; value?: string }[]).filter(x => x.value).map(({ label, value }) => (
                      <div key={label} className="flex items-baseline gap-2">
                        <span className="text-[9px] font-bold text-emerald-600/70 w-14 shrink-0">{label}:</span>
                        <span className="text-[10px] text-slate-300 leading-tight line-clamp-1">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-white/6 bg-white/[0.015] px-3 py-2.5 flex items-start gap-2">
                  <Database className="w-3 h-3 shrink-0 mt-0.5 text-slate-700" />
                  <p className="text-[9px] text-slate-600 leading-relaxed">
                    Fill in Market Intel to enable one-click import into this form.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                <Lightbulb className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Brief Details</span>
              </div>

              <Field
                label="Product"
                placeholder="e.g. AI writing assistant"
                value={form.product}
                onChange={set("product")}
                hint="What are you advertising?"
              />
              <Field
                label="Target Audience"
                placeholder="e.g. freelance copywriters"
                value={form.audience}
                onChange={set("audience")}
                hint="Who is this ad for?"
              />
              <Field
                label="Main Problem"
                placeholder="e.g. spending hours on first drafts"
                value={form.problem}
                onChange={set("problem")}
                hint="What pain does your audience feel?"
              />
              <Field
                label="Desired Outcome"
                placeholder="e.g. publish high-converting copy 10x faster"
                value={form.outcome}
                onChange={set("outcome")}
                hint="What result does your product deliver?"
              />

              {/* ── Direction Assistant (embedded simulator) ────────────── */}
              <DirectionAssistant onApply={handleSimApply} compRows={compRows} />

              {/* ── Creative Direction collapsible panel ───────────────── */}
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDirOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400/70 shrink-0" />
                    <span className="text-xs font-semibold text-slate-400">Creative Direction</span>
                    <span className="text-[9px] text-slate-600 font-medium">(optional)</span>
                    {dirApplied && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        <Check className="w-2.5 h-2.5" />
                        Applied
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-600 transition-transform duration-200 shrink-0 ${dirOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {dirOpen && (
                    <motion.div
                      key="dir-panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-white/8 space-y-3">
                        <p className="text-[10px] text-slate-600 leading-relaxed pt-1">
                          Guide the generator with a specific creative direction. When applied, a 6th hypothesis targeting your exact selections will be generated alongside the standard 5.
                        </p>

                        {/* 2-col grid: all 6 fields */}
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { key: "awareness", label: "Market Awareness",  opts: DIR_AWARENESS },
                            { key: "hookType",  label: "Hook Type",         opts: HOOK_TYPES    },
                            { key: "angle",     label: "Angle",             opts: DIR_ANGLES    },
                            { key: "format",    label: "Creative Format",   opts: DIR_FORMATS   },
                            { key: "ctaStyle",  label: "CTA Style",         opts: DIR_CTAS      },
                            { key: "trigger",   label: "Emotional Trigger", opts: DIR_TRIGGERS  },
                          ] as { key: keyof CreativeDirection; label: string; opts: readonly string[] | string[] }[]).map(({ key, label, opts }) => (
                            <div key={key} className="flex flex-col gap-1">
                              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">{label}</label>
                              <AppDropdown
                                size="sm"
                                value={direction[key]}
                                options={opts as string[]}
                                placeholder="— any —"
                                onChange={v => {
                                  setDirection(d => ({ ...d, [key]: v }));
                                  setDirApplied(false);
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Apply button */}
                        <button
                          type="button"
                          onClick={() => {
                            const hasAny = Object.values(direction).some(v => v !== "");
                            if (hasAny) setDirApplied(true);
                          }}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                            dirApplied
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-cyan-500/20 bg-cyan-500/8 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-500/35"
                          }`}
                        >
                          {dirApplied
                            ? <><Check className="w-3.5 h-3.5" />Applied — will guide next generation</>
                            : <><Sparkles className="w-3.5 h-3.5" />Apply to Hypothesis</>
                          }
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {loading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}>
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Generating hypotheses…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {generated ? "Regenerate Hypotheses" : "Generate 5 Hypotheses"}
                  </>
                )}
              </button>

              {!canGenerate && !generated && (
                <p className="text-center text-[11px] text-slate-600">
                  Fill in at least one field — or generate with blanks for a template view.
                </p>
              )}

              {/* Legend */}
              {generated && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2"
                >
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Actions available on each card</p>
                  <div className="flex items-start gap-2">
                    <GitFork className="w-3 h-3 mt-0.5 shrink-0 text-violet-400" />
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400">Create Script Variant</p>
                      <p className="text-[9px] text-slate-600">Queues the full hook, body, and CTA in Script Matrix for refinement</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Results panel ── */}
          <div className="xl:col-span-3 space-y-4">
            <AnimatePresence mode="wait">
              {!generated && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-white/10 bg-[#0f1117] flex flex-col items-center justify-center text-center p-16 gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Ready to generate</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      Fill in your product brief and hit Generate to get 5 strategic hypotheses.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-slate-600 mt-2">
                    <span>✦ Mechanism Reveal</span>
                    <span>✦ Fear + Solution</span>
                    <span>✦ Transformation Story</span>
                    <span>✦ Social Proof</span>
                    <span>✦ Contrarian Claim</span>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-white/10 bg-[#0f1117] flex flex-col items-center justify-center text-center p-16 gap-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.1 }}
                    className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </motion.div>
                  <p className="text-slate-400 text-sm">Building hypotheses…</p>
                </motion.div>
              )}

              {generated && !loading && (
                <motion.div key="results" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <p className="text-xs text-slate-500 font-medium">
                    5 hypotheses generated
                    {form.product && ` for `}
                    {form.product && <span className="text-slate-300">{form.product}</span>}
                  </p>
                  {cards.map((card, i) => (
                    <HypCard
                      key={card.id}
                      card={card}
                      index={i}
                      sent={sentIds.includes(card.id)}
                      onSent={() => setSentIds((ids) => ids.includes(card.id) ? ids : [...ids, card.id])}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <NextStepBanner
          step="Script Matrix"
          title="Refine Your Scripts"
          cta="Open Script Matrix"
          description="Your queued hypothesis variants are waiting in Script Matrix. Add body copy and finalise the script before sending to Creative Lab."
          href="/script-testing"
          icon={GitFork}
          color="#6366f1"
        />
      </div>
    </PageTransition>
  );
}
