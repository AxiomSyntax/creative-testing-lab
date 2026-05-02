import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { HOOK_TYPES, HOOK_DESC, HOOK_NEXT } from "@/data/hooks";
import { AppDropdown } from "@/components/app-dropdown";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { HOOK_CATEGORIES } from "@/data/hooks";
import {
  Zap, FileText, Target, Layers, PlaySquare, RefreshCw,
  Sparkles, ArrowRight, CheckCircle2, Trophy, TrendingUp,
  Video, Monitor, Camera, User, Film, Type, ChevronRight, FlaskConical,
  GitBranch, ExternalLink, Pencil, AlertCircle, TrendingDown, X, Image,
  Rocket, Eye, BookOpen, ChevronDown, Upload,
} from "lucide-react";
import { NextStepBanner } from "@/components/next-step-banner";
import {
  generateTestId, generateVariantId, generateIterationBatchId,
  nextTestNumber, countExistingSiblings, type IterBatchStep,
} from "@/lib/id-system";
import { type DecisionState } from "@/lib/decision-engine";
import {
  analyzeInsights, getSeverityBreakdown, getLearnedPatterns, boostConfidence,
  type PerformanceInsight, type LearnedPatterns,
} from "@/lib/recommendation-engine";
import {
  type IterationType, type Variant, type Test, type TestPhase,
  NEXT_PHASE, PHASE_TO_ITER, PHASE_SEQUENCE,
  createTest, assignVariantsToTest,
  getIterationPhaseFromId, getNextIterationPhase,
} from "./experiment-timeline";

// ── OPTIONS ──────────────────────────────────────────────────────────────────
const ANGLES      = ["Pain Point","Transformation","Social Proof","Curiosity","Authority","Comparison","Urgency"];
const FORMATS     = ["UGC","Talking Head","Motion Graphic","Split Screen","Text-Only","Product Demo","Testimonial"];
const CTA_TYPES   = ["Free Trial","Demo","Learn More","Download","Shop Now","Get Started","Book Call","Watch Video"];

// ── VISUAL ITERATION OPTIONS ──────────────────────────────────────────────────
const VISUAL_OPTIONS = [
  { name: "New Actor",               desc: "Cast a different face delivering the same script. Tests actor appeal without touching copy.",           icon: User       },
  { name: "Different Setting",       desc: "Film the same script in a new environment. Changes visual context while the message stays identical.", icon: Film       },
  { name: "Different Hook Visual",   desc: "New opening visual — prop, scene, or overlay. Same words, different pattern-interrupt trigger.",       icon: PlaySquare },
  { name: "Different Editing Style", desc: "Recut with new pacing, rhythm, or motion-graphic treatment. Same content, new energy.",                icon: Layers     },
  { name: "Lifestyle B-Roll",        desc: "Replace on-camera talent with aspirational lifestyle footage. Same hook audio, new visual context.",   icon: Camera     },
  { name: "Product Demo Focus",      desc: "Lead with hands-on product footage. Shifts the visual from persona to product utility.",               icon: Video      },
];


// ── STATIC AD VISUAL OPTIONS ──────────────────────────────────────────────────
const STATIC_VISUAL_OPTIONS = [
  { name: "Product Shot",        desc: "Clean, focused product imagery. Works for direct-response and high-consideration purchases.",                     icon: Camera     },
  { name: "Lifestyle Image",     desc: "Aspirational real-world context. Places the product in the customer's desired future state.",                      icon: User       },
  { name: "Before/After Split",  desc: "Dual-panel comparison layout. High attention-retention structure for transformation-driven messaging.",            icon: Layers     },
  { name: "Text-Heavy Graphic",  desc: "Bold copy on a minimal background. Fast to produce and highly shareable across placements.",                      icon: Type       },
  { name: "Social Proof Visual", desc: "Reviews, ratings, or customer photos as the dominant visual. Bypasses skepticism through third-party validation.", icon: Trophy     },
  { name: "UGC-Style Creative",  desc: "Unpolished, authentic-looking photo or video frame. Blends into the feed like organic content.",                  icon: Video      },
];

// ── FORMAT EXPANSION MAP ──────────────────────────────────────────────────────
const FORMAT_NEXT: Record<string, string[]> = {
  "UGC":            ["Talking Head","Motion Graphic","Split Screen","Product Demo"],
  "Talking Head":   ["UGC","Motion Graphic","Split Screen","Text-Only"],
  "Motion Graphic": ["Talking Head","UGC","Split Screen","Text-Only"],
  "Split Screen":   ["UGC","Talking Head","Motion Graphic","Product Demo"],
  "Text-Only":      ["UGC","Talking Head","Motion Graphic","Split Screen"],
  "Product Demo":   ["Talking Head","UGC","Motion Graphic","Split Screen"],
  "Testimonial":    ["UGC","Talking Head","Split Screen","Motion Graphic"],
};

const FORMAT_DESC: Record<string, string> = {
  "UGC":            "Authentic creator-sourced content. Highest trust signal on social platforms.",
  "Talking Head":   "Direct camera address. Works for authority positioning and founder credibility.",
  "Motion Graphic": "Animated visual. Strong for data-heavy or complex product explanations.",
  "Split Screen":   "Before/after or comparison layout. High attention-retention structure.",
  "Text-Only":      "Text captions on solid background. Fast to produce, highly shareable.",
  "Product Demo":   "Hands-on product in action. Best for tangible, demonstrable outcomes.",
  "Testimonial":    "Customer-sourced social proof. Bypasses skepticism through third-party validation.",
};

// ── COLOURS ───────────────────────────────────────────────────────────────────
const VISUAL_COLOR = "#3b82f6";
const HOOK_COLOR   = "#8b5cf6";
const FORMAT_COLOR = "#10b981";

// ── ITERATION ACTION DEFINITIONS ──────────────────────────────────────────────
type IterActionDef = {
  type: NonNullable<IterationType>;
  label: string;
  desc: string;
  lockDesc: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

const ITER_ACTION_DEFS: IterActionDef[] = [
  {
    type:     "HOOK",
    label:    "Hook Iteration",
    desc:     "Change the opening hook only. Body, format, and CTA stay identical.",
    lockDesc: "Locks: Body (angle), Format, CTA  ·  ID suffix: -H1, -H2 …",
    color:    "#8b5cf6",
    Icon:     Zap,
  },
  {
    type:     "FORMAT",
    label:    "Format Iteration",
    desc:     "Change the creative format only. Hook and body angle stay identical.",
    lockDesc: "Locks: Hook, Body (angle)  ·  ID suffix: -F1, -F2 …",
    color:    "#10b981",
    Icon:     FileText,
  },
  {
    type:     "CTA",
    label:    "CTA Iteration",
    desc:     "Minor conversion tweak. Only the call-to-action changes.",
    lockDesc: "Locks: Hook, Body (angle), Format  ·  ID suffix: -C1 …",
    color:    "#f59e0b",
    Icon:     Target,
  },
  {
    type:     "VISUAL",
    label:    "Visual Iteration",
    desc:     "Test different visual executions while keeping script and structure identical.",
    lockDesc: "Locks: Hook, Body (angle), Format, CTA  ·  ID suffix: -V1, -V2 …",
    color:    "#3b82f6",
    Icon:     PlaySquare,
  },
];

// Suffix prefix map (mirrors experiment-timeline.ts)
const ITER_BATCH_PREFIX: Record<NonNullable<IterationType>, string> = {
  HOOK:   "H",
  FORMAT: "F",
  CTA:    "C",
  VISUAL: "V",
};

// Static ad iteration axes
type StaticIterActionDef = {
  type: StaticIterType;
  label: string;
  desc: string;
  lockDesc: string;
  color: string;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};
const STATIC_ITER_ACTION_DEFS: StaticIterActionDef[] = [
  {
    type:     "HEADLINE",
    label:    "Headline Test",
    desc:     "Test new headline copy. Visual and angle stay identical.",
    lockDesc: "Locks: Visual, Angle, CTA",
    color:    "#8b5cf6",
    Icon:     FileText,
  },
  {
    type:     "VISUAL",
    label:    "Visual Test",
    desc:     "Test different visuals. Headline and angle stay identical.",
    lockDesc: "Locks: Headline, Angle, CTA",
    color:    "#3b82f6",
    Icon:     Image,
  },
];
const STATIC_BATCH_PREFIX: Record<StaticIterType, string> = {
  HEADLINE: "HL",
  VISUAL:   "VS",
};
// Combined lookup for ID generation
const ALL_BATCH_PREFIX: Record<string, string> = { ...ITER_BATCH_PREFIX, ...STATIC_BATCH_PREFIX };

// ── EFFORT BADGE ─────────────────────────────────────────────────────────────
function EffortBadge({ effort }: { effort: string }) {
  const cfg = {
    Low:    { color:"#10b981", bg:"#10b98115", border:"#10b98125" },
    Medium: { color:"#f59e0b", bg:"#f59e0b15", border:"#f59e0b25" },
    High:   { color:"#ef4444", bg:"#ef444415", border:"#ef444425" },
  }[effort] ?? { color:"#94a3b8", bg:"#94a3b815", border:"#94a3b825" };
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border" style={{ background:cfg.bg, color:cfg.color, borderColor:cfg.border }}>
      {effort} Effort
    </span>
  );
}

// ── ANIMATION ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = { hidden:{ opacity:0, y:18 }, show:{ opacity:1, y:0, transition:{ duration:0.38 } } };
const stagger: Variants = { show:{ transition:{ staggerChildren:0.07 } } };
const itemAnim: Variants = { hidden:{ opacity:0, y:12 }, show:{ opacity:1, y:0, transition:{ duration:0.3 } } };

// ── GENERATING OVERLAY ────────────────────────────────────────────────────────
function GeneratingState() {
  const steps = ["Analysing winning ad DNA…","Mapping hook alternatives…","Selecting visual variations…","Calculating format opportunities…"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 380);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="relative w-12 h-12">
        <motion.div className="absolute inset-0 rounded-full border-2 border-primary/30" />
        <motion.div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate:360 }} transition={{ duration:0.9, repeat:Infinity, ease:"linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={step} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
          transition={{ duration:0.2 }} className="text-sm text-muted-foreground"
        >{steps[step]}</motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// ── IDEA CARD ─────────────────────────────────────────────────────────────────
function IdeaCard({ num, name, desc, effort, rationale, color, isSelected, onToggle,
                    isEditing, editValue, onEditStart, onEditChange, onEditSave, customText, tags }: {
  num:          number;
  name:         string;
  desc:         string;
  effort?:      string;
  rationale?:   string;
  color:        string;
  isSelected?:  boolean;
  onToggle?:    () => void;
  isEditing?:   boolean;
  editValue?:   string;
  onEditStart?: () => void;
  onEditChange?:(v: string) => void;
  onEditSave?:  () => void;
  customText?:  string;
  tags?:        string[];
}) {
  return (
    <motion.div
      variants={itemAnim}
      onClick={isEditing ? undefined : onToggle}
      className="group flex flex-col gap-2.5 px-4 py-3.5 rounded-xl border transition-all"
      style={{
        cursor:      !isEditing && onToggle ? "pointer" : undefined,
        borderColor: isSelected ? color + "50" : "rgba(255,255,255,0.08)",
        background:  isSelected ? color + "10" : "rgba(255,255,255,0.02)",
      }}
      whileHover={!isEditing && onToggle ? { borderColor: isSelected ? color + "60" : "rgba(255,255,255,0.18)" } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-[10px] font-black font-mono tabular-nums mt-0.5 shrink-0" style={{ color, opacity:0.5 }}>
            {String(num).padStart(2,"0")}
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-foreground leading-snug">
              {customText ? <><span className="opacity-50 line-through mr-1.5">{name}</span><span style={{ color }}>{customText}</span></> : name}
            </p>
            <p className="text-xs text-foreground/60 leading-relaxed">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {effort && <EffortBadge effort={effort} />}
          {tags && tags.map(tag => (
            <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border"
              style={{ color: tag === "Suggested" ? "#f59e0b" : "#a78bfa", borderColor: tag === "Suggested" ? "#f59e0b40" : "#a78bfa40", background: tag === "Suggested" ? "#f59e0b10" : "#a78bfa10" }}>
              {tag}
            </span>
          ))}
          {isSelected && onEditStart && !isEditing && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditStart(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/35 hover:text-muted-foreground/70"
              title="Customize text"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {onToggle && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all"
              style={{
                borderColor: isSelected ? color + "60" : "rgba(255,255,255,0.15)",
                background:  isSelected ? color + "25" : "transparent",
              }}
            >
              {isSelected && <CheckCircle2 className="w-3 h-3" style={{ color }} />}
            </span>
          )}
        </div>
      </div>
      {isSelected && isEditing && (
        <div className="ml-7 mt-1" onClick={e => e.stopPropagation()}>
          <input
            autoFocus
            type="text"
            value={editValue ?? ""}
            onChange={e => onEditChange?.(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onEditSave?.(); if (e.key === "Escape") onEditSave?.(); }}
            placeholder="Custom variant label…"
            className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-foreground/80 placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/40"
          />
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={onEditSave} className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors">Save →</button>
            <button onClick={() => { onEditChange?.(""); onEditSave?.(); }} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors">Clear</button>
          </div>
        </div>
      )}
      {rationale && !isEditing && (
        <div className="border-t border-white/5 pt-2.5 ml-7">
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed italic">{rationale}</p>
        </div>
      )}
    </motion.div>
  );
}

// ── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, color, icon: Icon, children }: {
  title:    string;
  subtitle: string;
  color:    string;
  icon:     React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-card/50 overflow-hidden">
      <div className="h-0.5" style={{ background:`linear-gradient(90deg,${color}70,transparent)` }} />
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}15` }}>
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
          {children}
        </motion.div>
      </CardContent>
    </Card>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const inpCls = "w-full bg-background/60 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15";

interface WinnerForm { hookType:string; primaryAngle:string; creativeFormat:string; ctaStyle:string; roas:string; }
interface SourceAd { adVariant:string; variantId:string; hookType:string; primaryAngle:string; creativeFormat:string; roas:string; decisionState?: DecisionState; adType?: "video" | "static"; headline?: string; visualConcept?: string; }

function getLockedVariables(state: DecisionState | undefined, iterType?: IterationType | null) {
  // Explicit iteration type selection takes precedence over decision state
  if (iterType === "HOOK")      return { lockAngle: true, lockFormat: true, lockCTA: true, test: "HOOKS"     as const };
  if (iterType === "FORMAT")    return { lockHook:  true, lockAngle:  true,               test: "FORMAT"    as const };
  if (iterType === "CTA")       return { lockHook:  true, lockAngle:  true, lockFormat: true, test: "CTA"   as const };
  if (iterType === "VISUAL")    return { lockHook: true, lockAngle: true, lockFormat: true, lockCTA: true, test: "VISUAL" as const };
  // Fall back to decision-engine state
  if (state === "VALIDATED_BODY") return { lockBody: true, lockAngle: true, lockFormat: true, test: "HOOKS"        as const };
  if (state === "WEAK_SIGNAL")    return { lockHook: true,                                    test: "BODY"         as const };
  return {                                                                                     test: "BODY_REBUILD" as const };
}

const DECISION_META: Record<DecisionState, { color: string; badge: string; strategy: string }> = {
  NO_SIGNAL:      { color: "#ef4444", badge: "No Signal",      strategy: "Improving core message — rebuild body and angle" },
  WEAK_SIGNAL:    { color: "#f59e0b", badge: "Weak Signal",    strategy: "Improving core message — refine body clarity"    },
  VALIDATED_BODY: { color: "#10b981", badge: "Body Validated", strategy: "Testing new hooks — body and angle are locked"   },
};

// ── VARIANT CREATION ─────────────────────────────────────────────────────────
type IdeaSpec = { hookType:string; primaryAngle:string; creativeFormat:string; adVariant:string; };
type StaticIterType = "HEADLINE" | "VISUAL";
type SelectedVariant = { type: "HOOK" | "FORMAT" | "CTA" | "VISUAL" | "HEADLINE" | "ANGLE"; value: string; label: string; customText?: string; productionNotes?: string; adImage?: string; };

/**
 * Builds a list of variant IDs for a new iteration batch.
 *
 * • With a parent → <parentVId>-I<batchNum>-A / B / C …
 *   e.g. PROJ-V03-I01-A, PROJ-V03-I01-B
 * • Without a parent → sequential top-level IDs
 *   e.g. PROJ-V04, PROJ-V05 (does NOT break the global counter)
 */
/** Build base-test variant IDs for a new test (no parent / no iterType).
 *  Returns [testId, variantIds[]] so the caller gets both atomically. */
function buildNewTestVarIds(
  existing: any[],
  projectCode: string,
  count: number,
): { testId: string; variantIds: string[] } {
  const testId = generateTestId(projectCode, nextTestNumber(existing));
  const variantIds = Array.from({ length: count }, (_, i) =>
    generateVariantId(testId, "S", i + 1),
  );
  return { testId, variantIds };
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function CreativeIteration() {
  const { projectKey, activeProjectCode } = useProject();
  const [, navigate] = useLocation();
  const [form, setForm] = useLocalStorage<WinnerForm>(projectKey("iteration:form"), {
    hookType:       "Curiosity Hook",
    primaryAngle:   ANGLES[1],       // Transformation
    creativeFormat: FORMATS[0],      // UGC
    ctaStyle:       CTA_TYPES[0],    // Direct Response
    roas:           "3.2",
  });
  const [status,        setStatus]        = useState<"idle"|"generating"|"done">("idle");
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [sourceAd,      setSourceAd]      = useLocalStorage<SourceAd|null>(projectKey("iteration:sourceAd"), null);
  const [decisionState, setDecisionState] = useState<DecisionState | null>(null);
  const [batchResult,         setBatchResult]         = useState<{ count:number; variantIds:string[]; batchLabel:string; testId:string }|null>(null);
  const [batchPushed,         setBatchPushed]         = useState(false);
  const [selectedIterationType, setSelectedIterationType] = useState<IterationType>(null);
  const [previewTestId,   setPreviewTestId]   = useState<string | null>(null);
  const [previewVariants, setPreviewVariants] = useState<{ variantId: string; label: string }[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const [editingKey,     setEditingKey]     = useState<string | null>(null);
  const [editDraft,      setEditDraft]      = useState("");
  const [generatedHooks, setGeneratedHooks] = useState<Record<string, string[]>>({});
  const [loadingHooks,   setLoadingHooks]   = useState<Set<string>>(new Set());
  const [generatedCTAs,  setGeneratedCTAs]  = useState<Record<string, string[]>>({});
  const [loadingCTAs,    setLoadingCTAs]    = useState<Set<string>>(new Set());
  const [activeType,     setActiveType]     = useState<string | null>(null);
  const [customInputs,   setCustomInputs]   = useState<Record<string, string>>({});
  const [formatNotes,    setFormatNotes]    = useState<Record<string, string>>({});
  const [visualNotes,    setVisualNotes]    = useState<Record<string, string>>({});
  const [iterContext,    setIterContext]    = useState<{
    field: string; value: string; impact: number;
    confidence: "low" | "medium" | "high"; reason: "Focus" | "Scale";
  } | null>(null);
  const [activeAdType,          setActiveAdType]          = useLocalStorage<"video" | "static">(projectKey("iteration:activeAdType"), "video");
  const [selectedStaticIterType, setSelectedStaticIterType] = useState<StaticIterType | null>(null);
  const [selectedHookType,       setSelectedHookType]       = useState<string | null>(null);
  const [headlineInputs,         setHeadlineInputs]         = useState<Record<string, string>>({});
  const [headlineSuggestions,    setHeadlineSuggestions]    = useState<Record<string, string[]>>({});
  const [staticTextInputs,       setStaticTextInputs]       = useState<Record<string, string>>({});
  const [staticImageInputs,      setStaticImageInputs]      = useState<Record<string, string>>({});
  const formSectionRef = useRef<HTMLDivElement>(null);
  const storageKey = projectKey("iteration:state");

  // Read winner signal written by Creative Lab / Experiment Timeline
  // Falls back to restoring persisted state when no pending handoff exists
  useEffect(() => {
    const pendingRaw = localStorage.getItem(projectKey("iteration:pending"));

    if (pendingRaw) {
      localStorage.removeItem(projectKey("iteration:pending"));
      try {
        const data = JSON.parse(pendingRaw) as WinnerForm & SourceAd;
        const incomingVariantId = data.variantId ?? "";
        setForm({
          hookType:       data.hookType,
          primaryAngle:   data.primaryAngle,
          creativeFormat: data.creativeFormat,
          ctaStyle:       data.ctaStyle,
          roas:           data.roas ?? "",
        });
        setSourceAd({
          adVariant:      data.adVariant      ?? "",
          variantId:      incomingVariantId,
          hookType:       data.hookType,
          primaryAngle:   data.primaryAngle,
          creativeFormat: data.creativeFormat,
          roas:           data.roas           ?? "",
          decisionState:  data.decisionState,
          adType:         (data as any).adType         ?? "video",
          headline:       (data as any).headline       ?? "",
          visualConcept:  (data as any).visualConcept  ?? "",
        });
        if (data.decisionState) setDecisionState(data.decisionState);
        if ((data as any).adType === "static") setActiveAdType("static");
        else setActiveAdType("video");
        if ((data as any).iterationType && !((data as any).adType === "static" && (data as any).iterationType === "CTA")) {
          setSelectedIterationType((data as any).iterationType as IterationType);
        }
        if ((data as any).context) setIterContext((data as any).context);
        else setIterContext(null);

        // If the incoming ad is the same as the persisted parent, restore selections
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
          if (saved.parentVariantId && saved.parentVariantId === incomingVariantId) {
            setSelectedVariants(saved.selectedVariants ?? []);
            if (saved.selectedIterationType) setSelectedIterationType(saved.selectedIterationType);
            if (saved.previewTestId) setPreviewTestId(saved.previewTestId);
          }
        } catch (_) {}

        setIsHighlighted(true);
        setTimeout(() => {
          formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
        setTimeout(() => {
          setStatus("generating");
          setTimeout(() => setStatus("done"), 1600);
        }, 500);
        setTimeout(() => setIsHighlighted(false), 4000);
      } catch (_) {}
      return;
    }

    // No pending handoff — restore persisted iteration state
    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw);

      // Safeguard: ensure the base variant still exists
      const experiments: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const parentStillExists = saved.parentVariantId
        ? experiments.some((e: any) => e.variantId === saved.parentVariantId)
        : true;

      if (!parentStillExists) {
        localStorage.removeItem(storageKey);
        return;
      }

      if (saved.form)                setForm(saved.form);
      if (saved.sourceAd)            setSourceAd(saved.sourceAd);
      if (saved.decisionState)       setDecisionState(saved.decisionState);
      if (saved.status === "done")   setStatus("done");
      if (saved.selectedIterationType) setSelectedIterationType(saved.selectedIterationType);
      if (saved.selectedVariants?.length) setSelectedVariants(saved.selectedVariants);
      if (saved.previewTestId)       setPreviewTestId(saved.previewTestId);
    } catch (_) {}
  }, []); // runs once on mount; projectKey stable within mounted instance

  // Persist iteration state whenever relevant fields change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      form,
      sourceAd,
      decisionState,
      status,
      selectedIterationType,
      selectedVariants,
      previewTestId,
      parentVariantId: sourceAd?.variantId ?? null,
    }));
  }, [form, sourceAd, decisionState, status, selectedIterationType, selectedVariants, previewTestId]);

  function update<K extends keyof WinnerForm>(k: K, v: WinnerForm[K]) {
    setForm(f => ({ ...f, [k]:v }));
    if (status === "done") setStatus("idle");
    setBatchResult(null);
    setBatchPushed(false);
    setPreviewTestId(null);
    setPreviewVariants([]);
    setSelectedVariants([]);
  }

  /** Push the selected variants to Creative Lab as real Producing variants. */
  function createTestBatch(
    selVars: SelectedVariant[],
    iterType: IterationType | StaticIterType | null = null,
  ) {
    if (selVars.length === 0) return;
    const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
    const existing: any[] = Array.isArray(raw) ? raw : [];
    const parentVId = sourceAd?.variantId || undefined;
    const today = new Date().toISOString().slice(0, 10);

    // Resolve parent UUID + lineage for new variants
    const parentVariant = parentVId ? existing.find((e: any) => e.variantId === parentVId) : null;
    const parentUUID    = parentVariant?.id ?? null;
    const rootId        = parentVariant ? (parentVariant.rootId ?? parentVariant.id) : null;
    const parentStep    = parentVariant?.iterationStep ?? 0;
    const parentTestId  = parentVariant?.testId ?? null;

    const ideas: IdeaSpec[] = selVars.map(sv => {
      switch (sv.type) {
        case "HOOK":
          return { hookType: sv.value, primaryAngle: form.primaryAngle, creativeFormat: form.creativeFormat, adVariant: sv.label };
        case "FORMAT":
          return { hookType: form.hookType, primaryAngle: form.primaryAngle, creativeFormat: sv.value, adVariant: sv.label };
        case "CTA":
          return { hookType: form.hookType, primaryAngle: form.primaryAngle, creativeFormat: form.creativeFormat, adVariant: sv.label };
        case "HEADLINE":
          return { hookType: "", primaryAngle: form.primaryAngle, creativeFormat: "", adVariant: sv.customText ?? sv.label };
        case "ANGLE":
          return { hookType: "", primaryAngle: sv.value, creativeFormat: "", adVariant: sv.label };
        case "VISUAL":
        default:
          return { hookType: form.hookType, primaryAngle: form.primaryAngle, creativeFormat: form.creativeFormat, adVariant: sv.customText ?? sv.label };
      }
    });

    const ts = Date.now();
    const existingTests: any[] = JSON.parse(localStorage.getItem(projectKey("lab:tests")) ?? "[]");

    // ── Resolve root variant for clean lineage IDs ───────────────────────────
    const rootVariant = rootId ? existing.find((e: any) => e.id === rootId) : null;
    const rootVarId   = rootVariant?.variantId ?? parentVId;

    // ── Generate testId and variantIds from id-system ────────────────────────
    let testId: string;
    let variantIds: string[];

    if (iterType && parentVId && rootVarId) {
      const step = (ALL_BATCH_PREFIX[iterType] ?? "H") as IterBatchStep;
      testId     = generateIterationBatchId(rootVarId, step);
      const base = countExistingSiblings(existing, rootVarId, step);
      variantIds = ideas.map((_, i) => generateVariantId(rootVarId, step, base + i + 1));
    } else {
      // New base test — no parent
      const result = buildNewTestVarIds(existing, activeProjectCode, ideas.length);
      testId     = result.testId;
      variantIds = result.variantIds;
    }

    // Batch label for display
    const batchLabel = parentVId && variantIds.length
      ? (iterType ? `${parentVId} → ${iterType}` : variantIds[0])
      : "";

    // ── Persist the new test object ──────────────────────────────────────────
    const nextPhase: TestPhase = NEXT_PHASE[currentPhase];
    const inheritedPlatform = currentPlatform;
    const newTest = {
      id:              testId,
      sourceVariantId: parentVId    || null,
      parentTestId:    parentTestId || null,
      iterationType:   iterType     || null,
      phase:           nextPhase,
      platform:        inheritedPlatform || null,
      variantIds,
      createdAt:       ts,
    };
    localStorage.setItem(projectKey("lab:tests"), JSON.stringify([...existingTests, newTest]));

    const newVariants = ideas.map((idea, i) => {
      const sv = selVars[i];
      const newId = variantIds[i]; // variantId IS the unique record id — fully deterministic
      const notes = sv.type === "FORMAT"  ? (formatNotes[sv.value]?.trim() || undefined)
                  : sv.type === "VISUAL"   ? (sv.customText?.trim() || visualNotes[sv.value]?.trim() || undefined)
                  : undefined;
      return {
        id:              newId,
        variantId:       variantIds[i],
        parentVariantId: parentVId,
        parentId:        parentUUID,
        rootId:          rootId ?? newId,
        iterationType:   iterType,
        iterationStep:   parentStep + 1,
        adVariant:       idea.adVariant,
        hookType:        idea.hookType,
        primaryAngle:    idea.primaryAngle,
        creativeFormat:  idea.creativeFormat,
        cta:             form.ctaStyle,
        status:          "Draft",
        startDate:       today,
        timeline:        [],
        source:          "iteration",
        testId,                           // All variants in this batch share the same testId
        adType:          activeAdType,    // Inherit tab so variants appear on the correct tab in Creative Lab
        createdAt:       new Date().toISOString(),
        ...(notes             ? { productionNotes: notes    } : {}),
        ...((sv.adImage || staticImageInputs[sv.value]) ? { adImage: sv.adImage || staticImageInputs[sv.value] } : {}),
      };
    });

    const updated = [...existing, ...newVariants];
    localStorage.setItem(projectKey("lab:experiments"), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("clb:write"));

    setBatchResult({ count: newVariants.length, variantIds, batchLabel, testId });
    setBatchPushed(true);
  }

  /** Pure function — returns 5 headline suggestions for the given hook type.
   *  Does NOT modify any state. Callers decide what to do with the result. */
  function generateHeadlineSuggestions(hookType: string | null): string[] {
    const angle  = form.primaryAngle;
    const adName = sourceAd?.adVariant ?? "your ad";

    if (hookType === "question") return [
      `Are you still struggling with ${angle.toLowerCase()}?`,
      `What if ${angle.toLowerCase()} didn't have to be this hard?`,
      `Is your ${angle.toLowerCase()} strategy actually working?`,
      `Why are other brands winning at ${angle.toLowerCase()}?`,
      `How much is bad ${angle.toLowerCase()} costing you?`,
    ];
    if (hookType === "pain") return [
      `Stop wasting money on ${angle.toLowerCase()} that doesn't convert`,
      `The ${angle.toLowerCase()} mistake that's killing your results`,
      `Why your ${angle.toLowerCase()} ads aren't working`,
      `Still struggling with ${angle.toLowerCase()}? Here's why`,
      `The hidden problem with most ${angle.toLowerCase()} campaigns`,
    ];
    if (hookType === "result") return [
      `How we 3× ${angle.toLowerCase()} results in 30 days`,
      `This one ${angle.toLowerCase()} change grew results 3×`,
      `${angle} results in under 60 days — here's how`,
      `The exact ${angle.toLowerCase()} framework that doubled our ROI`,
      `From zero to scale: the ${angle.toLowerCase()} playbook that works`,
    ];
    if (hookType === "curiosity") return [
      `The ${angle.toLowerCase()} secret top brands aren't sharing`,
      `Why ${angle.toLowerCase()} matters more than you think`,
      `The unexpected way to win at ${angle.toLowerCase()}`,
      `What nobody tells you about ${angle.toLowerCase()}`,
      `The counterintuitive ${angle.toLowerCase()} strategy that actually works`,
    ];
    if (hookType === "bold") return [
      `This is the only ${angle.toLowerCase()} ad you'll ever need`,
      `We guarantee better ${angle.toLowerCase()} results — or your money back`,
      `Stop ${angle.toLowerCase()} the hard way — here's what actually works`,
      `The #1 ${angle.toLowerCase()} solution — proven at scale`,
      `${adName} — the last ${angle.toLowerCase()} solution you'll need`,
    ];
    return [
      `Stop ${angle.toLowerCase()} the hard way — here's what actually works`,
      `Why ${angle.toLowerCase()} matters more than you think`,
      `The ${angle.toLowerCase()} secret top brands aren't sharing`,
      `${adName} — now with one key difference`,
      `This one ${angle.toLowerCase()} change grew results 3×`,
    ];
  }

  function generate() {
    setStatus("generating");
    setBatchResult(null);
    setBatchPushed(false);
    setPreviewTestId(null);
    setPreviewVariants([]);
    setTimeout(() => setStatus("done"), 1600);
  }

  /** Compute a preview of what will be created — no localStorage writes.
   *  Only computes testId; variantIds update live via useEffect below. */
  function generatePreview() {
    setStatus("generating");
    setBatchResult(null);
    setBatchPushed(false);
    setPreviewVariants([]);

    const parentVId = sourceAd?.variantId || undefined;

    setTimeout(() => {
      const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const existing: any[] = Array.isArray(raw) ? raw : [];
      const rootVariant = parentVId
        ? (() => {
            const pv = existing.find((e: any) => e.variantId === parentVId);
            return pv?.rootId ? existing.find((e: any) => e.id === pv.rootId) : pv;
          })()
        : null;
      const rootVarId = rootVariant?.variantId ?? parentVId;
      let testId: string;
      const activeIterType = activeAdType === "static" ? selectedStaticIterType : selectedIterationType;
      if (parentVId && rootVarId && activeIterType) {
        const step = (ALL_BATCH_PREFIX[activeIterType] ?? "H") as IterBatchStep;
        testId = generateIterationBatchId(rootVarId, step);
      } else {
        testId = generateTestId(activeProjectCode, nextTestNumber(existing));
      }
      setPreviewTestId(testId);
      setStatus("done");
    }, 1600);
  }

  /** Commit a custom-written or generated text as a selected variant, then close the card. */
  function commitVariant(varType: "HOOK" | "CTA" | "HEADLINE", typeKey: string, text: string) {
    const dedupeKey = String(selectedVariants.length + 1);
    const sv: SelectedVariant = {
      type: varType,
      value: `custom:${typeKey}:${dedupeKey}`,
      label: text.length > 60 ? text.slice(0, 57) + "…" : text,
      customText: text,
    };
    setSelectedVariants(prev => [...prev, sv]);
  }

  function toggleVariant(sv: SelectedVariant) {
    setSelectedVariants(prev => {
      const exists = prev.some(v => v.type === sv.type && v.value === sv.value);
      return exists
        ? prev.filter(v => !(v.type === sv.type && v.value === sv.value))
        : [...prev, sv];
    });
    setEditingKey(null);
  }

  /** Start editing the custom label for a selected variant. */
  function startEdit(sv: SelectedVariant) {
    const key = `${sv.type}:${sv.value}`;
    const current = selectedVariants.find(v => v.type === sv.type && v.value === sv.value);
    setEditDraft(current?.customText ?? "");
    setEditingKey(key);
  }

  /** Save the draft custom label back into the variant. */
  function confirmEdit(sv: SelectedVariant) {
    setSelectedVariants(prev =>
      prev.map(v => v.type === sv.type && v.value === sv.value
        ? { ...v, customText: editDraft.trim() || undefined }
        : v
      )
    );
    setEditingKey(null);
    setEditDraft("");
  }

  /**
   * Generate template-based hook suggestions for a given hook type.
   * Structured to be swapped out for an AI call in the future.
   */
  function generateHooks(hookType: string) {
    setLoadingHooks(prev => new Set(prev).add(hookType));

    // Context derived from the winning ad form — AI-replaceable payload
    const angle   = form.primaryAngle;
    const format  = form.creativeFormat;
    const ctaStr  = form.ctaStyle;
    const cat     = HOOK_CATEGORIES.find(c => c.type === hookType);

    // Per-angle synonyms so templates read naturally
    const ANGLE_CTX: Record<string, { problem: string; goal: string; result: string }> = {
      "Pain Point":     { problem: "this problem",       goal: "fixing it for good",     result: "real relief"         },
      "Transformation": { problem: "the old approach",   goal: "the transformation",     result: "the new outcome"     },
      "Social Proof":   { problem: "doubt",              goal: "building trust",         result: "proven results"      },
      "Curiosity":      { problem: "the hidden truth",   goal: "finding the answer",     result: "clarity"             },
      "Authority":      { problem: "lack of credibility","goal": "authority positioning","result": "recognition"       },
      "Comparison":     { problem: "the wrong choice",   goal: "the better option",      result: "the right pick"      },
      "Urgency":        { problem: "missed opportunity", goal: "acting now",             result: "the outcome"         },
    };
    const ctx = ANGLE_CTX[angle] ?? { problem: angle.toLowerCase(), goal: "getting results", result: "success" };

    // Per-hook-type fill-in templates — structured for future AI replacement
    const TEMPLATES: Record<string, string[]> = {
      "Negative Hook": [
        `Stop making this ${ctx.problem} mistake`,
        `Why your ${angle} strategy is silently failing you`,
        `The ${angle.toLowerCase()} approach that's costing you ${ctx.result}`,
        `Most people get ${ctx.problem} completely wrong — here's why`,
        `This is why your ${angle.toLowerCase()} isn't converting`,
      ],
      "Question Hook": [
        `What if your ${angle.toLowerCase()} strategy is backwards?`,
        `Why do some people nail ${ctx.goal} while others never do?`,
        `Have you ever wondered why ${ctx.problem} feels so hard?`,
        `What's the real secret behind ${ctx.result}?`,
        `Is your ${format} actually doing what you think it is?`,
      ],
      "Curiosity Hook": [
        `The one ${angle.toLowerCase()} thing your competitors aren't doing`,
        `I stopped the normal approach for 30 days — here's what happened`,
        `There's a pattern hidden in every high-${ctx.result} ${format}`,
        `Nobody talks about this in ${angle.toLowerCase()} — but they should`,
        `The counterintuitive truth about ${ctx.goal}`,
      ],
      "Statistic Hook": [
        `93% of ${format}s fail at ${ctx.goal} — here's the 7%`,
        `The data on ${angle.toLowerCase()} is not what anyone expects`,
        `In a study of top-performing ads, one ${angle.toLowerCase()} pattern dominated`,
        `Only 1 in 10 brands gets ${ctx.result} right — this is how`,
        `This single ${angle.toLowerCase()} metric predicts performance better than anything else`,
      ],
      "Anecdotal Hook": [
        `I used to think ${ctx.problem} was unsolvable — until I found this`,
        `My first ${format} bombed. Then I fixed one ${angle.toLowerCase()} thing`,
        `A client came to me struggling with ${ctx.problem}. Here's what changed`,
        `Three months ago I had no idea how to get ${ctx.result}. Today I do`,
        `She told me ${angle.toLowerCase()} didn't matter. She was wrong`,
      ],
      "Story Hook": [
        `I was sitting there frustrated — ${ctx.problem} wasn't working at all`,
        `Everything changed the day I finally understood ${ctx.goal}`,
        `Two years ago this exact ${format} approach would have seemed impossible`,
        `They said ${ctx.goal} couldn't be done this way — we proved them wrong`,
        `The moment I stopped focusing on ${ctx.problem} and started doing this instead`,
      ],
      "Promise Hook": [
        `In the next 60 seconds I'll show you exactly how to ${ctx.goal}`,
        `By the end of this ${format} you'll have a clear path to ${ctx.result}`,
        `This ${angle.toLowerCase()} framework delivers ${ctx.result} — every time`,
        `I'm going to show you the exact ${angle.toLowerCase()} system that works`,
        `${ctaStr} — but first, let me show you why ${ctx.result} is closer than you think`,
      ],
      "Result-Oriented Hook": [
        `Here's how we achieved ${ctx.result} using pure ${angle.toLowerCase()}`,
        `This ${format} system consistently delivers ${ctx.result} — watch`,
        `The ${angle.toLowerCase()} approach that gets ${ctx.result} without the guesswork`,
        `Real result: from stuck on ${ctx.problem} to ${ctx.result} in 90 days`,
        `Our clients use this exact ${angle.toLowerCase()} structure to get ${ctx.result}`,
      ],
      "Controversial Hook": [
        `${angle} is not what you've been taught — and that's the problem`,
        `The ${format} industry doesn't want you knowing this ${angle.toLowerCase()} trick`,
        `Forget everything you know about ${ctx.goal}. Here's the truth`,
        `Hot take: ${angle.toLowerCase()} done the standard way is a waste of budget`,
        `Everyone is optimising for the wrong ${angle.toLowerCase()} metric`,
      ],
      "Quotation Hook": [
        `"The best ${angle.toLowerCase()} is the one your audience actually believes." — here's how`,
        `The smartest marketers say: nail ${ctx.goal} first. Everything else is noise`,
        `"If your ${format} isn't driving ${ctx.result}, you don't have a budget problem."`,
        `There's an old rule about ${angle.toLowerCase()}: ${ctx.result} follows ${ctx.goal} — always`,
        `The best line I ever heard about ${ctx.problem}: "stop blaming the ad."`,
      ],
    };

    // Fall back to using category's own examples if no template defined
    const fallback = (cat?.examples ?? []).slice(0, 5).map(e => e.length > 90 ? e.slice(0, 87) + "…" : e);
    const hooks = TEMPLATES[hookType] ?? fallback;

    // Simulate async — structure ready for AI API drop-in
    setTimeout(() => {
      setGeneratedHooks(prev => ({ ...prev, [hookType]: hooks }));
      setLoadingHooks(prev => { const n = new Set(prev); n.delete(hookType); return n; });
    }, 320);
  }

  /**
   * Generate template-based CTA suggestions for a given CTA type.
   * Structured to be swapped out for an AI call or hypothesis-aware logic.
   */
  function generateCTAs(ctaType: string) {
    setLoadingCTAs(prev => new Set(prev).add(ctaType));

    // Context from winning ad — AI-replaceable payload
    const offer  = form.ctaStyle;    // e.g. "Free Trial", "Demo"
    const angle  = form.primaryAngle;
    const format = form.creativeFormat;

    // Map each CTA type to its persuasion family for template selection
    const FAMILY: Record<string, string> = {
      "Free Trial":  "URGENCY",
      "Get Started": "DIRECT",
      "Shop Now":    "URGENCY",
      "Download":    "DIRECT",
      "Demo":        "AUTHORITY",
      "Book Call":   "AUTHORITY",
      "Learn More":  "SOFT",
      "Watch Video": "CURIOSITY",
    };
    const family = FAMILY[ctaType] ?? "DIRECT";
    const offerLower = offer.toLowerCase();

    const TEMPLATES: Record<string, string[]> = {
      DIRECT: [
        `Start your ${offerLower} today`,
        `Get started with ${offerLower}`,
        `Try ${offerLower} now — it's free`,
        `Activate your ${offerLower}`,
        `Begin your ${offerLower} in seconds`,
      ],
      SOFT: [
        `See how it works`,
        `Take a closer look`,
        `Explore how this can help you`,
        `Find out if this is right for you`,
        `Learn the ${angle.toLowerCase()} approach`,
      ],
      URGENCY: [
        `Start your ${offerLower} before it's gone`,
        `Don't miss out — try it today`,
        `Limited time — get started now`,
        `Claim your ${offerLower} while it lasts`,
        `Act now — ${angle.toLowerCase()} results don't wait`,
      ],
      CURIOSITY: [
        `Find out how it works`,
        `See what makes this different`,
        `Discover the method behind it`,
        `Watch what happens when you apply ${angle.toLowerCase()}`,
        `See why ${format} creators are switching`,
      ],
      AUTHORITY: [
        `Join thousands already using this`,
        `Trusted by professionals — try it now`,
        `See why experts recommend this`,
        `Used by top ${format} teams — book your ${offerLower}`,
        `The ${angle.toLowerCase()} approach the best brands use`,
      ],
    };

    const hooks = TEMPLATES[family] ?? TEMPLATES["DIRECT"];

    setTimeout(() => {
      setGeneratedCTAs(prev => ({ ...prev, [ctaType]: hooks }));
      setLoadingCTAs(prev => { const n = new Set(prev); n.delete(ctaType); return n; });
    }, 320);
  }

  /** Clear all selection state and remove from storage. */
  function clearIterationState() {
    setSelectedVariants([]);
    setSelectedIterationType(null);
    setPreviewTestId(null);
    setPreviewVariants([]);
    setEditingKey(null);
    setGeneratedHooks({});
    setLoadingHooks(new Set());
    setGeneratedCTAs({});
    setLoadingCTAs(new Set());
    setActiveType(null);
    setCustomInputs({});
    setFormatNotes({});
    setVisualNotes({});
    localStorage.removeItem(storageKey);
  }

  // Live-update previewVariants whenever selection or testId changes
  useEffect(() => {
    if (!previewTestId) { setPreviewVariants([]); return; }
    if (selectedVariants.length === 0) { setPreviewVariants([]); return; }

    const parentVId = sourceAd?.variantId || undefined;
    const iterType  = selectedIterationType;
    const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
    const existing: any[] = Array.isArray(raw) ? raw : [];
    const parentVariant = parentVId ? existing.find((e: any) => e.variantId === parentVId) : null;
    const parentUUID    = parentVariant?.id ?? null;

    let variantIds: string[];
    if (iterType && parentVId) {
      const step      = ITER_BATCH_PREFIX[iterType] as IterBatchStep;
      const rootVar   = parentVariant?.rootId ? existing.find((e: any) => e.id === parentVariant.rootId) : parentVariant;
      const rootVarId = rootVar?.variantId ?? parentVId;
      const sibCount  = countExistingSiblings(existing, rootVarId, step);
      variantIds = selectedVariants.map((_, i) => generateVariantId(rootVarId, step, sibCount + i + 1));
    } else {
      variantIds = buildNewTestVarIds(existing, activeProjectCode, selectedVariants.length).variantIds;
    }

    setPreviewVariants(variantIds.map((id, i) => ({ variantId: id, label: selectedVariants[i]?.label ?? id })));
  }, [selectedVariants, previewTestId, selectedIterationType]); // eslint-disable-line

  // ── Library data (read from Script Matrix storage) ───────────────────────
  const scriptHooks = useMemo<{ type:string; text:string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(projectKey("script:hooks")) ?? "[]"); } catch { return []; }
  }, [projectKey, status]); // re-read when status changes (user may have added hooks mid-session)

  const scriptCTAs = useMemo<{ type:string; text:string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(projectKey("script:ctas")) ?? "[]"); } catch { return []; }
  }, [projectKey, status]);

  // ── Performance analysis from source variant ──────────────────────────────
  const sourcePerf = useMemo<{ ctr:number; hold:number; cpa:number } | null>(() => {
    if (!sourceAd?.variantId) return null;
    try {
      const experiments: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const variant = experiments.find((e: any) => e.variantId === sourceAd.variantId);
      if (!variant?.timeline?.length) return null;
      const latest = [...variant.timeline].sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
      return { ctr: latest.ctr ?? 0, hold: latest.hold ?? 0, cpa: latest.cpa ?? 0 };
    } catch { return null; }
  }, [sourceAd?.variantId, projectKey]);

  // ── Performance insights from source variant ─────────────────────────────
  const perfInsight = useMemo<PerformanceInsight | null>(() => {
    if (!sourcePerf) return null;
    return analyzeInsights({
      ctr:      sourcePerf.ctr,
      holdRate: sourcePerf.hold,
      cpa:      sourcePerf.cpa,
      targetCpa: 50,
    });
  }, [sourcePerf]);

  // ── Current test phase — derived purely from the source variant's ID suffix ──
  // No localStorage reads. Stable across re-renders with no extra deps.
  const currentPhase = useMemo<TestPhase>(() => {
    if (!sourceAd?.variantId) return "script";
    return getIterationPhaseFromId(sourceAd.variantId);
  }, [sourceAd?.variantId]);

  // ── Platform — inherited from latest test for this source variant ──────────
  const currentPlatform = useMemo<string | null>(() => {
    if (!sourceAd?.variantId) return null;
    try {
      const tests: any[] = JSON.parse(localStorage.getItem(projectKey("lab:tests")) ?? "[]");
      const relevant = tests
        .filter((t: any) => t.sourceVariantId === sourceAd.variantId)
        .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      // Also fall back to checking the variant's own platform field
      const fromTest = relevant[0]?.platform ?? null;
      if (fromTest) return fromTest;
      const experiments: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const variant = experiments.find((e: any) => e.variantId === sourceAd.variantId);
      return variant?.platform ?? null;
    } catch { return null; }
  }, [sourceAd?.variantId, batchPushed, projectKey]);

  // Auto-advance selectedIterationType when a source ad is selected.
  // We advance to the NEXT phase (not the current one): selecting a script
  // auto-starts hook testing; selecting a winning hook auto-starts format, etc.
  useEffect(() => {
    if (!sourceAd?.variantId) {
      setSelectedIterationType(null);
      return;
    }

    if (activeAdType === "static") {
      // Static ad iteration order: Headline → Visual → Angle
      const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      const children = raw.filter(e => e.parentVariantId === sourceAd.variantId);
      const hasHL = children.some(e => e.iterationType === "HEADLINE");
      const hasVS = children.some(e => e.iterationType === "VISUAL");

      if (!hasHL) setSelectedStaticIterType("HEADLINE");
      else if (!hasVS) setSelectedStaticIterType("VISUAL");
      else setSelectedStaticIterType(null);
      return;
    }

    // Video logic: advance based on phase sequence
    const nextPhase = getNextIterationPhase(sourceAd.variantId);
    const nextIterType = nextPhase ? PHASE_TO_ITER[nextPhase] : null;
    setSelectedIterationType(nextIterType);
  }, [sourceAd?.variantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Learned patterns from historical winning data ─────────────────────────
  const learnedPatterns = useMemo<LearnedPatterns | null>(() => {
    try {
      const tests:       any[] = JSON.parse(localStorage.getItem(projectKey("lab:tests"))       ?? "[]");
      const experiments: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
      return getLearnedPatterns(tests, experiments);
    } catch { return null; }
  }, [projectKey, status]);

  // ── Computed suggestions ──────────────────────────────────────────────────
  const hookExpansion   = (HOOK_NEXT[form.hookType]   ?? HOOK_TYPES.filter(h => h !== form.hookType).slice(0,4));
  const formatExpansion = (FORMAT_NEXT[form.creativeFormat] ?? FORMATS.filter(f => f !== form.creativeFormat).slice(0,4));
  const visualIdeas     = VISUAL_OPTIONS;

  const hasROAS = form.roas && parseFloat(form.roas) > 0;
  const locks   = getLockedVariables(decisionState ?? undefined, selectedIterationType);

  return (
    <PageTransition>
      <div className="flex flex-col gap-12 pb-20">

        {/* HEADER — dynamic once iteration type is chosen */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <AnimatePresence mode="wait">
            {(() => {
              const activeIterDef = activeAdType === "static"
                ? STATIC_ITER_ACTION_DEFS.find(d => d.type === selectedStaticIterType)
                : ITER_ACTION_DEFS.find(d => d.type === selectedIterationType);
              if (activeIterDef) {
                const def = activeIterDef;
                const key = `${activeAdType}:${def.type}`;
                return (
                  <motion.div key={key} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border"
                        style={{ background: def.color + "18", color: def.color, borderColor: def.color + "35" }}>
                        <def.Icon className="w-3 h-3" style={{ color: def.color }} />
                        {def.label}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedIterationType(null);
                          setSelectedStaticIterType(null);
                          setBatchResult(null); setBatchPushed(false);
                          setPreviewTestId(null); setPreviewVariants([]);
                          setSelectedVariants([]); setGeneratedHooks({});
                          setGeneratedCTAs({}); setActiveType(null);
                          setCustomInputs({}); setFormatNotes({}); setVisualNotes({});
                          setStaticTextInputs({});
                        }}
                        className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{def.label}</h1>
                    <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">{def.desc}</p>
                  </motion.div>
                );
              }
              return (
                <motion.div key="default" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.25 }}>
                  <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-400 bg-violet-500/5">Phase 4</Badge>
                  <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Creative Iteration Engine</h1>
                  <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
                    {activeAdType === "static"
                      ? "Static Ad Iteration — start from a winning static ad, then choose what to change."
                      : "Start from a real ad. Then choose what to improve and generate your next test batch."}
                  </p>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </motion.div>

        {/* ══ AD TYPE SELECTOR ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4">
          {/* Video Ads card */}
          <div
            onClick={() => !sourceAd && setActiveAdType("video")}
            className={`rounded-xl border p-5 transition-all ${
              activeAdType === "video"
                ? "border-violet-500/40 bg-violet-500/[0.08]"
                : "border-white/8 bg-white/[0.02] opacity-40"
            } ${!sourceAd ? "cursor-pointer hover:opacity-70" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400/60">Video Testing</span>
              {activeAdType === "video" && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  {sourceAd ? "Active" : "Selected"}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground/80 mb-1">Hook → Format → Visual</p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Find the message first. Then test how it looks. Change one variable at a time.
            </p>
          </div>

          {/* Static Ads card */}
          <div
            onClick={() => !sourceAd && setActiveAdType("static")}
            className={`rounded-xl border p-5 transition-all ${
              activeAdType === "static"
                ? "border-amber-500/40 bg-amber-500/[0.08]"
                : "border-white/8 bg-white/[0.02] opacity-40"
            } ${!sourceAd ? "cursor-pointer hover:opacity-70" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400/60">Static Testing</span>
              {activeAdType === "static" && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {sourceAd ? "Active" : "Selected"}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-foreground/80 mb-1">Headline × Visual → Angle</p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Test combinations first. Find the winning Headline + Visual pair, then refine the angle.
            </p>
          </div>
        </div>

        {/* ══ STEP 1 — SELECT BASE CREATIVE ══════════════════════════════════ */}
        <motion.div ref={formSectionRef} variants={fadeUp} initial="hidden" animate="show" transition={{ delay:0.06 }}>
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Step 1</p>
            <h2 className="text-xl font-bold tracking-tight mb-1">Select your base creative</h2>
            <p className="text-sm text-muted-foreground">Choose the winning ad you want to iterate from. Start with a real creative, not an abstract idea.</p>
          </div>

          <AnimatePresence mode="wait">
            {!sourceAd ? (
              /* ── EMPTY STATE ─────────────────────────────────────────── */
              <motion.div key="empty"
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                transition={{ duration:0.2 }}
              >
                <Card className="border-white/8 bg-card/50 border-dashed overflow-hidden">
                  <CardContent className="pt-0">
                    {(() => {
                      const rawExps: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
                      // Only show ads matching the currently active ad type tab
                      const typeFiltered = rawExps.filter((e: any) =>
                        activeAdType === "static"
                          ? e.adType === "static"
                          : e.adType === "video" || !e.adType
                      );
                      const candidates = typeFiltered
                        .filter((e: any) => e.decisionState === "VALIDATED_BODY" || (e.roas && parseFloat(e.roas) > 2))
                        .slice(0, 3);
                      const fallbacks = candidates.length < 2
                        ? typeFiltered.filter((e: any) => !candidates.find((c:any) => c.variantId === e.variantId)).slice(0, 3 - candidates.length)
                        : [];
                      const recommended = [...candidates, ...fallbacks].slice(0, 3);

                      return (
                        <div className="py-10 flex flex-col items-center gap-6">
                          {/* Icon + message */}
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="w-12 h-12 rounded-2xl border border-white/8 bg-white/[0.03] flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-muted-foreground/30" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-foreground/80 mb-1">No base creative selected</p>
                              <p className="text-sm text-muted-foreground/55">Select a winning ad to start iteration</p>
                            </div>
                            <button
                              onClick={() => {
                                // Tell the timeline to open on the matching ad type tab
                                localStorage.setItem("clb:ui:timeline:adTypeFilter", activeAdType);
                                navigate("/experiment-timeline");
                              }}
                              className="flex items-center gap-1.5 text-sm font-semibold text-primary/80 hover:text-primary transition-colors mt-1 group"
                            >
                              Choose from experiments
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>

                          {/* Recommended ads (if any exist) */}
                          {recommended.length > 0 && (
                            <div className="w-full max-w-xl">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center mb-3">
                                Recommended starting points
                              </p>
                              <div className="flex flex-col gap-2">
                                {recommended.map((ad: any) => (
                                  <button key={ad.variantId}
                                    onClick={() => {
                                      setSourceAd({
                                        variantId:      ad.variantId,
                                        adVariant:      ad.adVariant ?? ad.hookType ?? "",
                                        hookType:       ad.hookType ?? "",
                                        primaryAngle:   ad.primaryAngle ?? "",
                                        creativeFormat: ad.creativeFormat ?? "",
                                        roas:           ad.roas ?? "",
                                        decisionState:  ad.decisionState,
                                      });
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04] transition-colors text-left group"
                                  >
                                    <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-foreground/80">{ad.variantId}</p>
                                      <p className="text-[11px] text-muted-foreground/50 truncate">{ad.adVariant ?? ad.hookType}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                      {ad.creativeFormat && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/8 text-muted-foreground/50">{ad.creativeFormat}</span>
                                      )}
                                      {ad.roas && parseFloat(ad.roas) > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 font-bold">{parseFloat(ad.roas).toFixed(1)}× ROAS</span>
                                      )}
                                    </div>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* ── SOURCE AD + VARIABLES PANEL ────────────────────────── */
              <motion.div key="selected"
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                transition={{ duration:0.2 }}
                className="flex flex-col gap-3"
              >
                {/* Source banner */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07]">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70 mb-0.5">Base Creative</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {sourceAd.variantId && <span className="text-xs font-bold text-emerald-300">{sourceAd.variantId}</span>}
                      {sourceAd.adVariant  && <span className="text-xs text-foreground/70 truncate">— {sourceAd.adVariant}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {[
                        { label: "Hook",   value: sourceAd.hookType       },
                        { label: "Angle",  value: sourceAd.primaryAngle   },
                        { label: "Format", value: sourceAd.creativeFormat },
                        ...(sourceAd.roas && parseFloat(sourceAd.roas) > 0
                          ? [{ label: "ROAS", value: `${parseFloat(sourceAd.roas).toFixed(1)}×` }]
                          : []),
                      ].map(({ label, value }) => (
                        <span key={label} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/15 bg-emerald-500/[0.06] text-emerald-300/80">
                          <span className="text-emerald-500/50 font-bold">{label}:</span> {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setSourceAd(null)}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
                    title="Change creative"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Testing / Locked Variables panel */}
                {(() => {
                  const def = selectedIterationType
                    ? ITER_ACTION_DEFS.find(d => d.type === selectedIterationType)!
                    : null;

                  const MAIN_VARS = [
                    { label: "Hook",   value: form.hookType,       iterType: "HOOK"   as const, color: "#8b5cf6" },
                    { label: "Format", value: form.creativeFormat, iterType: "FORMAT" as const, color: "#10b981" },
                    { label: "CTA",    value: form.ctaStyle,       iterType: "CTA"    as const, color: "#f59e0b" },
                  ];
                  const isVisualOnly = selectedIterationType === "VISUAL";

                  const changingVar = def && !isVisualOnly
                    ? MAIN_VARS.find(v => v.iterType === selectedIterationType) ?? null
                    : null;
                  const lockedVars = def
                    ? MAIN_VARS.filter(v => v.iterType !== selectedIterationType)
                    : MAIN_VARS;

                  const accentColor = def?.color ?? "#10b981";

                  return (
                    <Card className={`overflow-hidden transition-all duration-400 ${
                      isHighlighted
                        ? "border-emerald-500/60 bg-emerald-500/[0.07] shadow-xl shadow-emerald-500/15 ring-1 ring-emerald-500/30"
                        : "border-white/8 bg-card/50"
                    }`}>
                      <div className="h-0.5 transition-all duration-400"
                        style={{ background: `linear-gradient(90deg,${accentColor}60,transparent)` }} />
                      <CardContent className="pt-5 pb-5">

                        {/* Dynamic header */}
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-all duration-300"
                            style={{ background: accentColor + "15" }}>
                            {def
                              ? <def.Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
                              : <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45">Control</p>
                            <p className="text-sm font-bold leading-tight transition-all duration-300"
                              style={{ color: def ? accentColor : "hsl(var(--foreground))" }}
                            >
                              {def ? `Testing: ${def.label}` : "Base Creative locked"}
                            </p>
                          </div>
                          {hasROAS && (
                            <span className="px-2.5 py-1 rounded-lg text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 shrink-0">
                              <TrendingUp className="w-3.5 h-3.5" />{parseFloat(form.roas).toFixed(1)}× ROAS
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-4">
                          {/* Changing section */}
                          <AnimatePresence>
                            {changingVar && (
                              <motion.div key="changing"
                                initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                                exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-[9px] font-black uppercase tracking-widest mb-2"
                                  style={{ color: accentColor + "99" }}>Changing</p>
                                <div className="px-3 py-2.5 rounded-lg border text-xs font-semibold"
                                  style={{ borderColor: accentColor + "50", background: accentColor + "12", color: accentColor }}
                                >
                                  {changingVar.label}: {changingVar.value}
                                </div>
                              </motion.div>
                            )}
                            {isVisualOnly && activeAdType !== "static" && (
                              <motion.div key="visual-changing"
                                initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                                exit={{ opacity:0, height:0 }} transition={{ duration:0.2 }}
                                className="overflow-hidden"
                              >
                                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400/70 mb-2">Changing</p>
                                <div className="px-3 py-2.5 rounded-lg border border-blue-500/35 bg-blue-500/10 text-xs font-semibold text-blue-300">
                                  Visual execution — actor, setting, editing style
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Holding constant */}
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">
                              {def ? "Holding constant" : "All variables locked"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {activeAdType === "static" ? (
                                <>
                                  <div className="px-3 py-2 rounded-lg border border-white/8 bg-white/[0.03] text-xs font-medium text-foreground/55">
                                    <span className="text-muted-foreground/35 font-bold">Headline:</span> {sourceAd?.headline || "—"}
                                  </div>
                                  <div className="px-3 py-2 rounded-lg border border-white/8 bg-white/[0.03] text-xs font-medium text-foreground/55">
                                    <span className="text-muted-foreground/35 font-bold">Visual:</span> {sourceAd?.visualConcept || "—"}
                                  </div>
                                </>
                              ) : (
                                lockedVars.map(({ label, value, color }) => (
                                  <div key={label} className="px-3 py-2 rounded-lg border border-white/8 bg-white/[0.03] text-xs font-medium text-foreground/55">
                                    <span className="text-muted-foreground/35 font-bold">{label}:</span> {value}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Strategy (angle) — always separate */}
                          <div className="pt-3 border-t border-white/[0.05]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-2">Strategy · locked</p>
                            <div className="inline-flex px-3 py-2 rounded-lg border border-white/6 bg-white/[0.02] text-xs font-medium text-foreground/45 italic">
                              {form.primaryAngle}
                            </div>
                          </div>
                        </div>

                      </CardContent>
                    </Card>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ══ STEP 2 — WHAT DO YOU WANT TO IMPROVE? ═════════════════════════ */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once:true, amount:0.04 }}
          className={`transition-opacity duration-300 ${!sourceAd ? "opacity-30 pointer-events-none select-none" : ""}`}
        >
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Step 2</p>
            <h2 className="text-xl font-bold tracking-tight mb-1">What do you want to improve?</h2>
            <p className="text-sm text-muted-foreground">
              {activeAdType === "static"
                ? "Choose what to test next. All other elements stay locked to isolate the variable."
                : "Select the dimension you are changing. Everything else stays locked to isolate the variable being tested."}
            </p>
          </div>

          {/* ── Phase progress pipeline ───────────────────────────────────── */}
          {sourceAd && activeAdType !== "static" && (() => {
            const phaseIdx = PHASE_SEQUENCE.indexOf(currentPhase);
            const PHASE_LABELS: Record<TestPhase, string> = {
              script: "Script", hook: "Hook", format: "Format", visual: "Visual", cta: "CTA",
            };
            return (
              <div className="mb-6 flex items-center flex-wrap gap-0">
                {PHASE_SEQUENCE.map((ph, idx) => {
                  const isCompleted = idx < phaseIdx;
                  const isActive    = ph === currentPhase;
                  return (
                    <div key={ph} className="flex items-center">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors
                          ${isCompleted
                            ? "bg-violet-500 text-white"
                            : isActive
                              ? "bg-violet-500/20 border border-violet-500 text-violet-400"
                              : "bg-white/5 border border-white/10 text-muted-foreground/30"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[11px] font-semibold transition-colors
                          ${isActive ? "text-violet-400" : isCompleted ? "text-muted-foreground/60" : "text-muted-foreground/25"}`}
                        >
                          {PHASE_LABELS[ph]}
                        </span>
                      </div>
                      {idx < PHASE_SEQUENCE.length - 1 && (
                        <div className={`h-px w-6 mx-2 transition-colors
                          ${idx < phaseIdx ? "bg-violet-500/40" : "bg-white/8"}`}
                        />
                      )}
                    </div>
                  );
                })}
                {currentPlatform && (
                  <span className="ml-4 text-[10px] text-muted-foreground/40 font-medium border border-white/8 rounded px-1.5 py-0.5">
                    {currentPlatform}
                  </span>
                )}
              </div>
            );
          })()}

          {sourceAd && activeAdType === "static" && (() => {
            const STATIC_PHASES = ["headline", "visual", "angle"] as const;
            type StaticPhase = typeof STATIC_PHASES[number];
            const STATIC_LABELS: Record<StaticPhase, string> = {
              headline: "Headline", visual: "Visual", angle: "Angle",
            };

            const raw: any[] = JSON.parse(localStorage.getItem(projectKey("lab:experiments")) ?? "[]");
            const children = raw.filter(e => e.parentVariantId === sourceAd?.variantId);
            const hasHL = children.some(e => e.iterationType === "HEADLINE");
            const hasVS = children.some(e => e.iterationType === "VISUAL");

            const currentPhaseIdx = !hasHL ? 0 : !hasVS ? 1 : 2;

            return (
              <div className="mb-6 flex items-center flex-wrap gap-0">
                {STATIC_PHASES.map((ph, idx) => {
                  const isCompleted = idx < currentPhaseIdx;
                  const isActive    = idx === currentPhaseIdx;
                  return (
                    <div key={ph} className="flex items-center">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors
                          ${isCompleted
                            ? "bg-amber-500 text-white"
                            : isActive
                              ? "bg-amber-500/20 border border-amber-500 text-amber-400"
                              : "bg-white/5 border border-white/10 text-muted-foreground/30"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span className={`text-[11px] font-semibold transition-colors
                          ${isActive ? "text-amber-400" : isCompleted ? "text-muted-foreground/60" : "text-muted-foreground/25"}`}
                        >
                          {STATIC_LABELS[ph]}
                        </span>
                      </div>
                      {idx < STATIC_PHASES.length - 1 && (
                        <div className={`h-px w-6 mx-2 transition-colors
                          ${idx < currentPhaseIdx ? "bg-amber-500/40" : "bg-white/8"}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Ad Performance (informational only) ── */}
          {sourcePerf && (() => {
            const severity = getSeverityBreakdown({
              ctr:       sourcePerf.ctr,
              holdRate:  sourcePerf.hold,
              cpa:       sourcePerf.cpa,
              targetCpa: 50,
            });

            const STATIC_BARS: { label: string; key: "ctr" | "holdRate" | "cpa"; metric: string }[] = [
              { label: "CTR",  key: "ctr", metric: `${sourcePerf.ctr.toFixed(1)}%`  },
              { label: "CPA",  key: "cpa", metric: `$${sourcePerf.cpa.toFixed(0)}`  },
            ];

            const VIDEO_BARS: { label: string; key: "ctr" | "holdRate" | "cpa"; metric: string }[] = [
              { label: "Hook CTR",   key: "ctr",      metric: `${sourcePerf.ctr.toFixed(1)}%`  },
              { label: "Hold Rate",  key: "holdRate", metric: `${sourcePerf.hold.toFixed(0)}%` },
              { label: "CPA",        key: "cpa",      metric: `$${sourcePerf.cpa.toFixed(0)}`  },
            ];

            const bars = activeAdType === "static" ? STATIC_BARS : VIDEO_BARS;

            const worstKey = severity.ctr >= severity.holdRate && severity.ctr >= severity.cpa ? "ctr"
              : severity.holdRate >= severity.cpa ? "holdRate" : "cpa";

            return (
              <div className="mb-5 rounded-xl border border-white/10 bg-card/60 overflow-hidden">
                <div className="h-0.5" style={{ background: "linear-gradient(90deg,rgba(148,163,184,0.3),transparent)" }} />

                <div className="p-5 flex flex-col gap-5">

                  {/* ── Header ── */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                        Ad Performance · {sourceAd?.variantId}
                      </p>
                    </div>
                  </div>

                  {/* ── Metric bars ── */}
                  <div className="flex flex-col gap-2.5">
                    {bars.map(({ label, key, metric }) => {
                      const val      = severity[key];
                      const isWorst  = key === worstKey && val > 0;
                      const barColor = isWorst ? "#ef4444" : val > 0 ? "#ffffff30" : "transparent";
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium"
                              style={{ color: isWorst ? "#ef4444cc" : "rgba(148,163,184,0.5)" }}
                            >{label}</span>
                            <span className="text-[10px] font-mono text-muted-foreground/35">{metric}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05]">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${val * 100}%`, background: barColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            );
          })()}

          {activeAdType === "static" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STATIC_ITER_ACTION_DEFS.map((def) => {
                const isSelected = selectedStaticIterType === def.type;
                return (
                  <motion.button
                    key={def.type}
                    onClick={() => {
                      const next: StaticIterType | null = isSelected ? null : def.type;
                      setSelectedStaticIterType(next);
                      setBatchResult(null);
                      setBatchPushed(false);
                      setPreviewTestId(null);
                      setPreviewVariants([]);
                      setSelectedVariants([]);
                      setStaticTextInputs({});
                    }}
                    className="flex flex-col gap-3 p-4 rounded-xl border text-left transition-colors relative"
                    style={{
                      borderColor: isSelected ? def.color + "55" : "rgba(255,255,255,0.08)",
                      background:  isSelected ? def.color + "0c" : "rgba(255,255,255,0.015)",
                      boxShadow:   isSelected ? `0 0 0 1px ${def.color}28` : undefined,
                    }}
                    whileHover={{ borderColor: isSelected ? def.color + "55" : "rgba(255,255,255,0.15)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: def.color + "18", border: `1px solid ${def.color}28` }}
                      >
                        <def.Icon className="w-4 h-4" style={{ color: def.color }} />
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                          style={{ background: def.color + "15", color: def.color, borderColor: def.color + "30" }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-0.5">{def.label}</p>
                      <p className="text-[11px] text-foreground/55 leading-relaxed">{def.desc}</p>
                    </div>
                    <div className="pt-1 border-t border-white/[0.06]">
                      <p className="text-[10px] text-muted-foreground/40 font-medium leading-relaxed">{def.lockDesc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ITER_ACTION_DEFS.map((def) => {
                const isSelected = selectedIterationType === def.type;
                return (
                  <motion.button
                    key={def.type}
                    onClick={() => {
                      const next = isSelected ? null : def.type;
                      setSelectedIterationType(next);
                      setBatchResult(null);
                      setBatchPushed(false);
                      setPreviewTestId(null);
                      setPreviewVariants([]);
                      setSelectedVariants([]);
                      setGeneratedHooks({});
                      setGeneratedCTAs({});
                      setActiveType(null);
                      setCustomInputs({});
                      setFormatNotes({});
                      setVisualNotes({});
                    }}
                    className="flex flex-col gap-3 p-4 rounded-xl border text-left transition-colors relative"
                    style={{
                      borderColor: isSelected ? def.color + "55" : "rgba(255,255,255,0.08)",
                      background:  isSelected ? def.color + "0c" : "rgba(255,255,255,0.015)",
                      boxShadow:   isSelected ? `0 0 0 1px ${def.color}28` : undefined,
                    }}
                    whileHover={{ borderColor: isSelected ? def.color + "55" : "rgba(255,255,255,0.15)" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: def.color + "18", border: `1px solid ${def.color}28` }}
                      >
                        <def.Icon className="w-4 h-4" style={{ color: def.color }} />
                      </div>
                      {isSelected && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
                          style={{ background: def.color + "15", color: def.color, borderColor: def.color + "30" }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground mb-0.5">{def.label}</p>
                      <p className="text-[11px] text-foreground/55 leading-relaxed">{def.desc}</p>
                    </div>
                    <div className="pt-1 border-t border-white/[0.06]">
                      <p className="text-[10px] text-muted-foreground/40 font-medium leading-relaxed">{def.lockDesc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ══ STEP 3 — ITERATION GENERATOR ══════════════════════════════════ */}
        <motion.div id="step-3" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once:true, amount:0.06 }}
          className={`transition-opacity duration-300 ${!sourceAd ? "opacity-30 pointer-events-none select-none" : ""}`}
        >
          <div className="flex items-end justify-between mb-5 gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-1">Step 3</p>
              <h2 className="text-xl font-bold tracking-tight mb-1">Generate &amp; Create</h2>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const it = activeAdType === "static" ? selectedStaticIterType : selectedIterationType;
                  if (it) return `Showing ${it} options. Select variants to include in your test.`;
                  return activeAdType === "static"
                    ? "Select a static iteration type above to see relevant options."
                    : "Select an iteration type above to see relevant options from your Hook, Format, and CTA libraries.";
                })()}
              </p>
            </div>
            <Button onClick={generatePreview} disabled={status === "generating"}
              className="gap-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-primary shrink-0"
              variant="ghost" size="sm"
            >
              {status === "generating"
                ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:"linear" }}><RefreshCw className="w-3.5 h-3.5" /></motion.div>Generating…</>
                : status === "done"
                  ? <><RefreshCw className="w-3.5 h-3.5" />Regenerate Batch</>
                  : <><Sparkles className="w-3.5 h-3.5" />Generate Next Test Batch</>
              }
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div key="idle" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <Card className="border-white/10 bg-card/50 border-dashed">
                  <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary/60" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/60 mb-1">Ready to generate</p>
                        <p className="text-xs text-muted-foreground/45 max-w-xs">
                          Fill in your winning ad above, then click Generate Next Test Batch.
                        </p>
                      </div>
                      <Button onClick={generatePreview} size="sm"
                        className="gap-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary hover:text-primary mt-1"
                        variant="ghost"
                      >
                        <Sparkles className="w-3.5 h-3.5" />Generate Next Test Batch
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {status === "generating" && (
              <motion.div key="gen" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                <Card className="border-primary/15 bg-primary/[0.02]">
                  <div className="h-0.5 bg-gradient-to-r from-primary/60 via-violet-500/30 to-transparent" />
                  <CardContent className="pt-0">
                    <GeneratingState />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {status === "done" && (
              <motion.div key="done" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                transition={{ duration:0.3 }} className="flex flex-col gap-6"
              >
                {/* ── Manual builder label + selected variants ── */}
                {!batchPushed && (
                  <motion.div
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1, duration:0.3 }}
                    className="flex flex-col gap-3 p-4 rounded-xl border border-violet-500/15 bg-violet-500/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs opacity-50">New Test (Preview)</p>
                        <p className="font-bold font-mono text-foreground">{previewTestId || "—"}</p>
                        <p className="text-xs opacity-40">{selectedVariants.length} variant{selectedVariants.length !== 1 ? "s" : ""}</p>
                      </div>
                      {selectedVariants.length > 0 && (
                        <button
                          onClick={clearIterationState}
                          className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0 mt-0.5"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    {selectedVariants.length === 0 ? (
                      <p className="text-xs text-muted-foreground/45">
                        Click any option below to add it to your test.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {selectedVariants.map((sv) => (
                          <div key={`${sv.type}-${sv.value}`}
                            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07]"
                          >
                            <span className="font-black uppercase text-[9px] tracking-widest px-1.5 py-0.5 rounded"
                              style={{
                                background: ((ITER_ACTION_DEFS.find(d => d.type === (sv.type as any))?.color ?? STATIC_ITER_ACTION_DEFS.find(d => d.type === (sv.type as any))?.color) ?? "#ffffff") + "18",
                                color:       (ITER_ACTION_DEFS.find(d => d.type === (sv.type as any))?.color ?? STATIC_ITER_ACTION_DEFS.find(d => d.type === (sv.type as any))?.color) ?? "#ffffff",
                              }}
                            >{sv.type}</span>
                            <span className="text-foreground/75 font-semibold truncate">
                              {sv.customText ?? sv.label}
                            </span>
                            <button
                              onClick={() => toggleVariant(sv)}
                              className="ml-auto shrink-0 text-muted-foreground/35 hover:text-muted-foreground/70 transition-colors"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Create Test Batch button (pre-push) ── */}
                {!batchPushed && (
                  <motion.div
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15, duration:0.3 }}
                    className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-white/10 bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <GitBranch className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white">
                          {selectedVariants.length === 0
                            ? "No variants selected yet"
                            : `${selectedVariants.length} variant${selectedVariants.length !== 1 ? "s" : ""} selected`}
                        </p>
                        <p className="text-xs text-muted-foreground/50 truncate">
                          {(() => {
                            const it = activeAdType === "static" ? selectedStaticIterType : selectedIterationType;
                            return it ? `${it} iteration${sourceAd?.variantId ? ` from ${sourceAd.variantId}` : ""}` : "Select variants below to build your test";
                          })()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => createTestBatch(selectedVariants, activeAdType === "static" ? selectedStaticIterType : selectedIterationType)}
                      disabled={selectedVariants.length === 0}
                      className="shrink-0 bg-violet-600 hover:bg-violet-500 text-white font-bold gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Create Test Batch
                    </Button>
                  </motion.div>
                )}

                {/* ── Confirmation banner (post-push) ── */}
                {batchResult && batchPushed && (
                  <motion.div
                    initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05, duration:0.3 }}
                    className="flex flex-col gap-3 px-4 py-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-300">
                          Iteration batch created — {batchResult.count} variant{batchResult.count !== 1 ? "s" : ""} added to Creative Lab.
                        </p>
                        {batchResult.batchLabel && (
                          <p className="text-[11px] text-emerald-400/60 mt-0.5">
                            Batch <span className="font-mono font-bold">{batchResult.batchLabel}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // Sync ad type so Creative Lab opens on the correct tab
                          localStorage.setItem("clb:ui:activeAdType", activeAdType);
                          // Focus the first variant: Creative Lab will collapse all tests,
                          // expand only this one, and scroll directly to the ad row
                          if (batchResult?.variantIds?.[0]) {
                            localStorage.setItem("clb:ui:focusVariantId", batchResult.variantIds[0]);
                          }
                          navigate("/creative-lab");
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 transition-colors shrink-0 whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />View in Lab
                      </button>
                    </div>
                    {/* Variant ID pills */}
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {batchResult.variantIds.map(id => (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-black font-mono px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
                          <GitBranch className="w-2.5 h-2.5" />{id}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── STATIC: HEADLINE / VISUAL / ANGLE ── */}
                {activeAdType === "static" && selectedStaticIterType === "HEADLINE" && (
                  <SectionCard
                    title="Headline Alternatives"
                    subtitle={`Test new headlines against your current — visual, angle, and CTA stay locked`}
                    color="#8b5cf6" icon={Type}
                  >
                    {([
                      { name: "Pain-led",    hookKey: "pain",      desc: "Lead with the problem — stop the scroll with frustration or fear." },
                      { name: "Curiosity",   hookKey: "curiosity", desc: "Create an information gap — make them need to know the answer."     },
                      { name: "Result-led",  hookKey: "result",    desc: "Lead with the outcome — show the transformation upfront."           },
                      { name: "Question",    hookKey: "question",  desc: "Engage with a direct question — pulls them into your frame."        },
                      { name: "Bold claim",  hookKey: "bold",      desc: "Make a strong assertion — confident, polarising, memorable."        },
                    ] as const).map(({ name, hookKey, desc }, i) => {
                      const isActive     = selectedHookType === hookKey;
                      const genList      = headlineSuggestions[hookKey] ?? [];
                      const custText     = headlineInputs[hookKey] ?? "";
                      const committed    = selectedVariants.filter(v => v.type === "HEADLINE" && v.value.startsWith(`custom:${hookKey}:`));
                      const hasCommitted = committed.length > 0;
                      return (
                        <div key={hookKey} className="flex flex-col">
                          <IdeaCard
                            num={i + 1}
                            name={name}
                            desc={desc}
                            color="#8b5cf6"
                            rationale={`Lock: ${form.primaryAngle} angle · visual · CTA. Only the headline framing changes.`}
                            isSelected={hasCommitted || isActive}
                            onToggle={() => setSelectedHookType(isActive ? null : hookKey)}
                          />

                          <AnimatePresence initial={false}>
                            {isActive && (
                              <motion.div
                                key="hl-workspace"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-7 flex flex-col gap-3 pt-2 pb-3 pl-4 border-l border-white/[0.07]">

                                  {/* Committed headline chips */}
                                  {hasCommitted && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {committed.map(cv => (
                                        <div key={cv.value} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/25 text-[11px] text-violet-300">
                                          <span className="max-w-[220px] truncate">{cv.customText ?? cv.label}</span>
                                          <button
                                            onClick={() => setSelectedVariants(prev => prev.filter(v => v.value !== cv.value))}
                                            className="text-violet-400/50 hover:text-violet-300 transition-colors"
                                          ><X className="w-2.5 h-2.5" /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Write-your-own textarea */}
                                  <textarea
                                    placeholder={`Write your own ${name.toLowerCase()} headline…`}
                                    value={custText}
                                    onChange={e => setHeadlineInputs(prev => ({ ...prev, [hookKey]: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-foreground/85 placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                                  />

                                  {/* Generate row */}
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => setHeadlineSuggestions(prev => ({ ...prev, [hookKey]: generateHeadlineSuggestions(hookKey) }))}
                                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-violet-400 transition-colors"
                                    >
                                      <Sparkles className="w-3 h-3" />Generate suggestions
                                    </button>
                                    {genList.length > 0 && (
                                      <button
                                        onClick={() => setHeadlineSuggestions(prev => ({ ...prev, [hookKey]: generateHeadlineSuggestions(hookKey) }))}
                                        className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors flex items-center gap-1"
                                      ><RefreshCw className="w-2.5 h-2.5" />Regenerate</button>
                                    )}
                                  </div>

                                  {/* Suggestion chips */}
                                  {genList.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-0.5">Suggestions — click to fill</span>
                                      {genList.map((s, gi) => (
                                        <motion.button
                                          key={gi}
                                          initial={{ opacity: 0, x: -4 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: gi * 0.035, duration: 0.18 }}
                                          onClick={() => setHeadlineInputs(prev => ({ ...prev, [hookKey]: s }))}
                                          className="text-left text-xs text-foreground/60 hover:text-foreground/90 px-3 py-2 rounded-md border border-white/[0.05] hover:border-violet-500/30 hover:bg-violet-500/[0.05] transition-all leading-relaxed"
                                        >{s}</motion.button>
                                      ))}
                                    </div>
                                  )}

                                  {/* Commit button */}
                                  {custText.trim() && (
                                    <button
                                      onClick={() => commitVariant("HEADLINE", hookKey, custText.trim())}
                                      className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-xs font-semibold text-violet-300 transition-all"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />Use this Headline
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </SectionCard>
                )}

                {activeAdType === "static" && selectedStaticIterType === "VISUAL" && (
                  <SectionCard
                    title="Visual Executions"
                    subtitle="Same headline and angle — only the visual execution changes. Select one or more to test in parallel."
                    color="#3b82f6" icon={Image}
                  >
                    {STATIC_VISUAL_OPTIONS.map((opt, i) => {
                      const sv: SelectedVariant = { type: "VISUAL", value: opt.name, label: `${opt.name} Version` };
                      const isSel = selectedVariants.some(v => v.type === "VISUAL" && v.value === opt.name);
                      const img   = staticImageInputs[opt.name] ?? "";
                      return (
                        <div key={opt.name} className="flex flex-col">
                          <IdeaCard
                            num={i + 1}
                            name={opt.name}
                            desc={opt.desc}
                            color="#3b82f6"
                            rationale={`Locks: ${form.primaryAngle} angle · ${form.ctaStyle} CTA · headline copy. Only the visual execution changes.`}
                            isSelected={isSel}
                            onToggle={() => toggleVariant(sv)}
                          />

                          {/* Expanded workspace — shown only when selected */}
                          <AnimatePresence initial={false}>
                            {isSel && (
                              <motion.div
                                key="ws"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.16 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-7 pl-4 pt-2 pb-2.5 border-l border-white/[0.07] flex flex-col gap-2">
                                  {/* Production note */}
                                  <textarea
                                    placeholder="Add a production note (optional) — e.g. white background, bold colour palette, product centred…"
                                    value={visualNotes[opt.name] ?? ""}
                                    onChange={e => setVisualNotes(prev => ({ ...prev, [opt.name]: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-foreground/75 placeholder:text-muted-foreground/25 resize-none focus:outline-none focus:border-blue-500/35 transition-colors"
                                  />

                                  {/* Image upload row */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={`svis-file-${i}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setStaticImageInputs(prev => ({ ...prev, [opt.name]: ev.target?.result as string }));
                                        reader.readAsDataURL(file);
                                        e.target.value = "";
                                      }}
                                    />
                                    <label
                                      htmlFor={`svis-file-${i}`}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer text-[11px] font-semibold transition-all"
                                      style={img
                                        ? { background: "#3b82f615", borderColor: "#3b82f630", color: "#3b82f6" }
                                        : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
                                      }
                                    >
                                      <Upload className="w-3 h-3" />
                                      {img ? "Change image" : "Upload reference image"}
                                    </label>
                                    {img && (
                                      <>
                                        <img src={img} alt={opt.name} className="w-12 h-8 object-cover rounded border border-white/10" />
                                        <button
                                          onClick={() => setStaticImageInputs(prev => { const next = { ...prev }; delete next[opt.name]; return next; })}
                                          className="text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors"
                                          title="Remove image"
                                        ><X className="w-3 h-3" /></button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </SectionCard>
                )}


                {/* ── HOOK: Hook type alternatives + Script Matrix hooks ── */}
                {activeAdType !== "static" && selectedIterationType === "HOOK" && (
                  <>
                    <SectionCard
                      title="Hook Type Alternatives"
                      subtitle={`Test these hook types against your current ${form.hookType} — keep angle, format, and CTA identical`}
                      color={HOOK_COLOR} icon={Zap}
                    >
                      {hookExpansion.map((hook, i) => {
                        const cat          = HOOK_CATEGORIES.find(c => c.type === hook);
                        const isActive     = activeType === hook;
                        const genList      = generatedHooks[hook] ?? [];
                        const isLoading    = loadingHooks.has(hook);
                        const custText     = customInputs[hook] ?? "";
                        const committed    = selectedVariants.filter(v => v.type === "HOOK" && v.value.startsWith(`custom:${hook}:`));
                        const hasCommitted = committed.length > 0;
                        return (
                          <div key={hook} className="flex flex-col">
                            <IdeaCard num={i+1}
                              name={hook}
                              desc={cat?.description.split(" — ")[0] ?? HOOK_DESC[hook] ?? "Alternative hook type to test."}
                              color={HOOK_COLOR}
                              rationale={`Lock: ${form.primaryAngle} angle · ${form.creativeFormat} format · ${form.ctaStyle} CTA. Only the hook psychology changes.`}
                              isSelected={hasCommitted || isActive}
                              onToggle={() => setActiveType(isActive ? null : hook)}
                            />

                            <AnimatePresence initial={false}>
                              {isActive && (
                                <motion.div
                                  key="workspace"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-7 flex flex-col gap-3 pt-2 pb-3 pl-4 border-l border-white/[0.07]">

                                    {/* Committed variants for this type */}
                                    {hasCommitted && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {committed.map(cv => (
                                          <div key={cv.value} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/25 text-[11px] text-violet-300">
                                            <span className="max-w-[220px] truncate">{cv.customText ?? cv.label}</span>
                                            <button
                                              onClick={() => setSelectedVariants(prev => prev.filter(v => v.value !== cv.value))}
                                              className="text-violet-400/50 hover:text-violet-300 transition-colors"
                                            ><X className="w-2.5 h-2.5" /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Write your own textarea */}
                                    <textarea
                                      placeholder={`Write your own ${hook}…`}
                                      value={custText}
                                      onChange={e => setCustomInputs(prev => ({ ...prev, [hook]: e.target.value }))}
                                      rows={2}
                                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-foreground/85 placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                                    />

                                    {/* Generate row */}
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => generateHooks(hook)}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-violet-400 disabled:opacity-40 transition-colors"
                                      >
                                        {isLoading
                                          ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block"><RefreshCw className="w-3 h-3" /></motion.span>Generating…</>
                                          : <><Sparkles className="w-3 h-3" />Generate suggestions</>
                                        }
                                      </button>
                                      {genList.length > 0 && (
                                        <button
                                          onClick={() => generateHooks(hook)}
                                          className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors flex items-center gap-1"
                                        ><RefreshCw className="w-2.5 h-2.5" />Regenerate</button>
                                      )}
                                    </div>

                                    {/* Generated suggestions */}
                                    {genList.length > 0 && (
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-0.5">Suggestions — click to fill</span>
                                        {genList.map((text, gi) => (
                                          <motion.button
                                            key={gi}
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: gi * 0.035, duration: 0.18 }}
                                            onClick={() => setCustomInputs(prev => ({ ...prev, [hook]: text }))}
                                            className="text-left text-xs text-foreground/60 hover:text-foreground/90 px-3 py-2 rounded-md border border-white/[0.05] hover:border-violet-500/30 hover:bg-violet-500/[0.05] transition-all leading-relaxed"
                                          >{text}</motion.button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Commit button */}
                                    {custText.trim() && (
                                      <button
                                        onClick={() => commitVariant("HOOK", hook, custText.trim())}
                                        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-xs font-semibold text-violet-300 transition-all"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />Use this Hook
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </SectionCard>

                    {scriptHooks.length > 0 && (
                      <SectionCard
                        title="Your Hook Library"
                        subtitle="Hooks saved in Script Matrix — ready to test directly"
                        color={HOOK_COLOR} icon={FlaskConical}
                      >
                        {scriptHooks.map((entry, i) => {
                          const sv: SelectedVariant = { type: "HOOK", value: `lib:${i}`, label: entry.text, customText: entry.text };
                          const isSel = selectedVariants.some(v => v.type === "HOOK" && v.value === `lib:${i}`);
                          const edKey = `HOOK:lib:${i}`;
                          const isEd  = editingKey === edKey;
                          const selV  = selectedVariants.find(v => v.type === "HOOK" && v.value === `lib:${i}`);
                          return (
                            <IdeaCard key={`lib-hook-${i}`} num={i+1}
                              name={entry.text.length > 60 ? entry.text.slice(0, 60) + "…" : entry.text}
                              desc={`${entry.type} · from Script Matrix`}
                              color={HOOK_COLOR}
                              isSelected={isSel} onToggle={() => toggleVariant(sv)}
                              isEditing={isEd} editValue={editDraft}
                              onEditStart={() => startEdit(sv)}
                              onEditChange={setEditDraft}
                              onEditSave={() => confirmEdit(sv)}
                              customText={selV?.customText}
                            />
                          );
                        })}
                      </SectionCard>
                    )}
                  </>
                )}

                {/* ── FORMAT: Simple toggle selection ── */}
                {activeAdType !== "static" && selectedIterationType === "FORMAT" && (
                  <SectionCard
                    title="Format Alternatives"
                    subtitle={`New formats carrying the ${form.primaryAngle} angle — isolate format as the only variable`}
                    color={FORMAT_COLOR} icon={Layers}
                  >
                    {formatExpansion.map((fmt, i) => {
                      const sv: SelectedVariant = { type: "FORMAT", value: fmt, label: `${fmt} Version` };
                      const isSel = selectedVariants.some(v => v.type === "FORMAT" && v.value === fmt);
                      return (
                        <div key={fmt} className="flex flex-col">
                          <IdeaCard num={i+1}
                            name={fmt}
                            desc={FORMAT_DESC[fmt] ?? "Alternative format using the same winning angle."}
                            color={FORMAT_COLOR}
                            rationale={`Lock: ${form.hookType} hook · ${form.primaryAngle} angle. Format is the only variable that changes.`}
                            isSelected={isSel}
                            onToggle={() => toggleVariant(sv)}
                          />

                          {/* Optional production note — only shown when selected */}
                          <AnimatePresence initial={false}>
                            {isSel && (
                              <motion.div
                                key="note"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.16 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-7 pl-4 pt-2 pb-2.5 border-l border-white/[0.07]">
                                  <textarea
                                    placeholder="Add a production note (optional) — e.g. fast cuts, subtitles, bold captions…"
                                    value={formatNotes[fmt] ?? ""}
                                    onChange={e => setFormatNotes(prev => ({ ...prev, [fmt]: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-foreground/75 placeholder:text-muted-foreground/25 resize-none focus:outline-none focus:border-teal-500/35 transition-colors"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </SectionCard>
                )}

                {/* ── CTA: CTA_TYPES + Script Matrix CTAs ── */}
                {activeAdType !== "static" && selectedIterationType === "CTA" && (
                  <>
                    <SectionCard
                      title="CTA Alternatives"
                      subtitle={`Test these CTAs against your current "${form.ctaStyle}" — lock everything else`}
                      color="#f59e0b" icon={Target}
                    >
                      {CTA_TYPES.filter(c => c !== form.ctaStyle).map((cta, i) => {
                        const isActive     = activeType === cta;
                        const genList      = generatedCTAs[cta] ?? [];
                        const isLoading    = loadingCTAs.has(cta);
                        const custText     = customInputs[cta] ?? "";
                        const committed    = selectedVariants.filter(v => v.type === "CTA" && v.value.startsWith(`custom:${cta}:`));
                        const hasCommitted = committed.length > 0;
                        return (
                          <div key={cta} className="flex flex-col">
                            <IdeaCard num={i+1}
                              name={cta}
                              desc={`CTA variant. Lock: ${form.hookType} hook · ${form.primaryAngle} angle · ${form.creativeFormat} format.`}
                              color="#f59e0b"
                              isSelected={hasCommitted || isActive}
                              onToggle={() => setActiveType(isActive ? null : cta)}
                            />

                            <AnimatePresence initial={false}>
                              {isActive && (
                                <motion.div
                                  key="workspace"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-7 flex flex-col gap-3 pt-2 pb-3 pl-4 border-l border-white/[0.07]">

                                    {/* Committed variants for this type */}
                                    {hasCommitted && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {committed.map(cv => (
                                          <div key={cv.value} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300">
                                            <span className="max-w-[220px] truncate">{cv.customText ?? cv.label}</span>
                                            <button
                                              onClick={() => setSelectedVariants(prev => prev.filter(v => v.value !== cv.value))}
                                              className="text-amber-400/50 hover:text-amber-300 transition-colors"
                                            ><X className="w-2.5 h-2.5" /></button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Write your own textarea */}
                                    <textarea
                                      placeholder={`Write your own ${cta} copy…`}
                                      value={custText}
                                      onChange={e => setCustomInputs(prev => ({ ...prev, [cta]: e.target.value }))}
                                      rows={2}
                                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-foreground/85 placeholder:text-muted-foreground/30 resize-none focus:outline-none focus:border-amber-500/40 transition-colors"
                                    />

                                    {/* Generate row */}
                                    <div className="flex items-center gap-3">
                                      <button
                                        onClick={() => generateCTAs(cta)}
                                        disabled={isLoading}
                                        className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-amber-400 disabled:opacity-40 transition-colors"
                                      >
                                        {isLoading
                                          ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="inline-block"><RefreshCw className="w-3 h-3" /></motion.span>Generating…</>
                                          : <><Sparkles className="w-3 h-3" />Generate suggestions</>
                                        }
                                      </button>
                                      {genList.length > 0 && (
                                        <button
                                          onClick={() => generateCTAs(cta)}
                                          className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors flex items-center gap-1"
                                        ><RefreshCw className="w-2.5 h-2.5" />Regenerate</button>
                                      )}
                                    </div>

                                    {/* Generated suggestions */}
                                    {genList.length > 0 && (
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35 mb-0.5">Suggestions — click to fill</span>
                                        {genList.map((text, gi) => (
                                          <motion.button
                                            key={gi}
                                            initial={{ opacity: 0, x: -4 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: gi * 0.035, duration: 0.18 }}
                                            onClick={() => setCustomInputs(prev => ({ ...prev, [cta]: text }))}
                                            className="text-left text-xs text-foreground/60 hover:text-foreground/90 px-3 py-2 rounded-md border border-white/[0.05] hover:border-amber-500/30 hover:bg-amber-500/[0.05] transition-all leading-relaxed"
                                          >{text}</motion.button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Commit button */}
                                    {custText.trim() && (
                                      <button
                                        onClick={() => commitVariant("CTA", cta, custText.trim())}
                                        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold text-amber-300 transition-all"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />Use this CTA
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </SectionCard>

                    {scriptCTAs.length > 0 && (
                      <SectionCard
                        title="Your CTA Library"
                        subtitle="CTAs saved in Script Matrix — drop them directly into your test"
                        color="#f59e0b" icon={FlaskConical}
                      >
                        {scriptCTAs.map((entry, i) => {
                          const sv: SelectedVariant = { type: "CTA", value: `lib:${i}`, label: entry.text, customText: entry.text };
                          const isSel = selectedVariants.some(v => v.type === "CTA" && v.value === `lib:${i}`);
                          const edKey = `CTA:lib:${i}`;
                          const isEd  = editingKey === edKey;
                          const selV  = selectedVariants.find(v => v.type === "CTA" && v.value === `lib:${i}`);
                          return (
                            <IdeaCard key={`lib-cta-${i}`} num={i+1}
                              name={entry.text.length > 60 ? entry.text.slice(0, 60) + "…" : entry.text}
                              desc={`${entry.type} · from Script Matrix`}
                              color="#f59e0b"
                              isSelected={isSel} onToggle={() => toggleVariant(sv)}
                              isEditing={isEd} editValue={editDraft}
                              onEditStart={() => startEdit(sv)}
                              onEditChange={setEditDraft}
                              onEditSave={() => confirmEdit(sv)}
                              customText={selV?.customText}
                            />
                          );
                        })}
                      </SectionCard>
                    )}
                  </>
                )}

                {/* ── VISUAL: selectable options ── */}
                {activeAdType !== "static" && selectedIterationType === "VISUAL" && (
                  <SectionCard
                    title="Visual Executions"
                    subtitle="Same script and structure — only the visual execution changes. Select one or more to test in parallel."
                    color="#3b82f6" icon={PlaySquare}
                  >
                    {VISUAL_OPTIONS.map((opt, i) => {
                      const sv: SelectedVariant = { type: "VISUAL", value: opt.name, label: `${opt.name} Version` };
                      const isSel = selectedVariants.some(v => v.type === "VISUAL" && v.value === opt.name);
                      return (
                        <div key={opt.name} className="flex flex-col">
                          <IdeaCard
                            num={i + 1}
                            name={opt.name}
                            desc={opt.desc}
                            color="#3b82f6"
                            rationale={`Lock: ${form.hookType} hook · ${form.primaryAngle} angle · ${form.creativeFormat} format · ${form.ctaStyle} CTA. Only the visual execution changes.`}
                            isSelected={isSel}
                            onToggle={() => toggleVariant(sv)}
                          />

                          {/* Production note — only shown when selected */}
                          <AnimatePresence initial={false}>
                            {isSel && (
                              <motion.div
                                key="note"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.16 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-7 pl-4 pt-2 pb-2.5 border-l border-white/[0.07]">
                                  <textarea
                                    placeholder="Add a production note (optional) — e.g. outdoor setting, fast cuts, subtitles…"
                                    value={visualNotes[opt.name] ?? ""}
                                    onChange={e => setVisualNotes(prev => ({ ...prev, [opt.name]: e.target.value }))}
                                    rows={2}
                                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-foreground/75 placeholder:text-muted-foreground/25 resize-none focus:outline-none focus:border-blue-500/35 transition-colors"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </SectionCard>
                )}


                {/* ── No type selected yet ── */}
                {(activeAdType === "static" ? !selectedStaticIterType : !selectedIterationType) && (
                  <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] text-muted-foreground/50 text-sm">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    {activeAdType === "static"
                      ? "Select a test type above — Headline, Visual, or Angle — to see options"
                      : "Select an iteration type above to see relevant options from your libraries."}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ══ TEST PLAN ══════════════════════════════════════════════════════ */}
        {(() => {
          const PHASE_BANNER: Record<TestPhase, { title: string; subtitle: string }> = {
            script: { title: "Start with Script Testing",  subtitle: "Define your message before testing execution" },
            hook:   { title: "Start with Hook Testing",    subtitle: "Find what stops the scroll before refining format" },
            format: { title: "Move to Format Testing",     subtitle: "Wrap the winning hook in a new visual format" },
            visual: { title: "Refine Visual Execution",    subtitle: "Polish the proven concept — actor, setting, editing style" },
            cta:    { title: "Optimize Conversion",        subtitle: "Improve the call-to-action to close more customers" },
          };
          const PHASE_CTA_LABEL: Record<TestPhase, string> = {
            script: "Create Script Test",
            hook:   "Start Hook Iteration",
            format: "Start Format Iteration",
            visual: "Start Visual Iteration",
            cta:    "Start CTA Iteration",
          };
          const banner   = PHASE_BANNER[currentPhase];
          const ctaLabel = PHASE_CTA_LABEL[currentPhase];
          const scriptCta = () => {
            setSelectedIterationType(PHASE_TO_ITER[currentPhase]);
            setTimeout(() => formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          };
          const creativeCta = () => {
            setSelectedIterationType(null);
            setTimeout(() => formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
          };
          const SCRIPT_STEPS = [
            { label: "Hook testing",      desc: "Find what stops the scroll — test hook types and opening lines.", color: HOOK_COLOR,   Icon: Zap        },
            { label: "Format testing",    desc: "Wrap the winning message in a new visual format.",                color: FORMAT_COLOR, Icon: FileText   },
            { label: "Visual refinement", desc: "Polish the proven concept — actor, setting, editing style.",      color: VISUAL_COLOR, Icon: PlaySquare },
          ];
          const CREATIVE_STEPS = [
            { label: "Broad combination test", desc: "Test multiple variations (V1–V5 × Copy C1–C5) simultaneously.", color: FORMAT_COLOR, Icon: Layers      },
            { label: "Identify the winner",    desc: "Let data surface the highest-performing creative unit.",         color: HOOK_COLOR,   Icon: Trophy      },
            { label: "Isolate variables",      desc: "Break the winner apart — test hook, visual, CTA separately.",   color: VISUAL_COLOR, Icon: FlaskConical },
          ];
          const MATRIX_STEPS = [
            { label: "Broad matrix test",   desc: "Run all Headline × Visual combinations simultaneously.", color: HOOK_COLOR,   Icon: Layers     },
            { label: "Identify the winner", desc: "Find which Headline + Visual combo drives best CTR.",    color: FORMAT_COLOR, Icon: Trophy     },
            { label: "Scale the winner",    desc: "Kill underperformers, scale the winning combination.",   color: VISUAL_COLOR, Icon: Rocket     },
          ];
          const REFINE_STEPS = [
            { label: "Lock winning visual",    desc: "Keep the best-performing visual constant.",        color: FORMAT_COLOR, Icon: Eye        },
            { label: "Test headline variants", desc: "Try 3–5 new headline angles on the same visual.", color: HOOK_COLOR,   Icon: Zap        },
            { label: "Scale best",             desc: "Promote the headline with highest CTR.",           color: VISUAL_COLOR, Icon: TrendingUp },
          ];
          type AnyStep = { label: string; desc: string; color: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> };
          const stepList = (steps: AnyStep[]) => (
            <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.05]">
              {steps.map(({ label, desc, color, Icon }, i) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 mt-0.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: color + "18" }}>
                      <Icon className="w-2.5 h-2.5" style={{ color }} />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px h-3 mt-0.5" style={{ background: color + "28" }} />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-semibold text-foreground/80">{label}</p>
                    <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          );
          return (
            <div className="mt-4">
              {activeAdType === "static" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Card className="overflow-hidden flex flex-col" style={{ borderColor: "#8b5cf640", background: "#8b5cf608" }}>
                        <div className="h-0.5" style={{ background: "linear-gradient(90deg,#8b5cf6aa,transparent)" }} />
                        <CardContent className="pt-5 pb-5 flex flex-col gap-4 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45 mb-1">Static Testing</p>
                              <p className="text-base font-bold text-foreground">Matrix Testing</p>
                              <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">Find the winning Headline × Visual combination</p>
                            </div>
                            <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-400">Recommended</span>
                          </div>
                          {stepList(MATRIX_STEPS)}
                          <button onClick={() => navigate("/creative-lab")} className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors pt-3 border-t border-white/[0.05] group">
                            Create New Static Test → <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </CardContent>
                      </Card>
                      <Card className="overflow-hidden flex flex-col" style={{ borderColor: "#ffffff0d", background: "hsl(var(--card)/0.5)" }}>
                        <div className="h-0.5" style={{ background: "linear-gradient(90deg,#10b98140,transparent)" }} />
                        <CardContent className="pt-5 pb-5 flex flex-col gap-4 flex-1">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45 mb-1">Static Testing</p>
                            <p className="text-base font-bold text-foreground">Headline Refinement</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">Refine copy on a winning visual</p>
                          </div>
                          {stepList(REFINE_STEPS)}
                          <button onClick={() => navigate("/creative-lab")} className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-400/70 hover:text-emerald-400 transition-colors pt-3 border-t border-white/[0.05] group">
                            Start Headline Test → <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-start gap-3 px-4 py-3.5 rounded-xl border border-violet-500/25 bg-violet-500/[0.07]">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-violet-500/20">
                          <Zap className="w-3.5 h-3.5 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground/90">{banner.title}</p>
                          <p className="text-xs mt-0.5 leading-relaxed text-violet-400/70">{banner.subtitle}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Card className="overflow-hidden flex flex-col" style={{ borderColor: "#8b5cf640", background: "#8b5cf608" }}>
                          <div className="h-0.5" style={{ background: "linear-gradient(90deg,#8b5cf6aa,transparent)" }} />
                          <CardContent className="pt-5 pb-5 flex flex-col gap-4 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45 mb-1">Video Testing</p>
                                <p className="text-base font-bold text-foreground">Script-first</p>
                                <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">Find the winning message before improving execution</p>
                              </div>
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-400">Recommended</span>
                            </div>
                            {stepList(SCRIPT_STEPS)}
                            <button onClick={scriptCta} className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors pt-3 border-t border-white/[0.05] group">
                              {ctaLabel} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </CardContent>
                        </Card>
                        <Card className="overflow-hidden flex flex-col" style={{ borderColor: "#ffffff0d", background: "hsl(var(--card)/0.5)" }}>
                          <div className="h-0.5" style={{ background: "linear-gradient(90deg,#10b98140,transparent)" }} />
                          <CardContent className="pt-5 pb-5 flex flex-col gap-4 flex-1">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/45 mb-1">Static Testing</p>
                              <p className="text-base font-bold text-foreground">Creative-first</p>
                              <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">Static ads combine visual and message in one unit</p>
                            </div>
                            {stepList(CREATIVE_STEPS)}
                            <button onClick={creativeCta} className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-emerald-400/70 hover:text-emerald-400 transition-colors pt-3 border-t border-white/[0.05] group">
                              Start Creative Testing <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
            </div>
          );
        })()}

        <NextStepBanner
          step="Creative Lab"
          title="Run More Experiments"
          cta="Go to Creative Lab"
          description="Log your new iteration variants as experiments and measure which refinements lift performance."
          href="/creative-lab"
          icon={FlaskConical}
          color="#10b981"
        />
      </div>
    </PageTransition>
  );
}
