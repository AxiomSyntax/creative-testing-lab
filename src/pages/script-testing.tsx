import { useState, useMemo, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { HOOK_TYPES, HOOK_CATEGORIES } from "@/data/hooks";
import { AppDropdown } from "@/components/app-dropdown";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { ReactFlow, Background, Controls, Edge, Node } from '@xyflow/react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FlaskConical, Zap, FileText, Target,
  Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp,
  Layers, ArrowRight, Info, MousePointerClick, Sparkles,
} from "lucide-react";
import { ProcessNode } from "@/components/flow-components";
import { generateTestId, generateVariantId, nextTestNumber } from "@/lib/id-system";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const FORMATS = ["UGC", "Talking Head", "Motion Graphic", "Split Screen", "Text-Only", "Product Demo", "Testimonial"];

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface ScriptEntry { type: string; text: string; }

interface LabExperiment {
  id:              string;
  variantId:       string;
  testId?:         string;
  originScriptId?: string;
  adVariant:       string;
  hookType:        string;
  primaryAngle:    string;
  creativeFormat:  string;
  cta:             string;
  hookText?:       string;
  bodyText?:       string;
  ctaText?:        string;
  platform?:       string;
  editor?:         string;
  startDate?:      string;
  timeline?:       unknown[];
  thumbStopRate:   number;
  holdRate:        number;
  ctr:             number;
  cpa:             number;
  status:          "Draft" | "Producing" | "Ready to Test" | "Testing" | "Winner" | "Loser" | "Iterate";
}

function variantKey(hook: string, body: string, cta: string) { return `${hook}|${body}|${cta}`; }

const SCRIPT_PLATFORM_OPTS = ["Meta", "TikTok", "YouTube", "LinkedIn"];

function aggregateScriptStatus(statuses: string[]): string {
  if (statuses.some(s => s === "Winner"))  return "Winner";
  if (statuses.some(s => s === "Testing")) return "Testing";
  if (statuses.every(s => s === "Loser"))  return "Loser";
  if (statuses.every(s => s === "Draft"))  return "Draft";
  return "Producing";
}
function nextTestIdForScript(allExps: LabExperiment[], projectCode: string): string {
  return generateTestId(projectCode, nextTestNumber(allExps));
}
function nextVariantIdForScript(snapshot: LabExperiment[], testId: string): string {
  const existing = snapshot.filter(e => e.testId === testId);
  const nums = existing.map(e => {
    const m = e.variantId?.match(/-S(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return generateVariantId(testId, "S", next);
}

// ── STATIC OPTIONS ─────────────────────────────────────────────────────────────
const HOOK_TYPE_OPTS = HOOK_TYPES;
const BODY_TYPE_OPTS = [
  "Mechanism Reveal", "Transformation Story", "Problem → Solution",
  "Social Proof", "Founder Story", "Product Demonstration",
];
const CTA_TYPE_OPTS = [
  "Free Trial", "Demo", "Learn More", "Download",
  "Shop Now", "Get Started", "Book Call", "Watch Video",
];

// ── DEMO DATA ─────────────────────────────────────────────────────────────────
const DEMO_HOOKS: ScriptEntry[] = [
  { type: "Negative Hook",  text: "Most people are wasting money on ads that don't convert — and they don't even know why." },
  { type: "Question Hook",  text: "What if you could cut your CPA in half without increasing your ad spend?" },
  { type: "Promise Hook",   text: "We 3x'd our ROAS in 30 days using one creative testing framework. Here's exactly how." },
];
const DEMO_BODIES: ScriptEntry[] = [
  { type: "Mechanism Reveal", text: "The secret is testing hooks before everything else. Here's the exact framework we use to isolate every creative variable." },
  { type: "Social Proof",     text: "Over 500 brands have used this framework to cut CPAs by an average of 42% in their first 60 days." },
];
const DEMO_CTAS: ScriptEntry[] = [
  { type: "Free Trial",      text: "Start your free trial today. No credit card needed — cancel anytime." },
  { type: "Direct Response", text: "Click below to get your custom creative testing plan delivered instantly." },
];

// ── NODE EDUCATION DATA ───────────────────────────────────────────────────────
const NODE_INFO = {
  hook: {
    title:   "The Hook",
    color:   "#8b5cf6",
    role:    "The first 3 seconds. Determines whether viewers stop scrolling or skip past your ad entirely. Everything else depends on this.",
    metrics: [
      { label: "Thumb-Stop Rate", desc: "% of viewers who stop to watch after seeing the first frame" },
      { label: "Watch-Through Rate", desc: "% who continue past the hook into the body" },
    ],
    types: HOOK_CATEGORIES.map(h => ({ name: h.type, desc: h.description.split(" — ")[0] })),
  },
  body: {
    title:   "The Value Body",
    color:   "#6366f1",
    role:    "Where you deliver value and build desire. Bridges the hook to the CTA. Must sustain the attention earned by the hook.",
    metrics: [
      { label: "Hold Rate",          desc: "% of viewers who watch past the 25% mark" },
      { label: "Video View Rate",    desc: "% who reach the midpoint (50%) of the ad" },
    ],
    types: [
      { name: "Mechanism Reveal",      desc: "Explain HOW your product works in a credible way" },
      { name: "Transformation Story",  desc: "Show before → after results from real customers" },
      { name: "Problem → Solution",    desc: "Agitate the pain, then resolve it with your product" },
      { name: "Social Proof",          desc: "Let customers validate claims through testimonials" },
      { name: "Founder Story",         desc: "Build trust through your product's origin narrative" },
      { name: "Product Demonstration", desc: "Show the product solving the problem in real time" },
    ],
  },
  cta: {
    title:   "The CTA",
    color:   "#10b981",
    role:    "Converts attention into action. Must feel like the logical, frictionless next step after everything the viewer just watched.",
    metrics: [
      { label: "Click-Through Rate",  desc: "% of viewers who click through to the landing page" },
      { label: "Conversion Rate",     desc: "% who complete the goal action after clicking" },
    ],
    types: [
      { name: "Direct Response", desc: "Clear command with specific, immediate benefit" },
      { name: "Free Trial",      desc: "Lower the barrier with a no-risk trial entry" },
      { name: "Book Demo",       desc: "Consultation-based CTA for higher-ticket offers" },
      { name: "Soft CTA",        desc: "Low-commitment, educational next step" },
      { name: "Watch Video",     desc: "Pre-sell the main offer through longer-form content" },
    ],
  },
} as const;

type NodeKind = keyof typeof NODE_INFO;

// ── REACT FLOW ─────────────────────────────────────────────────────────────────
const nodeTypes = { custom: ProcessNode };

const initialNodes: Node[] = [
  { id: 'h1',   type: 'custom', position: { x: 50,  y: 50  }, data: { label: 'Hook A',          subline: 'Negative Hook',   clickable: true } },
  { id: 'h2',   type: 'custom', position: { x: 250, y: 50  }, data: { label: 'Hook B',          subline: 'Direct Question', highlight: true, clickable: true } },
  { id: 'h3',   type: 'custom', position: { x: 450, y: 50  }, data: { label: 'Hook C',          subline: 'Bold Claim',      clickable: true } },
  { id: 'body', type: 'custom', position: { x: 250, y: 200 }, data: { label: 'Core Value Prop', subline: 'Value Body',      icon: '📝', clickable: true } },
  { id: 'cta1', type: 'custom', position: { x: 150, y: 350 }, data: { label: 'CTA 1',           subline: 'Direct Response', clickable: true } },
  { id: 'cta2', type: 'custom', position: { x: 350, y: 350 }, data: { label: 'CTA 2',           subline: 'Soft CTA',        clickable: true } },
];
const initialEdges: Edge[] = [
  { id: 'e-h1-body',   source: 'h1',   target: 'body', animated: true, style: { opacity: 0.3 } },
  { id: 'e-h2-body',   source: 'h2',   target: 'body', animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 3 } },
  { id: 'e-h3-body',   source: 'h3',   target: 'body', animated: true, style: { opacity: 0.3 } },
  { id: 'e-body-cta1', source: 'body', target: 'cta1' },
  { id: 'e-body-cta2', source: 'body', target: 'cta2' },
];

// ── ANIMATION ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.38 } },
};
const stagger: Variants = { show: { transition: { staggerChildren: 0.06 } } };
const cardItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.28 } },
};

// ── NODE INFO PANEL ───────────────────────────────────────────────────────────
function NodeInfoPanel({ kind, onClose }: { kind: NodeKind; onClose: () => void }) {
  const info = NODE_INFO[kind];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="overflow-hidden border-white/15" style={{ borderColor: `${info.color}30` }}>
        <div className="h-0.5" style={{ background: `linear-gradient(90deg,${info.color}80,transparent)` }} />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${info.color}15` }}>
                  {kind === "hook" && <Zap    className="w-4.5 h-4.5" style={{ color: info.color }} />}
                  {kind === "body" && <FileText className="w-4.5 h-4.5" style={{ color: info.color }} />}
                  {kind === "cta"  && <Target  className="w-4.5 h-4.5" style={{ color: info.color }} />}
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Script Component</p>
                  <p className="text-base font-bold text-foreground">{info.title}</p>
                </div>
              </div>
              <button onClick={onClose}
                className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 mt-0.5"
              ><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>

            {/* Role */}
            <p className="text-sm text-foreground/75 leading-relaxed border-l-2 pl-3" style={{ borderColor: `${info.color}40` }}>
              {info.role}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Metrics */}
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Metrics Affected</p>
                <div className="flex flex-col gap-1.5">
                  {info.metrics.map(m => (
                    <div key={m.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[11px] font-bold mb-0.5" style={{ color: info.color }}>{m.label}</p>
                      <p className="text-[11px] text-muted-foreground/65 leading-snug">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Types */}
              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                  {kind === "hook" ? "Hook" : kind === "body" ? "Body" : "CTA"} Types
                </p>
                <div className="flex flex-col gap-1">
                  {info.types.map(t => (
                    <div key={t.name} className="flex items-start gap-2 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: info.color, opacity: 0.5 }} />
                      <div>
                        <span className="text-[11px] font-semibold text-foreground/85">{t.name}</span>
                        <span className="text-[11px] text-muted-foreground/55"> — {t.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── EDIT SCRIPT MODAL ─────────────────────────────────────────────────────────
interface EditScriptModalProps {
  title:       string;
  typeOpts:    string[];
  defaultType: string;
  defaultText: string;
  color:       string;
  onSave:      (type: string, text: string) => void;
  onCancel:    () => void;
}

function EditScriptModal({ title, typeOpts, defaultType, defaultText, color, onSave, onCancel }: EditScriptModalProps) {
  const [type, setType] = useState(defaultType);
  const [text, setText] = useState(defaultText);
  return (
    <motion.div
      key="edit-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[49] flex items-center justify-center bg-black/65 backdrop-blur-sm md:pl-64 px-4 md:px-8"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col w-full max-w-5xl bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ height: "82vh", maxHeight: "82vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header (fixed) ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
              <Pencil className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-base font-bold text-white">{title}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-4 flex flex-col gap-5 min-h-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Type</p>
            <AppDropdown value={type} onChange={setType} options={typeOpts} />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">Script Text</p>
            <textarea
              autoFocus
              className="w-full flex-1 bg-background/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15 resize-none leading-relaxed"
              style={{ minHeight: "250px" }}
              placeholder="Enter script text…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
          </div>
        </div>

        {/* ── Sticky footer ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/8 bg-[#0d1117] shrink-0">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg bg-white/5 text-sm text-muted-foreground hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(type, text)}
            className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── STRUCTURED LIST ───────────────────────────────────────────────────────────
interface StructuredListProps {
  items:       ScriptEntry[];
  onAdd:       (e: ScriptEntry) => void;
  onOpenEdit:  (i: number, item: ScriptEntry) => void;
  onDelete:    (i: number) => void;
  label:       string;
  addLabel:    string;
  typeOpts:    string[];
  color:       string;
  icon:        React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  isDemo?:     boolean;
}

function StructuredList({ items, onAdd, onOpenEdit, onDelete, label, addLabel, typeOpts, color, icon: Icon, isDemo }: StructuredListProps) {
  const [adding,  setAdding]  = useState(false);
  const [newType, setNewType] = useState(typeOpts[0] ?? "");
  const [newText, setNewText] = useState("");

  function confirmAdd() {
    onAdd({ type: newType, text: newText });
    setNewType(typeOpts[0] ?? ""); setNewText(""); setAdding(false);
  }
  function cancelAdd() { setAdding(false); setNewType(typeOpts[0] ?? ""); setNewText(""); }

  const inpCls = "flex-1 bg-background/60 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/15";

  return (
    <Card className="border-white/10 bg-card/50 overflow-hidden flex flex-col">
      <div className="h-0.5" style={{ background: `linear-gradient(90deg,${color}70,transparent)` }} />
      <CardContent className="pt-5 pb-5 flex flex-col gap-3 flex-1">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="text-sm font-bold text-foreground">{label}</p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono border"
            style={{ background: `${color}12`, color, borderColor: `${color}25` }}
          >{items.length}</span>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => (
              <motion.div key={`${i}-${item.type}-${item.text}`}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                  <div className="group flex items-start gap-2 px-2.5 py-2 rounded-md bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                    <span className="text-[9px] font-black font-mono mt-1 shrink-0 w-4 text-right" style={{ color, opacity: 0.4 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit border"
                          style={{ background: `${color}12`, color, borderColor: `${color}20` }}
                        >{item.type}</span>
                        {isDemo && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">Example</span>}
                      </div>
                      {item.text && (
                        <p className="text-xs text-foreground/65 leading-snug line-clamp-2">{item.text}</p>
                      )}
                      {!item.text && (
                        <p className="text-xs text-muted-foreground/35 italic">No script text</p>
                      )}
                    </div>
                    {!isDemo && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                        <button onClick={() => onOpenEdit(i, item)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => onDelete(i)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/15 transition-colors">
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add new */}
        <div className="mt-auto">
          <AnimatePresence mode="wait">
            {adding ? (
              <motion.div key="inp" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 flex flex-col gap-2"
              >
                <AppDropdown value={newType} onChange={setNewType} options={typeOpts} size="sm" />
                <textarea
                  autoFocus
                  className={`${inpCls} resize-none text-sm`}
                  rows={2}
                  placeholder="Enter script text..."
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={cancelAdd} className="px-2.5 py-1 rounded bg-white/5 text-xs text-muted-foreground hover:bg-white/10 transition-colors">Cancel</button>
                  <button onClick={confirmAdd} className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                    style={{ background: `${color}20`, color }}
                  >Add {addLabel}</button>
                </div>
              </motion.div>
            ) : (
              <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-dashed border-white/10 hover:border-white/20 bg-transparent hover:bg-white/[0.02] transition-all text-xs text-muted-foreground/60 hover:text-muted-foreground"
              >
                <Plus className="w-3 h-3" />Add {addLabel}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

      </CardContent>
    </Card>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const VARIANT_PREVIEW_LIMIT = 9;

export default function ScriptTesting() {
  const [nodes] = useState(initialNodes);
  const [edges] = useState(initialEdges);
  const [activeNode, setActiveNode] = useState<NodeKind | null>(null);

  const { projectKey, activeProjectCode } = useProject();

  const [hooks,       setHooks]       = useLocalStorage<ScriptEntry[]>(projectKey("script:hooks"),  []);
  const [bodies,      setBodies]      = useLocalStorage<ScriptEntry[]>(projectKey("script:bodies"), []);
  const [ctas,        setCtas]        = useLocalStorage<ScriptEntry[]>(projectKey("script:ctas"),   []);
  const [experiments, setExperiments] = useLocalStorage<LabExperiment[]>(projectKey("lab:experiments"), []);
  const [showAll,      setShowAll]      = useState(false);
  const [justSentKey,  setJustSentKey]  = useState<string | null>(null);
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  // ── Script → Lab routing modal ─────────────────────────────────────────────
  type PendingScript = { v: { hook: ScriptEntry; body: ScriptEntry; cta: ScriptEntry }; scriptIndex: number };
  const [pendingScript,    setPendingScript]    = useState<PendingScript | null>(null);
  const [sendMode,         setSendMode]         = useState<"new" | "existing">("new");
  const [sendPlatform,     setSendPlatform]     = useState("");
  const [sendSelectedTest, setSendSelectedTest] = useState("");
  const [sendConfirm,      setSendConfirm]      = useState<string | null>(null);

  const eligibleTests = useMemo(() => {
    const testMap = new Map<string, LabExperiment[]>();
    experiments.forEach(exp => {
      const tid = exp.testId ?? "";
      if (!tid) return;
      if (!testMap.has(tid)) testMap.set(tid, []);
      testMap.get(tid)!.push(exp);
    });
    return Array.from(testMap.entries())
      .filter(([tid, vs]) => {
        if (!/^.+-T\d+$/.test(tid)) return false;
        const agg = aggregateScriptStatus(vs.map(e => e.status));
        return agg === "Draft" || agg === "Producing";
      })
      .map(([testId, vs]) => ({ testId, variantCount: vs.length }))
      .sort((a, b) => a.testId.localeCompare(b.testId));
  }, [experiments]);

  // Read pending script queue written by Competitor Intelligence or Hypothesis Generator
  useEffect(() => {
    const raw = localStorage.getItem(projectKey("script:pending"));
    if (!raw) return;
    localStorage.removeItem(projectKey("script:pending"));
    try {
      const parsed = JSON.parse(raw);
      // Support both legacy single-object and new array queue formats
      const items: Array<{
        hookType?: string; hookText?: string;
        angle?: string;    angleText?: string;
        // new split fields from Hypothesis Generator
        ctaType?: string;  ctaText?: string;
        // legacy field (full CTA text used as type)
        cta?: string;
      }> = Array.isArray(parsed) ? parsed : [parsed];

      let lastKey = "";
      for (const { hookType, hookText, angle, angleText, ctaType, ctaText, cta } of items) {
        if (hookType) {
          if (hookText) {
            setHooks(prev => [...prev, { type: hookType, text: hookText }]);
          } else {
            setHooks(prev => prev.some(h => h.type === hookType) ? prev : [...prev, { type: hookType, text: "" }]);
          }
        }
        if (angle) {
          if (angleText) {
            setBodies(prev => [...prev, { type: angle, text: angleText }]);
          } else {
            setBodies(prev => prev.some(b => b.type === angle) ? prev : [...prev, { type: angle, text: "" }]);
          }
        }
        // Prefer new split fields; fall back to legacy `cta` string
        const resolvedType = ctaType ?? cta ?? "";
        const resolvedText = ctaText ?? cta ?? "";
        if (resolvedType) {
          if (resolvedText) {
            // Always add when we have text (same behaviour as hooks/bodies with text)
            setCtas(prev => [...prev, { type: resolvedType, text: resolvedText }]);
          } else {
            // Dedup by type only when there is no text
            setCtas(prev =>
              prev.some(c => c.type === resolvedType)
                ? prev
                : [...prev, { type: resolvedType, text: "" }]
            );
          }
        }
        lastKey = variantKey(hookType ?? "", angle ?? "", resolvedType);
      }
      if (lastKey) setHighlightKey(lastKey);
      setShowAll(true);
    } catch (_) {}
  }, []); // runs once on mount; projectKey is stable within a mounted instance

  // Scroll to highlighted variant card after React renders it
  useEffect(() => {
    if (!highlightKey) return;
    const t1 = setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-vkey="${highlightKey}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 180);
    const t2 = setTimeout(() => setHighlightKey(null), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [highlightKey]);

  const existingLabKeys = useMemo(
    () => new Set(experiments.map(e => variantKey(e.hookType, e.primaryAngle, e.cta))),
    [experiments]
  );

  function sendToLab(v: { hook: ScriptEntry; body: ScriptEntry; cta: ScriptEntry }, scriptIndex: number) {
    const key = variantKey(v.hook.type, v.body.type, v.cta.type);
    if (existingLabKeys.has(key)) return;
    setPendingScript({ v, scriptIndex });
    setSendMode("new");
    setSendPlatform("");
    setSendSelectedTest("");
  }

  function confirmSendNewTest() {
    if (!pendingScript || !sendPlatform) return;
    const { v, scriptIndex } = pendingScript;
    const testId   = nextTestIdForScript(experiments, activeProjectCode);
    const variantId = nextVariantIdForScript(experiments, testId);
    const originScriptId = `${activeProjectCode}-S${String(scriptIndex + 1).padStart(2, "0")}`;
    const key = variantKey(v.hook.type, v.body.type, v.cta.type);
    const newExp: LabExperiment = {
      id: variantId, variantId, testId, originScriptId,
      adVariant:      `${v.hook.type} / ${v.body.type}`,
      hookType:       v.hook.type,
      primaryAngle:   v.body.type,
      creativeFormat: "UGC",
      cta:            v.cta.type,
      platform:       sendPlatform,
      editor:         "You",
      startDate:      "",
      timeline:       [],
      ...(v.hook.text ? { hookText: v.hook.text } : {}),
      ...(v.body.text ? { bodyText: v.body.text } : {}),
      ...(v.cta.text  ? { ctaText:  v.cta.text  } : {}),
      thumbStopRate: 0, holdRate: 0, ctr: 0, cpa: 0, status: "Draft",
      adType: "video" as const,
      createdAt: new Date().toISOString(),
    };
    setExperiments(prev => [...prev, newExp]);
    setJustSentKey(key);
    setTimeout(() => setJustSentKey(null), 2500);
    setSendConfirm(`Added to ${testId} as ${variantId}`);
    setTimeout(() => setSendConfirm(null), 4000);
    setPendingScript(null);
  }

  function confirmSendToExisting() {
    if (!pendingScript || !sendSelectedTest) return;
    const { v, scriptIndex } = pendingScript;
    const variantId = nextVariantIdForScript(experiments, sendSelectedTest);
    const inheritedPlatform = experiments.find(e => e.testId === sendSelectedTest)?.platform ?? "";
    const originScriptId = `${activeProjectCode}-S${String(scriptIndex + 1).padStart(2, "0")}`;
    const key = variantKey(v.hook.type, v.body.type, v.cta.type);
    const newExp: LabExperiment = {
      id: variantId, variantId, testId: sendSelectedTest, originScriptId,
      adVariant:      `${v.hook.type} / ${v.body.type}`,
      hookType:       v.hook.type,
      primaryAngle:   v.body.type,
      creativeFormat: "UGC",
      cta:            v.cta.type,
      platform:       inheritedPlatform,
      editor:         "You",
      startDate:      "",
      timeline:       [],
      ...(v.hook.text ? { hookText: v.hook.text } : {}),
      ...(v.body.text ? { bodyText: v.body.text } : {}),
      ...(v.cta.text  ? { ctaText:  v.cta.text  } : {}),
      thumbStopRate: 0, holdRate: 0, ctr: 0, cpa: 0, status: "Draft",
      adType: "video" as const,
      createdAt: new Date().toISOString(),
    };
    setExperiments(prev => [...prev, newExp]);
    setJustSentKey(key);
    setTimeout(() => setJustSentKey(null), 2500);
    setSendConfirm(`Added to ${sendSelectedTest} as ${variantId}`);
    setTimeout(() => setSendConfirm(null), 4000);
    setPendingScript(null);
  }

  const isDemo        = false;
  const displayHooks  = hooks;
  const displayBodies = bodies;
  const displayCtas   = ctas;

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    const kind: NodeKind | null =
      node.id.startsWith("h")   ? "hook" :
      node.id === "body"        ? "body" :
      node.id.startsWith("cta") ? "cta"  : null;
    if (!kind) return;
    setActiveNode(prev => prev === kind ? null : kind);
  }

  const variants = useMemo(() => {
    const result: { hook: ScriptEntry; body: ScriptEntry; cta: ScriptEntry }[] = [];
    for (const h of displayHooks)
      for (const b of displayBodies)
        for (const c of displayCtas)
          result.push({ hook: h, body: b, cta: c });
    return result;
  }, [displayHooks, displayBodies, displayCtas]);

  const displayed = showAll ? variants : variants.slice(0, VARIANT_PREVIEW_LIMIT);
  const total     = displayHooks.length * displayBodies.length * displayCtas.length;

  function entryHelpers(setter: React.Dispatch<React.SetStateAction<ScriptEntry[]>>) {
    return {
      onAdd:    (e: ScriptEntry) => setter(p => [...p, e]),
      onDelete: (i: number)      => setter(p => p.filter((_, j) => j !== i)),
    };
  }

  // ── Edit modal session ─────────────────────────────────────────────────────
  type EditSession = { kind: "hook" | "body" | "cta"; index: number; type: string; text: string };
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  function openEdit(kind: EditSession["kind"], i: number, item: ScriptEntry) {
    setEditSession({ kind, index: i, type: item.type, text: item.text });
  }
  function saveEdit(type: string, text: string) {
    if (!editSession) return;
    const entry: ScriptEntry = { type, text };
    if (editSession.kind === "hook")  setHooks(p => p.map((x, j) => j === editSession!.index ? entry : x));
    if (editSession.kind === "body")  setBodies(p => p.map((x, j) => j === editSession!.index ? entry : x));
    if (editSession.kind === "cta")   setCtas(p => p.map((x, j) => j === editSession!.index ? entry : x));
    setEditSession(null);
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-10 pb-20">

        {/* HEADER */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-500 bg-amber-500/5">Phase 3</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Creative Variant Generator</h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Build structured hooks, bodies, and CTAs — then generate every testable script combination automatically.
            Click any node in the diagram to learn what it controls.
          </p>
        </motion.div>

        {/* INTERACTIVE FLOW DIAGRAM */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.06 }}>
          <Card className="border-white/10 shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-500" />
                    Script Architecture Diagram
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 flex items-center gap-1.5">
                    <MousePointerClick className="w-3 h-3" />
                    Click any node to learn its role, metrics, and common types
                  </CardDescription>
                </div>
                {activeNode && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      background: `${NODE_INFO[activeNode].color}12`,
                      color:       NODE_INFO[activeNode].color,
                      borderColor: `${NODE_INFO[activeNode].color}25`,
                    }}
                  >
                    <Info className="w-3 h-3" />
                    Showing: {NODE_INFO[activeNode].title}
                  </span>
                )}
              </div>
            </CardHeader>
            <div className="h-[360px] w-full bg-background/30 cursor-pointer">
              <ReactFlow
                nodes={nodes} edges={edges} nodeTypes={nodeTypes}
                fitView proOptions={{ hideAttribution: true }}
                onNodeClick={handleNodeClick}
                zoomOnScroll={false} zoomOnPinch={false} preventScrolling={false}
              >
                <Background color="#ffffff" gap={24} size={1} opacity={0.03} />
                <Controls className="!bg-card !border-border !fill-foreground" showInteractive={false} />
              </ReactFlow>
            </div>
          </Card>

          {/* Info panel — slides in below the diagram */}
          <AnimatePresence>
            {activeNode && (
              <div className="mt-4">
                <NodeInfoPanel kind={activeNode} onClose={() => setActiveNode(null)} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── SCRIPT COMPONENT INPUT ────────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Script Component Input</h2>
            <p className="text-sm text-muted-foreground">
              Each entry has a structured type and script text. Every combination generates a complete ad variant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <StructuredList
              items={displayHooks}  {...entryHelpers(setHooks)}
              onOpenEdit={(i, item) => openEdit("hook", i, item)}
              label="Hooks"  addLabel="Hook"  typeOpts={HOOK_TYPE_OPTS}
              color="#8b5cf6" icon={Zap} isDemo={isDemo}
            />
            <StructuredList
              items={displayBodies} {...entryHelpers(setBodies)}
              onOpenEdit={(i, item) => openEdit("body", i, item)}
              label="Bodies" addLabel="Body"  typeOpts={BODY_TYPE_OPTS}
              color="#6366f1" icon={FileText} isDemo={isDemo}
            />
            <StructuredList
              items={displayCtas}   {...entryHelpers(setCtas)}
              onOpenEdit={(i, item) => openEdit("cta", i, item)}
              label="CTAs"   addLabel="CTA"   typeOpts={CTA_TYPE_OPTS}
              color="#10b981" icon={Target} isDemo={isDemo}
            />
          </div>

          {/* Variant counter */}
          <Card className="border-primary/15 bg-primary/[0.025] overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary/60 via-violet-500/30 to-transparent" />
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex items-center gap-4 flex-1 flex-wrap">
                  {[
                    { val: displayHooks.length,  label: "Hooks",  color: "#8b5cf6" },
                    { val: displayBodies.length, label: "Bodies", color: "#6366f1" },
                    { val: displayCtas.length,   label: "CTAs",   color: "#10b981" },
                  ].map(({ val, label, color }, i) => (
                    <div key={label} className="flex items-center gap-2">
                      {i > 0 && <span className="text-muted-foreground/30 font-light text-xl">×</span>}
                      <div className="flex flex-col items-center px-3 py-2 rounded-xl border"
                        style={{ background: `${color}10`, borderColor: `${color}20` }}
                      >
                        <span className="text-2xl font-black tabular-nums" style={{ color }}>{val}</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{label}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground/30 font-light text-xl">=</span>
                    <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                      <motion.span key={total}
                        initial={{ scale: 1.25, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.22 }}
                        className="text-2xl font-black tabular-nums text-primary"
                      >{total}</motion.span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Variants</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Layers className="w-4 h-4 text-primary/60" />
                  <p className="text-xs text-muted-foreground/70 max-w-[180px] leading-relaxed">
                    Every Hook × Body × CTA combination produces a unique, testable ad script.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── GENERATED SCRIPTS ─────────────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.06 }}>
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">Generated Ad Scripts</h2>
              <p className="text-sm text-muted-foreground">
                {total === 0
                  ? "Add at least one hook, body, and CTA to generate scripts."
                  : `${total} script${total !== 1 ? "s" : ""} generated${total > VARIANT_PREVIEW_LIMIT && !showAll ? ` — showing ${VARIANT_PREVIEW_LIMIT}` : ""}.`}
              </p>
            </div>
          </div>

          {total === 0 ? (
            <Card className="border-white/10 bg-card/50">
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/60">No scripts yet</p>
                  <p className="text-xs text-muted-foreground/50">Add entries to all three lists to generate ad scripts.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                <AnimatePresence mode="popLayout">
                  {displayed.map((v, i) => {
                    const vKey       = variantKey(v.hook.type, v.body.type, v.cta.type);
                    const isHighlight = vKey === highlightKey;
                    return (
                    <motion.div key={`${v.hook.type}|${v.body.type}|${v.cta.type}|${i}`} variants={cardItem}
                      layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.22 }}
                      data-vkey={vKey}
                    >
                      <Card className={`transition-all overflow-hidden h-full ${
                        isHighlight
                          ? "border-primary/60 bg-primary/[0.06] shadow-xl shadow-primary/20 ring-1 ring-primary/30"
                          : "border-white/8 bg-card/40 hover:border-white/15 hover:bg-card/60"
                      }`}>
                        <div className={`h-0.5 bg-gradient-to-r ${isHighlight ? "from-primary via-violet-400/60 to-transparent" : "from-primary/40 via-violet-500/20 to-transparent"}`} />
                        <CardContent className="pt-4 pb-4 flex flex-col gap-3 h-full">

                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Ad Script</span>
                              {isDemo && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">Example</span>}
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-widest bg-primary/8 text-primary/70 border border-primary/15">
                              {activeProjectCode}-S{String(i + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* Script preview */}
                          <div className="flex flex-col gap-0 rounded-lg border border-white/5 bg-black/20 overflow-hidden flex-1">
                            {([
                              { section: "HOOK", entry: v.hook, color: "#8b5cf6" },
                              { section: "BODY", entry: v.body, color: "#6366f1" },
                              { section: "CTA",  entry: v.cta,  color: "#10b981" },
                            ] as const).map(({ section, entry, color }, si) => (
                              <div key={section}
                                className={`flex flex-col gap-1.5 px-3 py-3 ${si < 2 ? "border-b border-white/5" : ""}`}
                              >
                                {/* Section label + type badge */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest shrink-0" style={{ color }}>
                                    {section}
                                  </span>
                                  <span className="h-px flex-1 bg-white/5" />
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold border shrink-0"
                                    style={{ background: `${color}12`, color, borderColor: `${color}20` }}
                                  >{entry.type}</span>
                                </div>
                                {/* Script text */}
                                <p className="text-xs leading-relaxed" style={{ color: entry.text ? "rgba(255,255,255,0.72)" : undefined }}>
                                  {entry.text || <span className="italic text-muted-foreground/35">No script text entered</span>}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Send to Creative Lab */}
                          {(() => {
                            const key     = variantKey(v.hook.type, v.body.type, v.cta.type);
                            const already = existingLabKeys.has(key);
                            const justNow = justSentKey === key;
                            return (
                              <div className="mt-auto pt-1">
                                <AnimatePresence mode="wait">
                                  {(already || justNow) ? (
                                    <motion.div key="sent"
                                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.18 }}
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/20"
                                    >
                                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span className="text-xs font-semibold text-emerald-400">
                                        {justNow ? "Variant added to Creative Lab" : "Already in Creative Lab"}
                                      </span>
                                    </motion.div>
                                  ) : (
                                    <motion.button key="btn"
                                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                                      transition={{ duration: 0.18 }}
                                      onClick={() => sendToLab(v, i)}
                                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-primary/8 hover:border-primary/25 hover:text-primary transition-all text-xs font-semibold text-muted-foreground/70 group"
                                    >
                                      <FlaskConical className="w-3 h-3 shrink-0 group-hover:text-primary transition-colors" />
                                      Send to Creative Lab
                                      <ArrowRight className="w-3 h-3 shrink-0 ml-auto opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
                                    </motion.button>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })()}

                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Show all / less */}
              {variants.length > VARIANT_PREVIEW_LIMIT && (
                <motion.div className="flex justify-center mt-6"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                >
                  <Button variant="outline"
                    onClick={() => setShowAll(s => !s)}
                    className="gap-2 border-white/10 hover:border-white/20 text-sm"
                  >
                    {showAll
                      ? <><ChevronUp className="w-4 h-4" />Show fewer scripts</>
                      : <><ChevronDown className="w-4 h-4" />Show all {variants.length} scripts</>
                    }
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {/* ── TESTING PLAN ──────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Testing Sequence</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-1">Testing Plan</h2>
            <p className="text-sm text-muted-foreground">
              Change one variable per round. This isolates causality — you'll know exactly what moved each metric.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {([
              {
                phase:      "Phase 1",
                label:      "Find a Converting Script",
                color:      "#6366f1",
                icon:       FlaskConical,
                constant:   "Keep editing minimal — test the message, not the production",
                metric:     "Conversion Rate / CPA",
                goal:       "Test multiple script combinations (hook + body + CTA) simultaneously to find one that converts. Don't over-produce yet — a simple talking head or captions-only video is enough. You need proof the message works before investing in production.",
                count:      hooks.length * bodies.length * ctas.length,
                countLabel: `${hooks.length * bodies.length * ctas.length} script combinations to evaluate`,
              },
              {
                phase:      "Phase 2",
                label:      "Test Hook Variations",
                color:      "#8b5cf6",
                icon:       Zap,
                constant:   "Winning script body + CTA held constant",
                metric:     "Thumb-Stop Rate (TSR) + CTR",
                goal:       "Take the converting script and attach different hooks. The body is proven — now find which opening grabs the most attention. A better hook on a working script compounds performance significantly.",
                count:      hooks.length,
                countLabel: `${hooks.length} hook${hooks.length !== 1 ? "s" : ""} to evaluate`,
              },
              {
                phase:      "Phase 3",
                label:      "Test Creative Formats",
                color:      "#10b981",
                icon:       Layers,
                constant:   "Winning script + winning hook locked",
                metric:     "Hold Rate + CPA at scale",
                goal:       "With a proven script and hook, now test how the same message performs in different visual formats — UGC, Talking Head, Motion Graphic, Split Screen. Format affects retention and production cost. Find the highest-performing format before scaling spend.",
                count:      FORMATS.length,
                countLabel: `${FORMATS.length} format${FORMATS.length !== 1 ? "s" : ""} to evaluate`,
              },
            ] as const).map(({ phase, label, color, icon: Icon, constant, metric, goal, count, countLabel }, i) => (
              <div key={phase} className="flex items-stretch">
                <Card className="border-white/10 bg-card/50 overflow-hidden hover:border-white/15 transition-colors flex-1">
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg,${color}70,transparent)` }} />
                  <CardContent className="pt-5 pb-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{phase}</p>
                          <p className="text-sm font-bold text-foreground">{label}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md border"
                        style={{ background: `${color}12`, color, borderColor: `${color}25` }}
                      >{count}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Hold Constant</p>
                      <p className="text-xs text-muted-foreground/65 italic">{constant}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">Primary Metric</p>
                      <span className="inline-flex w-fit px-2 py-0.5 rounded-md text-[11px] font-semibold border"
                        style={{ background: `${color}12`, color, borderColor: `${color}25` }}
                      >{metric}</span>
                    </div>
                    <p className="text-xs text-foreground/60 leading-relaxed border-t border-white/5 pt-3">{goal}</p>
                    <p className="text-[10px] text-muted-foreground/45 font-medium">{countLabel}</p>
                  </CardContent>
                </Card>
                {i < 2 && (
                  <div className="hidden md:flex items-center px-0 shrink-0 -mx-2 z-10">
                    <div className="w-4 h-4 rounded-full bg-background border border-white/10 flex items-center justify-center">
                      <ArrowRight className="w-2.5 h-2.5 text-muted-foreground/40" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <NextStepBanner
          step="Creative Lab"
          title="Track Your Variants"
          cta="Open Creative Lab"
          description="Log your script variants as experiments and measure real CTR, TSR, and CPA data to find your winner."
          href="/creative-lab"
          icon={FlaskConical}
          color="#10b981"
        />
      </div>

      {/* ── Send-to-Lab confirmation toast ─────────────────────────────────── */}
      <AnimatePresence>
        {sendConfirm && (
          <motion.div
            key="send-confirm"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/25 bg-[#0a1a12]/95 shadow-xl backdrop-blur-md"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-300">{sendConfirm}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Script → Lab routing modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {pendingScript && (
          <motion.div
            key="send-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[49] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setPendingScript(null); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                    <FlaskConical className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">Send to Creative Lab</p>
                    <p className="text-[11px] text-muted-foreground/55 mt-0.5">
                      {pendingScript.v.hook.type} / {pendingScript.v.body.type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingScript(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-white/5 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1.5 px-5 pt-4">
                {(["new", "existing"] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSendMode(mode)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                      sendMode === mode
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-white/[0.02] border-white/8 text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-white/5"
                    }`}
                  >
                    {mode === "new" ? "Create New Test" : "Add to Existing Test"}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
                {sendMode === "new" ? (
                  <>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                        Platform <span className="text-red-400">*</span>
                      </p>
                      <AppDropdown
                        value={sendPlatform}
                        onChange={setSendPlatform}
                        options={SCRIPT_PLATFORM_OPTS}
                        placeholder="Select platform…"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                      A new test will be created and this script will be added as{" "}
                      <span className="text-muted-foreground/70 font-semibold">V01</span>.
                    </p>
                    <button
                      onClick={confirmSendNewTest}
                      disabled={!sendPlatform}
                      className="mt-1 w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Create Test &amp; Add Variant
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                        Select Test <span className="text-red-400">*</span>
                      </p>
                      {eligibleTests.length === 0 ? (
                        <div className="py-4 text-center rounded-lg border border-white/8 bg-white/[0.02]">
                          <p className="text-xs text-muted-foreground/40">No Draft or Producing tests found.</p>
                          <p className="text-[11px] text-muted-foreground/30 mt-1">Create a new test first.</p>
                        </div>
                      ) : (
                        <AppDropdown
                          value={sendSelectedTest}
                          onChange={setSendSelectedTest}
                          options={eligibleTests.map(t => t.testId)}
                          placeholder="Choose test…"
                        />
                      )}
                    </div>
                    {sendSelectedTest && (
                      <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                        Script will be added as the next variant in{" "}
                        <span className="text-muted-foreground/70 font-semibold">{sendSelectedTest}</span>.
                      </p>
                    )}
                    <button
                      onClick={confirmSendToExisting}
                      disabled={!sendSelectedTest}
                      className="mt-1 w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Add to Test
                    </button>
                  </>
                )}

                <button
                  onClick={() => setPendingScript(null)}
                  className="w-full py-2 text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit script entry modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {editSession && (() => {
          const kindMap = {
            hook: { title: "Edit Hook",  typeOpts: HOOK_TYPE_OPTS, color: "#8b5cf6" },
            body: { title: "Edit Body",  typeOpts: BODY_TYPE_OPTS, color: "#6366f1" },
            cta:  { title: "Edit CTA",   typeOpts: CTA_TYPE_OPTS,  color: "#10b981" },
          };
          const { title, typeOpts, color } = kindMap[editSession.kind];
          return (
            <EditScriptModal
              title={title}
              typeOpts={typeOpts}
              defaultType={editSession.type}
              defaultText={editSession.text}
              color={color}
              onSave={saveEdit}
              onCancel={() => setEditSession(null)}
            />
          );
        })()}
      </AnimatePresence>
    </PageTransition>
  );
}
