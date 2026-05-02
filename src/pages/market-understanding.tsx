import { useState, useCallback, useRef, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { AppDropdown } from "@/components/app-dropdown";
import { PageTransition } from "@/components/page-transition";
import { ReactFlow, Background, Controls, Edge, Node } from "@xyflow/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain, X, ChevronRight, Sparkles, MousePointerClick, Loader2,
  User, ArrowRight, Lightbulb, Video, Megaphone, Zap, Target, BarChart3,
  Plus, Pencil, Trash2, Check, Quote,
} from "lucide-react";
import { NextStepBanner } from "@/components/next-step-banner";
import { ProcessNode } from "@/components/flow-components";
import { motion, AnimatePresence, Variants } from "framer-motion";

// ── NODE TYPES ─────────────────────────────────────────────────────────────────
const nodeTypes = { custom: ProcessNode };

const BASE_NODES: Node[] = [
  { id: "1", type: "custom", position: { x: 250, y: 50  }, data: { label: "Customer Avatar",  icon: "👤", highlight: true } },
  { id: "2", type: "custom", position: { x: 50,  y: 200 }, data: { label: "Pain Points",      icon: "⚡" } },
  { id: "3", type: "custom", position: { x: 250, y: 200 }, data: { label: "Jobs To Be Done",  icon: "💼" } },
  { id: "4", type: "custom", position: { x: 450, y: 200 }, data: { label: "Desires",          icon: "🌟" } },
  { id: "5", type: "custom", position: { x: 250, y: 350 }, data: { label: "Marketing Angles", icon: "🎯", highlight: true, subline: "The Output" } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true },
  { id: "e1-3", source: "1", target: "3", animated: true },
  { id: "e1-4", source: "1", target: "4", animated: true },
  { id: "e2-5", source: "2", target: "5" },
  { id: "e3-5", source: "3", target: "5" },
  { id: "e4-5", source: "4", target: "5" },
];

// ── ANIMATION VARIANTS ────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};
const cardItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};
const panelVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.99 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.18 } },
};
const panelContent: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const panelItem: Variants = {
  hidden: { opacity: 0, x: -6 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28 } },
};
const outputSection: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function SectionHead({ num, icon: Icon, title, subtitle }: { num: string; icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shrink-0">
          {num}
        </span>
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-muted-foreground mt-2 ml-10">{subtitle}</p>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{children}</label>;
}

const inputCls = "w-full bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all";

const fieldStagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const fieldSlide: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};


// ── NODE CONTENT ──────────────────────────────────────────────────────────────
type NodeContent = {
  title: string; color: string; emoji: string; definition: string;
  sources?: string[]; questions?: string[]; example?: string; quote?: string;
  angles?: { name: string; description: string; example: string }[];
};

const NODE_CONTENT: Record<string, NodeContent> = {
  "1": {
    title: "Customer Avatar", emoji: "👤", color: "#6366f1",
    definition: "A detailed profile of your ideal buyer — their demographics, daily behaviors, worldview, and aspirations. The avatar is the lens through which every creative decision is made.",
    sources: ["Facebook Audience Insights", "Reddit communities", "Instagram / TikTok followers", "YouTube comment sections", "Competitor review pages"],
    questions: ["Who are they demographically (age, income, location)?", "What content do they consume daily?", "What communities do they belong to?", "Who do they admire and want to become?", "What triggers action for them?"],
    example: "Real estate agents, 35–52, juggling too many platforms, feeling invisible online despite years of experience.",
    quote: "I know my market — I just don't know how to reach them anymore.",
  },
  "2": {
    title: "Pain Point Research", emoji: "⚡", color: "#ef4444",
    definition: "Pain points are emotional tensions that drive purchase behavior. The deeper the pain, the more urgent the buying motivation. Surface pains inspire interest; deep pains inspire action.",
    sources: ["Reddit threads (search: 'struggling with [niche]')", "Amazon 1–3 star reviews", "YouTube comment sections", "TikTok comments on competitor content", "Competitor ad comment sections"],
    questions: ["What frustrates them daily?", "What have they already tried that failed?", "What feels unfair about their current situation?", "What is this problem costing them — time, money, or status?", "What do they secretly fear will never change?"],
    example: "Real estate agents struggle with inconsistent lead flow — they go from 4 closings to none in the same quarter.",
    quote: "Some months I close 4 deals, then nothing for two months. I can't build a business on that.",
  },
  "3": {
    title: "Jobs To Be Done", emoji: "💼", color: "#f59e0b",
    definition: "JTBD theory frames your product not as features, but as outcomes hired to accomplish a task. Customers don't buy products — they hire them to make progress in their lives.",
    sources: ["Customer surveys", "Sales call recordings", "Review analysis", "Customer interviews"],
    questions: ["Functional job: What practical task are they trying to complete?", "Emotional job: How do they want to feel after using it?", "Social job: How do they want to be perceived by others?", "What current solution are they 'firing' to hire yours?", "What progress defines success for them?"],
    example: "Agents hire lead-gen tools to feel in control of their pipeline — not just to get leads, but to stop feeling like their income is left to chance.",
    quote: "I don't want more leads. I want to know where next month's deals are coming from.",
  },
  "4": {
    title: "Desire Mapping", emoji: "🌟", color: "#10b981",
    definition: "Desires are the positive transformation customers are moving toward — the 'after state.' Understanding desires lets you sell the destination, not just the escape from pain.",
    sources: ["Aspirational Reddit posts", "Success story testimonials", "Before/after reviews", "Life goal surveys"],
    questions: ["What is the ultimate transformation they envision?", "What status shift would make them feel successful?", "What does their life look like in the 'after photo'?", "What quantifiable outcome would prove success?", "What would they tell a friend after achieving their goal?"],
    example: "Agents want predictable, qualified deal flow that lets them choose clients — not chase anyone who picks up the phone.",
    quote: "I want to be the agent people call, not the agent who's always prospecting.",
  },
  "5": {
    title: "Marketing Angles", emoji: "🎯", color: "#8b5cf6",
    definition: "A marketing angle is the unique lens through which you frame your product to a specific audience segment. The same product can be sold through dozens of angles.",
    angles: [
      { name: "Mechanism Reveal",     description: "Expose the hidden reason why the problem exists, then position your product as the only solution built for it.", example: "The real reason your Facebook ads fail isn't budget — it's the hook formula every agency copy-pastes." },
      { name: "Transformation Story", description: "Take the audience from a relatable 'before' state to a desirable 'after' state through a compelling narrative arc.", example: "How one agent went from chasing cold leads to closing 6 deals a month — without changing his budget." },
      { name: "Contrarian Claim",     description: "Challenge widely-accepted beliefs in your niche to create pattern interruption and position yourself as a visionary.", example: "Stop A/B testing your ads. It's making your creative strategy worse — here's what to do instead." },
      { name: "Fear + Relief",        description: "Activate a fear response, validate the threat as real, then present your product as the relief.", example: "Your lead gen strategy is about to stop working. Here's what top agents are switching to now." },
      { name: "Status Upgrade",       description: "Position your product as something that elevates the buyer's identity, reputation, or social standing.", example: "The marketing stack used by the top 1% of real estate teams — not the gurus, the actual closers." },
      { name: "Time Compression",     description: "Sell speed as the core value — getting the customer to their desired outcome faster than any alternative.", example: "How agents are building a 6-month pipeline in under 30 days using automated local demand capture." },
    ],
  },
};

// ── PAIN BOARD ────────────────────────────────────────────────────────────────
interface PainRow {
  id: string;
  pain: string;
  emotion: string;
  failed: string;
  opportunity: string;
  source: string;
}

const PAIN_SOURCES = ["Reddit", "Customer interview", "Review site", "Support ticket", "Sales call"];

const DEFAULT_PAIN_ROWS: PainRow[] = [
  { id: "p1", pain: "Inconsistent lead flow",    emotion: "Financial anxiety", failed: "Facebook boosts, Zillow ads, Cold outreach",           opportunity: "Automated local demand capture system",          source: "Reddit" },
  { id: "p2", pain: "Low ad engagement",         emotion: "Self-doubt",        failed: "Canva templates, Boosted posts, Generic copy",          opportunity: "Scroll-stopping hook framework built for niche",  source: "Review site" },
  { id: "p3", pain: "No time to create content", emotion: "Overwhelm",         failed: "Hiring freelancers, Social media VA, Scheduling tools", opportunity: "Batch production system + AI-assisted repurposing",source: "Customer interview" },
];

const EMPTY_PAIN: Omit<PainRow, "id"> = { pain: "", emotion: "", failed: "", opportunity: "", source: "Reddit" };

// ── VOC LIBRARY ───────────────────────────────────────────────────────────────
interface VocQuote {
  id: string;
  quote: string;
  tag: string;
  source: string;
}

const VOC_TAGS    = ["Pain", "Desire", "Objection", "Skepticism", "JTBD"];
const VOC_SOURCES = ["Reddit", "Review", "Interview", "Comment"];

const TAG_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  Pain:       { color: "#ef4444", bg: "bg-red-500/10",    border: "border-red-500/20"    },
  Desire:     { color: "#10b981", bg: "bg-emerald-500/10",border: "border-emerald-500/20"},
  Objection:  { color: "#f97316", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  Skepticism: { color: "#f59e0b", bg: "bg-amber-500/10",  border: "border-amber-500/20"  },
  JTBD:       { color: "#6366f1", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

const DEFAULT_VOC: VocQuote[] = [
  { id: "v1", quote: "I'm tired of chasing cold leads.",                                    tag: "Pain",      source: "Reddit"    },
  { id: "v2", quote: "Every platform promises leads but none deliver.",                      tag: "Skepticism", source: "Review"   },
  { id: "v3", quote: "I just want predictable deal flow.",                                   tag: "Desire",    source: "Interview" },
  { id: "v4", quote: "I've tried everything and I'm still starting from zero every month.", tag: "Pain",      source: "Comment"   },
  { id: "v5", quote: "I don't need more content. I need content that actually converts.",   tag: "JTBD",      source: "Interview" },
  { id: "v6", quote: "I want to be the agent people call, not the one always prospecting.", tag: "Desire",    source: "Reddit"    },
];

const EMPTY_VOC: Omit<VocQuote, "id"> = { quote: "", tag: "Pain", source: "Reddit" };

// ── ANGLE GENERATOR LOGIC ─────────────────────────────────────────────────────
type AngleResult = { type: string; angle: string; color: string };

function generateAngles(product: string, audience: string, pain: string, outcome: string, existing: string): AngleResult[] {
  const p = product || "your product";
  const a = audience || "your audience";
  const pn = pain || "their core problem";
  const o = outcome || "their desired result";
  const ex = existing || "what they use today";
  return [
    { type: "Mechanism Angle",     color: "#6366f1", angle: `The real reason ${a} can't get ${o} isn't effort — it's that ${ex} was never built to solve ${pn}. ${p} changes the equation.` },
    { type: "Fear Angle",          color: "#ef4444", angle: `Every day ${a} rely on ${ex} for ${pn}, they fall further behind. ${p} is built for the transition that's already happening.` },
    { type: "Status Angle",        color: "#f59e0b", angle: `Top-performing ${a} don't use ${ex} anymore. They use ${p} to achieve ${o} — and it shows in their results.` },
    { type: "Contrarian Angle",    color: "#8b5cf6", angle: `Stop trying to fix ${pn} with ${ex}. The entire conventional approach is wrong — and ${p} proves it.` },
    { type: "Transformation Angle",color: "#10b981", angle: `From struggling with ${pn} to achieving ${o}: this is how ${a} are using ${p} to completely change their results.` },
  ];
}

// ── AVATAR STRATEGY LOGIC ─────────────────────────────────────────────────────
type EmotionalState  = "Frustrated" | "Skeptical" | "Overwhelmed" | "Hopeful" | "Ambitious";
type ProblemAwareness = "Unaware" | "Problem Aware" | "Solution Aware" | "Product Aware";

type AvatarStrategy = {
  angle: string;
  angleExplanation: string;
  primaryEmotion: string;
  secondaryEmotion: string;
  primaryEmotionNote: string;
  secondaryEmotionNote: string;
  hooks: { label: string; icon: string; color: string; text: string }[];
  formats: { label: string; icon: string; note: string }[];
};

const FORMAT_ICON_MAP: Record<string, React.ElementType> = {
  Video, User, Megaphone, Zap,
};

function deriveStrategy(
  audience: string, problem: string, currentSolution: string,
  emotionalState: EmotionalState, awareness: ProblemAwareness,
  identity: string, fear: string, outcome: string,
): AvatarStrategy {
  const aud = audience || "your audience";
  const prob = problem || "their core problem";
  const sol = currentSolution || "their current approach";
  const out = outcome || "their desired outcome";
  const id = identity || "who they want to become";

  // Best angle selection
  const angleMap: Record<string, { angle: string; explanation: string }> = {
    "Unaware-Frustrated":      { angle: "Contrarian Claim",     explanation: `${aud} don't yet see ${prob} as the root cause. A contrarian hook challenges a belief they hold and creates the 'aha' that opens them to a new solution.` },
    "Unaware-Skeptical":       { angle: "Contrarian Claim",     explanation: `Skeptical and unaware buyers reject conventional pitches. A contrarian angle earns attention by disagreeing with the mainstream narrative.` },
    "Unaware-Overwhelmed":     { angle: "Transformation Story", explanation: `Overwhelmed buyers connect with narrative. A relatable transformation story creates empathy and shows the path forward without demanding immediate belief.` },
    "Unaware-Hopeful":         { angle: "Transformation Story", explanation: `Hopeful buyers are receptive to possibility. A transformation story channels that hope into a believable journey toward the outcome they want.` },
    "Unaware-Ambitious":       { angle: "Status Upgrade",       explanation: `Ambitious buyers respond to identity. Position your product as the tool used by top performers — those aspiring to ${id} will self-select in.` },
    "Problem Aware-Frustrated":{ angle: "Fear + Relief",        explanation: `${aud} know the problem but feel stuck. A fear-then-relief arc validates their frustration and presents a credible escape — making action feel urgent.` },
    "Problem Aware-Skeptical": { angle: "Mechanism Reveal",     explanation: `Skeptical-but-aware buyers need a new frame. Revealing a mechanism they haven't seen before bypasses their "I've tried that" defense.` },
    "Problem Aware-Overwhelmed":{ angle: "Transformation Story",explanation: `Overwhelmed buyers need hope and clarity. A simple before-after narrative cuts through complexity and shows that a realistic path exists.` },
    "Problem Aware-Hopeful":   { angle: "Transformation Story", explanation: `Hopeful buyers are close to acting — they just need social proof that the transformation is real and achievable for someone like them.` },
    "Problem Aware-Ambitious": { angle: "Status Upgrade",       explanation: `Ambitious buyers who know the problem are motivated by identity. Frame the solution as the tool that separates top performers from the rest.` },
    "Solution Aware-Frustrated":{ angle: "Mechanism Reveal",   explanation: `${aud} have tried ${sol} and it failed. They need a new mechanism — an explanation of why everything else hasn't worked and why this is different.` },
    "Solution Aware-Skeptical":{ angle: "Mechanism Reveal",     explanation: `Skeptical solution-aware buyers are the hardest to convert. A mechanism reveal showing why ${sol} structurally fails — and what actually works — is the only frame that earns credibility.` },
    "Solution Aware-Overwhelmed":{ angle: "Transformation Story",explanation: `Overwhelmed buyers who've tried solutions need emotional reassurance, not more information. Lead with a relatable story that ends in clarity and relief.` },
    "Solution Aware-Hopeful":  { angle: "Time Compression",     explanation: `Hopeful buyers already believe — they want speed. Position your solution as the fastest path to ${out} they've encountered.` },
    "Solution Aware-Ambitious":{ angle: "Status Upgrade",       explanation: `Ambitious buyers who know the solution space respond to exclusivity. Position your product as the approach used by the top tier of ${aud}.` },
    "Product Aware-Frustrated":{ angle: "Fear + Relief",        explanation: `Product-aware but frustrated buyers need urgency. Reactivate their awareness of the cost of not acting, then offer relief through your offer.` },
    "Product Aware-Skeptical": { angle: "Mechanism Reveal",     explanation: `Skeptical product-aware buyers have objections to overcome. A deeper mechanism explanation addresses the "but why would this work for me" doubt directly.` },
    "Product Aware-Overwhelmed":{ angle: "Time Compression",   explanation: `Product-aware overwhelmed buyers just need a reason to act now. Lead with how fast and easy the path to ${out} actually is.` },
    "Product Aware-Hopeful":   { angle: "Time Compression",     explanation: `Hopeful product-aware buyers are the warmest audience. Close the loop on timing — show how fast they can reach ${out}.` },
    "Product Aware-Ambitious": { angle: "Status Upgrade",       explanation: `Ambitious product-aware buyers buy identity. Reinforce that the top-performing ${aud} use your product — and that choosing otherwise is leaving progress on the table.` },
  };

  const key = `${awareness}-${emotionalState}`;
  const matched = angleMap[key] || { angle: "Mechanism Reveal", explanation: `Given their awareness level and emotional state, a mechanism reveal is the safest choice — it introduces a fresh frame without requiring deep pre-existing belief.` };

  // Emotion mapping
  const emotionMap: Record<EmotionalState, { primary: string; secondary: string; primaryNote: string; secondaryNote: string }> = {
    Frustrated:  { primary: "Relief",     secondary: "Validation", primaryNote: "Lead with the release from pain — the moment the frustration ends.",          secondaryNote: "They need to feel heard. Validate that their struggle is real before offering a solution." },
    Skeptical:   { primary: "Curiosity",  secondary: "Trust",      primaryNote: "Open with something that challenges their existing belief to earn attention.", secondaryNote: "Back every claim with proof. Skeptics buy evidence, not enthusiasm." },
    Overwhelmed: { primary: "Simplicity", secondary: "Confidence", primaryNote: "The greatest gift to an overwhelmed buyer is clarity. Simplify everything.",  secondaryNote: "Show them they're capable of succeeding — reduce the perceived complexity." },
    Hopeful:     { primary: "Excitement", secondary: "Status",     primaryNote: "Match their energy. Amplify the possibility of the outcome they already believe in.", secondaryNote: "Connect the outcome to who they'll become — not just what they'll have." },
    Ambitious:   { primary: "Status",     secondary: "FOMO",       primaryNote: "Lead with identity and where this places them among their peers.",             secondaryNote: "Frame inaction as falling behind — ambitious buyers fear being outcompeted." },
  };
  const emotions = emotionMap[emotionalState];

  // Hooks
  const hooks = [
    {
      label: "Curiosity Hook", icon: "💡", color: "#6366f1",
      text: `What if the real reason ${aud} can't achieve ${out} has nothing to do with ${sol}?`,
    },
    {
      label: "Fear Hook", icon: "⚡", color: "#ef4444",
      text: `Most ${aud} will keep struggling with ${prob} — not because they lack effort, but because ${sol} was never built to actually fix it.`,
    },
    {
      label: "Contrarian Hook", icon: "🔄", color: "#8b5cf6",
      text: `${sol} isn't your ${prob}. The system behind it is.`,
    },
  ];

  // Creative formats — use string icon keys so the strategy is JSON-serializable
  const formats = [
    { label: "UGC Explanation",            icon: "Video",    note: `A customer walks through how they solved ${prob} in their own words — authentic and low-skepticism.` },
    { label: "Founder Story",              icon: "User",     note: `The origin story of why this product was built — connects the audience's pain to a relatable human journey.` },
    { label: "Screen Recording Demo",      icon: "Megaphone",note: `Show the mechanism in action. Ideal for ${aud} who are solution-aware and need to see the difference clearly.` },
    { label: "Problem–Solution Breakdown", icon: "Zap",      note: `Direct 3-step format: name the problem, expose why current approaches fail, reveal the solution. High clarity.` },
  ];

  return { angle: matched.angle, angleExplanation: matched.explanation, primaryEmotion: emotions.primary, secondaryEmotion: emotions.secondary, primaryEmotionNote: emotions.primaryNote, secondaryEmotionNote: emotions.secondaryNote, hooks, formats };
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function MarketUnderstanding() {
  const [nodes, setNodes] = useState<Node[]>(BASE_NODES);
  const [edges]           = useState(initialEdges);
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const { projectKey } = useProject();

  // Angle Builder state
  const angleBuilderRef = useRef<HTMLDivElement>(null);
  const [form, setForm]         = useLocalStorage(projectKey("market:form"), { product: "", audience: "", pain: "", outcome: "", existing: "" });
  const [angles, setAngles]     = useLocalStorage<AngleResult[]>(projectKey("market:angles"), []);
  const [angleLoading, setAngleLoading] = useState(false);
  const [angleGenerated, setAngleGenerated] = useLocalStorage(projectKey("market:angleGenerated"), false);

  // Avatar Builder state
  const [avatar, setAvatar] = useLocalStorage(projectKey("market:avatar"), {
    audience: "", problem: "", currentSolution: "",
    emotionalState: "Frustrated" as EmotionalState,
    awareness: "Solution Aware" as ProblemAwareness,
    identity: "", fear: "", outcome: "",
  });
  const [avatarStrategy, setAvatarStrategy] = useLocalStorage<AvatarStrategy | null>(projectKey("market:avatarStrategy"), null);
  const [avatarLoading, setAvatarLoading]   = useState(false);
  const [sentBadge, setSentBadge]           = useState(false);

  // Pain Board state
  const [painRows,    setPainRows]    = useLocalStorage<PainRow[]>(projectKey("market:painRows"), DEFAULT_PAIN_ROWS);
  const [editingPainId, setEditingPainId] = useState<string|null>(null);
  const [editPainDraft, setEditPainDraft] = useState<Partial<PainRow>>({});
  const [addingPain,  setAddingPain]  = useState(false);
  const [newPainDraft, setNewPainDraft] = useState<Omit<PainRow,"id">>({...EMPTY_PAIN});

  // VOC Library state
  const [vocQuotes,   setVocQuotes]   = useLocalStorage<VocQuote[]>(projectKey("market:vocQuotes"), DEFAULT_VOC);
  const [showAddVoc,  setShowAddVoc]  = useState(false);
  const [newVocDraft, setNewVocDraft] = useState<Omit<VocQuote,"id">>({...EMPTY_VOC});

  // Pattern detection — count tags
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of vocQuotes) counts[q.tag] = (counts[q.tag] || 0) + 1;
    return counts;
  }, [vocQuotes]);

  function startEditPain(row: PainRow) {
    setEditingPainId(row.id);
    setEditPainDraft({ pain: row.pain, emotion: row.emotion, failed: row.failed, opportunity: row.opportunity, source: row.source });
  }
  function commitEditPain() {
    if (!editingPainId) return;
    setPainRows(prev => prev.map(r => r.id === editingPainId ? { ...r, ...editPainDraft } : r));
    setEditingPainId(null);
    setEditPainDraft({});
  }
  function deletePain(id: string) {
    setPainRows(prev => prev.filter(r => r.id !== id));
  }
  function addPain() {
    if (!newPainDraft.pain.trim()) return;
    setPainRows(prev => [...prev, { ...newPainDraft, id: `p${Date.now()}` }]);
    setNewPainDraft({...EMPTY_PAIN});
    setAddingPain(false);
  }

  function addVoc() {
    if (!newVocDraft.quote.trim()) return;
    setVocQuotes(prev => [...prev, { ...newVocDraft, id: `v${Date.now()}` }]);
    setNewVocDraft({...EMPTY_VOC});
    setShowAddVoc(false);
  }
  function deleteVoc(id: string) {
    setVocQuotes(prev => prev.filter(q => q.id !== id));
  }

  const content = activeNode ? NODE_CONTENT[activeNode] : null;

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setActiveNode((prev) => (prev === node.id ? null : node.id));
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, selected: n.id === node.id && activeNode !== node.id } })));
  }, [activeNode]);

  const handleClose = () => {
    setActiveNode(null);
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, selected: false } })));
  };

  const handleAngleGenerate = () => {
    setAngleLoading(true);
    setAngleGenerated(false);
    setTimeout(() => {
      setAngles(generateAngles(form.product, form.audience, form.pain, form.outcome, form.existing));
      setAngleLoading(false);
      setAngleGenerated(true);
    }, 820);
  };

  const handleAvatarGenerate = () => {
    setAvatarLoading(true);
    setAvatarStrategy(null);
    setTimeout(() => {
      setAvatarStrategy(deriveStrategy(avatar.audience, avatar.problem, avatar.currentSolution, avatar.emotionalState, avatar.awareness, avatar.identity, avatar.fear, avatar.outcome));
      setAvatarLoading(false);
    }, 900);
  };

  const handleSendToAngleBuilder = () => {
    setForm((f) => ({
      ...f,
      audience: avatar.audience || f.audience,
      pain:     avatar.problem  || f.pain,
      outcome:  avatar.outcome  || f.outcome,
    }));
    setSentBadge(true);
    setTimeout(() => setSentBadge(false), 2500);
    angleBuilderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-12 pb-20">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">Phase 1</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Market Intel</h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Map the psychological landscape of your buyer before touching an ad account.
            Every winning creative starts with deep market understanding.
          </p>
        </motion.div>

        {/* ── 1. FLOW DIAGRAM ──────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
          <Card className="border-white/10 shadow-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    Angle Generation Flow
                  </CardTitle>
                  <CardDescription className="mt-1">How research translates into creative angles.</CardDescription>
                </div>
                <motion.div
                  animate={{ opacity: activeNode ? 0 : 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground border border-white/10 bg-white/5 rounded-full px-3 py-1.5"
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Click any node to explore
                </motion.div>
              </div>
            </CardHeader>
            <div className="h-[450px] w-full bg-background/50">
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={handleNodeClick} fitView className="dark-theme-flow" proOptions={{ hideAttribution: true }} zoomOnScroll={false} zoomOnPinch={false} preventScrolling={false}>
                <Background color="#ffffff" gap={24} size={1} opacity={0.05} />
                <Controls className="!bg-card !border-border !fill-foreground" showInteractive={false} />
              </ReactFlow>
            </div>
          </Card>
        </motion.div>

        {/* ── 2. NODE DETAIL PANEL ─────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {content && (
            <motion.div key={activeNode} variants={panelVariants} initial="hidden" animate="show" exit="exit">
              <Card className="shadow-2xl overflow-hidden" style={{ borderColor: `${content.color}40`, background: `${content.color}08` }}>
                <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${content.color}80, transparent)` }} />
                <CardHeader className="border-b border-white/5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{content.emoji}</span>
                      <div>
                        <Badge variant="outline" className="mb-1.5 text-[10px]" style={{ borderColor: `${content.color}40`, color: content.color, background: `${content.color}10` }}>Research Guidance</Badge>
                        <CardTitle className="text-xl">{content.title}</CardTitle>
                      </div>
                    </div>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors mt-1 shrink-0 p-1 rounded-md hover:bg-white/5">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <motion.div variants={panelContent} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-6">
                      <motion.div variants={panelItem}>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Definition</p>
                        <p className="text-sm text-foreground/90 leading-relaxed">{content.definition}</p>
                      </motion.div>
                      {content.example && (
                        <motion.div variants={panelItem}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Example Context</p>
                          <p className="text-sm text-foreground/75 italic leading-relaxed">{content.example}</p>
                        </motion.div>
                      )}
                      {content.quote && (
                        <motion.div variants={panelItem}>
                          <div className="rounded-lg border px-4 py-3" style={{ borderColor: `${content.color}25`, background: `${content.color}08` }}>
                            <p className="text-sm italic leading-relaxed" style={{ color: content.color }}>"{content.quote}"</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex flex-col gap-6">
                      {content.sources && (
                        <motion.div variants={panelItem}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Research Sources</p>
                          <ul className="space-y-2">
                            {content.sources.map((s) => (
                              <li key={s} className="flex items-center gap-2.5 text-sm text-foreground/80 group">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 transition-transform group-hover:scale-125" style={{ background: content.color }} />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                      {content.questions && (
                        <motion.div variants={panelItem}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Research Questions</p>
                          <ul className="space-y-2">
                            {content.questions.map((q) => (
                              <li key={q} className="flex items-start gap-2.5 text-sm text-foreground/80">
                                <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: content.color }} />
                                {q}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                      {content.angles && (
                        <motion.div variants={panelItem} className="grid grid-cols-1 gap-2.5">
                          {content.angles.map((a) => (
                            <motion.div key={a.name} whileHover={{ x: 3 }} transition={{ duration: 0.15 }} className="rounded-lg border border-white/5 bg-card/60 p-3 hover:border-white/10 transition-colors">
                              <p className="text-xs font-bold text-primary mb-1">{a.name}</p>
                              <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{a.description}</p>
                              <p className="text-xs text-foreground/65 italic">"{a.example}"</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 6. CUSTOMER AVATAR BUILDER ───────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
          {/* Divider */}
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Strategic Tools</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight mb-2">Customer Avatar Builder</h2>
            <p className="text-sm text-muted-foreground">Define your audience psychology to generate messaging strategy and creative direction.</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* ── INPUT PANEL ── */}
            <Card className="border-white/10 bg-card/50">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">IN</span>
                  Audience Profile
                </CardTitle>
                <CardDescription className="text-xs">Capture the psychological state of your buyer.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <motion.div
                  className="flex flex-col gap-5"
                  variants={fieldStagger}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                >
                  <motion.div variants={fieldSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Audience</FieldLabel>
                      <input className={inputCls} placeholder="e.g. Real Estate Agents" value={avatar.audience} onChange={(e) => setAvatar((a) => ({ ...a, audience: e.target.value }))} />
                    </div>
                    <div>
                      <FieldLabel>Core Problem</FieldLabel>
                      <input className={inputCls} placeholder="e.g. Inconsistent lead flow" value={avatar.problem} onChange={(e) => setAvatar((a) => ({ ...a, problem: e.target.value }))} />
                    </div>
                  </motion.div>

                  <motion.div variants={fieldSlide}>
                    <FieldLabel>Current Solution They Use</FieldLabel>
                    <input className={inputCls} placeholder="e.g. Zillow ads and cold outreach" value={avatar.currentSolution} onChange={(e) => setAvatar((a) => ({ ...a, currentSolution: e.target.value }))} />
                  </motion.div>

                  <motion.div variants={fieldSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Emotional State</FieldLabel>
                      <AppDropdown
                        value={avatar.emotionalState}
                        onChange={(v) => setAvatar((a) => ({ ...a, emotionalState: v as EmotionalState }))}
                        options={["Frustrated", "Skeptical", "Overwhelmed", "Hopeful", "Ambitious"]}
                      />
                    </div>
                    <div>
                      <FieldLabel>Problem Awareness</FieldLabel>
                      <AppDropdown
                        value={avatar.awareness}
                        onChange={(v) => setAvatar((a) => ({ ...a, awareness: v as ProblemAwareness }))}
                        options={["Unaware", "Problem Aware", "Solution Aware", "Product Aware"]}
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={fieldSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Desired Identity</FieldLabel>
                      <input className={inputCls} placeholder="e.g. Top producing local agent" value={avatar.identity} onChange={(e) => setAvatar((a) => ({ ...a, identity: e.target.value }))} />
                    </div>
                    <div>
                      <FieldLabel>Big Fear</FieldLabel>
                      <input className={inputCls} placeholder="e.g. Losing deals to competitors" value={avatar.fear} onChange={(e) => setAvatar((a) => ({ ...a, fear: e.target.value }))} />
                    </div>
                  </motion.div>

                  <motion.div variants={fieldSlide}>
                    <FieldLabel>Dream Outcome</FieldLabel>
                    <input className={inputCls} placeholder="e.g. Predictable inbound deal flow" value={avatar.outcome} onChange={(e) => setAvatar((a) => ({ ...a, outcome: e.target.value }))} />
                  </motion.div>

                  <motion.div variants={fieldSlide}>
                    <Button onClick={handleAvatarGenerate} disabled={avatarLoading} className="gap-2 w-full">
                      {avatarLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Strategy…</>
                        : <><Lightbulb className="w-4 h-4" /> Generate Messaging Strategy</>
                      }
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>

            {/* ── OUTPUT PANEL ── */}
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {avatarLoading && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center rounded-xl border border-white/10 bg-card/30 min-h-[200px]">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-7 h-7 animate-spin text-primary/60" />
                      <p className="text-sm">Deriving messaging strategy…</p>
                    </div>
                  </motion.div>
                )}

                {!avatarLoading && !avatarStrategy && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-card/20 min-h-[200px]">
                    <div className="flex flex-col items-center gap-3 text-center px-8">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-primary/60" />
                      </div>
                      <p className="text-sm text-muted-foreground">Fill in the audience profile and click Generate to see your messaging strategy.</p>
                    </div>
                  </motion.div>
                )}

                {!avatarLoading && avatarStrategy && (
                  <motion.div key="output" variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col gap-4">

                    {/* S1 — Messaging Strategy */}
                    <motion.div variants={outputSection}>
                      <Card className="border-white/10 bg-card/50 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
                        <CardContent className="pt-5 pb-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Messaging Strategy</p>
                          <div className="flex items-start gap-3">
                            <div className="flex flex-col gap-0.5 shrink-0">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Best Angle</span>
                              <Badge className="bg-primary/15 text-primary border-primary/25 text-xs font-bold">{avatarStrategy.angle}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed mt-3">{avatarStrategy.angleExplanation}</p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* S2 — Emotional Triggers */}
                    <motion.div variants={outputSection}>
                      <Card className="border-white/10 bg-card/50 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-500/20 to-transparent" />
                        <CardContent className="pt-5 pb-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Emotional Triggers</p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "Primary",   value: avatarStrategy.primaryEmotion,   note: avatarStrategy.primaryEmotionNote,   color: "#f59e0b" },
                              { label: "Secondary", value: avatarStrategy.secondaryEmotion,  note: avatarStrategy.secondaryEmotionNote, color: "#6366f1" },
                            ].map(({ label, value, note, color }) => (
                              <div key={label} className="rounded-lg border border-white/5 bg-background/40 p-3">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                                <p className="text-sm font-bold mb-1.5" style={{ color }}>{value}</p>
                                <p className="text-xs text-foreground/60 leading-relaxed">{note}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* S3 — Hook Directions */}
                    <motion.div variants={outputSection}>
                      <Card className="border-white/10 bg-card/50 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500/20 to-transparent" />
                        <CardContent className="pt-5 pb-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Hook Directions</p>
                          <div className="flex flex-col gap-2.5">
                            {avatarStrategy.hooks.map((h) => (
                              <motion.div key={h.label} whileHover={{ x: 3 }} transition={{ duration: 0.14 }} className="flex gap-3 rounded-lg border border-white/5 bg-background/40 p-3 hover:border-white/10 transition-colors">
                                <span className="text-lg shrink-0 mt-0.5">{h.icon}</span>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: h.color }}>{h.label}</p>
                                  <p className="text-xs text-foreground/80 leading-relaxed italic">"{h.text}"</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* S4 — Creative Formats */}
                    <motion.div variants={outputSection}>
                      <Card className="border-white/10 bg-card/50 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
                        <CardContent className="pt-5 pb-4">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Creative Directions</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(avatarStrategy.formats ?? []).map(({ label, icon: iconKey, note }) => {
                              const Icon = FORMAT_ICON_MAP[iconKey] ?? Zap;
                              return (
                              <div key={label} className="flex gap-2.5 rounded-lg border border-white/5 bg-background/40 p-3 hover:border-white/10 transition-colors">
                                <div className="w-7 h-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                  <Icon className="w-3.5 h-3.5 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-foreground/90 mb-0.5">{label}</p>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{note}</p>
                                </div>
                              </div>
                            ); })}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* S5 — Send to Angle Builder */}
                    <motion.div variants={outputSection}>
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-foreground mb-0.5">Send Strategy to Angle Builder</p>
                          <p className="text-xs text-muted-foreground">Pre-fills Audience, Core Pain, and Dream Outcome fields.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleSendToAngleBuilder} className="gap-2 border-primary/30 text-primary hover:bg-primary/10 shrink-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                          Apply to Angle Builder
                        </Button>
                      </div>
                    </motion.div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.div>

        {/* ── 4. PAIN POINT MAPPING BOARD ──────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold tracking-tight">Pain Point Mapping Board</h2>
            <Button size="sm" variant="outline" onClick={() => { setAddingPain(true); setEditingPainId(null); }}
              className="gap-2 border-white/10 hover:border-primary/30 hover:text-primary hover:bg-primary/5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10 shadow-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  {[
                    { label: "Pain",             color: "text-foreground/60"  },
                    { label: "Emotion",          color: "text-amber-500/70"   },
                    { label: "Failed Solutions", color: "text-red-500/70"     },
                    { label: "Opportunity",      color: "text-emerald-500/70" },
                    { label: "Source",           color: "text-blue-400/70"    },
                    { label: "",                 color: ""                    },
                  ].map(({ label, color }) => (
                    <th key={label} className={`px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {painRows.map((row) => {
                  const isEditing = editingPainId === row.id;
                  return (
                    <tr key={row.id} className="border-b border-white/5 last:border-0 transition-colors duration-150 hover:bg-white/[0.03] group">
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2.5"><input className="w-full bg-white/[0.06] border border-primary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50 min-w-[130px]" value={editPainDraft.pain??""} onChange={e=>setEditPainDraft(d=>({...d,pain:e.target.value}))} placeholder="Pain…"/></td>
                          <td className="px-3 py-2.5"><input className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50 min-w-[110px]" value={editPainDraft.emotion??""} onChange={e=>setEditPainDraft(d=>({...d,emotion:e.target.value}))} placeholder="Emotion…"/></td>
                          <td className="px-3 py-2.5"><input className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50 min-w-[180px]" value={editPainDraft.failed??""} onChange={e=>setEditPainDraft(d=>({...d,failed:e.target.value}))} placeholder="Comma-separated…"/></td>
                          <td className="px-3 py-2.5"><input className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50 min-w-[180px]" value={editPainDraft.opportunity??""} onChange={e=>setEditPainDraft(d=>({...d,opportunity:e.target.value}))} placeholder="Opportunity…"/></td>
                          <td className="px-3 py-2.5">
                            <AppDropdown size="sm" value={editPainDraft.source??""} onChange={v=>setEditPainDraft(d=>({...d,source:v}))} options={PAIN_SOURCES} className="min-w-[130px]"/>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button onClick={commitEditPain} className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/15 border border-primary/25 text-primary hover:bg-primary/25 transition-colors"><Check className="w-3.5 h-3.5"/></button>
                              <button onClick={()=>setEditingPainId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-muted-foreground/50 transition-colors"><X className="w-3.5 h-3.5"/></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 font-semibold text-foreground/90 min-w-[140px]">{row.pain}</td>
                          <td className="px-4 py-4 text-amber-400/90 font-medium min-w-[120px]">{row.emotion}</td>
                          <td className="px-4 py-4 min-w-[200px]">
                            <div className="flex flex-wrap gap-1.5">
                              {row.failed.split(",").map(f=>f.trim()).filter(Boolean).map(f=>(
                                <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-red-500/10 text-red-400 border border-red-500/15">{f}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-emerald-400/90 font-medium min-w-[200px]">{row.opportunity}</td>
                          <td className="px-4 py-4 min-w-[110px]">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/15 uppercase tracking-wide">{row.source}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={()=>startEditPain(row)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-muted-foreground/40 hover:text-foreground transition-colors"><Pencil className="w-3 h-3"/></button>
                              <button onClick={()=>deletePain(row.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {/* Add row inline */}
                <AnimatePresence>
                  {addingPain && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 bg-primary/[0.04] border-t border-primary/15">
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="flex flex-col gap-1 min-w-[130px]">
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Pain</span>
                            <input className="bg-white/[0.06] border border-primary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" value={newPainDraft.pain} onChange={e=>setNewPainDraft(d=>({...d,pain:e.target.value}))} placeholder="Describe the pain…" autoFocus/>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[110px]">
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Emotion</span>
                            <input className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" value={newPainDraft.emotion} onChange={e=>setNewPainDraft(d=>({...d,emotion:e.target.value}))} placeholder="e.g. Anxiety"/>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[160px]">
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Failed Solutions</span>
                            <input className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" value={newPainDraft.failed} onChange={e=>setNewPainDraft(d=>({...d,failed:e.target.value}))} placeholder="Comma-separated…"/>
                          </div>
                          <div className="flex flex-col gap-1 min-w-[160px]">
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Opportunity</span>
                            <input className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" value={newPainDraft.opportunity} onChange={e=>setNewPainDraft(d=>({...d,opportunity:e.target.value}))} placeholder="Opportunity…"/>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Source</span>
                            <AppDropdown size="sm" value={newPainDraft.source} onChange={v=>setNewPainDraft(d=>({...d,source:v}))} options={PAIN_SOURCES} className="min-w-[130px]"/>
                          </div>
                          <div className="flex items-center gap-1.5 pb-0.5">
                            <button onClick={addPain} className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-primary/15 border border-primary/25 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"><Check className="w-3.5 h-3.5"/>Save</button>
                            <button onClick={()=>{setAddingPain(false);setNewPainDraft({...EMPTY_PAIN});}} className="h-8 px-2 flex items-center rounded-lg hover:bg-white/8 text-muted-foreground/50 transition-colors"><X className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {painRows.length === 0 && !addingPain && (
            <div className="mt-3 text-center py-6 text-xs text-muted-foreground/40">No pain points logged yet — click Add Row to start.</div>
          )}
        </motion.div>

        {/* ── 5. VOICE OF CUSTOMER LIBRARY ─────────────────────────────────── */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Voice of Customer Library</h2>
              <p className="text-sm text-muted-foreground mt-1">Log real customer quotes to surface messaging patterns.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddVoc(v => !v)}
              className="gap-2 border-white/10 hover:border-primary/30 hover:text-primary hover:bg-primary/5 text-xs">
              {showAddVoc ? <X className="w-3.5 h-3.5"/> : <Plus className="w-3.5 h-3.5"/>}
              {showAddVoc ? "Cancel" : "Add Quote"}
            </Button>
          </div>

          {/* Pattern summary */}
          {vocQuotes.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {VOC_TAGS.filter(t => tagCounts[t]).map(tag => {
                const s = TAG_STYLE[tag];
                return (
                  <div key={tag} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${s.bg} ${s.border}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:s.color}}>{tag}</span>
                    <span className="text-xs font-bold" style={{color:s.color}}>{tagCounts[tag]}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.03]">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Total</span>
                <span className="text-xs font-bold text-muted-foreground/70">{vocQuotes.length}</span>
              </div>
            </div>
          )}

          {/* Add Quote form */}
          <AnimatePresence>
            {showAddVoc && (
              <motion.div
                initial={{opacity:0,y:-8,height:0}} animate={{opacity:1,y:0,height:"auto"}} exit={{opacity:0,y:-8,height:0}}
                transition={{duration:0.2}} className="overflow-hidden mb-5"
              >
                <Card className="border-primary/20 bg-primary/[0.04] overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent"/>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Quote</label>
                        <textarea
                          rows={2}
                          className="w-full bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
                          placeholder='e.g. "I just want leads that actually close…"'
                          value={newVocDraft.quote}
                          onChange={e=>setNewVocDraft(d=>({...d,quote:e.target.value}))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Tag</label>
                          <AppDropdown value={newVocDraft.tag} onChange={v=>setNewVocDraft(d=>({...d,tag:v}))} options={VOC_TAGS} className="w-full"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Source</label>
                          <AppDropdown value={newVocDraft.source} onChange={v=>setNewVocDraft(d=>({...d,source:v}))} options={VOC_SOURCES} className="w-full"/>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={addVoc} disabled={!newVocDraft.quote.trim()} className="gap-2">
                          <Check className="w-3.5 h-3.5"/> Save Quote
                        </Button>
                        <Button size="sm" variant="ghost" onClick={()=>{setShowAddVoc(false);setNewVocDraft({...EMPTY_VOC});}}>Cancel</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quote cards */}
          {vocQuotes.length === 0 && !showAddVoc ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-card/20 py-12 text-center">
              <Quote className="w-8 h-8 mx-auto mb-3 text-muted-foreground/20"/>
              <p className="text-sm text-muted-foreground/50">No quotes yet — click Add Quote to start building your VoC library.</p>
            </div>
          ) : (
            <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vocQuotes.map((q) => {
                const s = TAG_STYLE[q.tag] ?? TAG_STYLE.Pain;
                return (
                  <motion.div key={q.id} variants={cardItem}>
                    <motion.div whileHover={{ y: -4, boxShadow: `0 12px 32px ${s.color}18` }} transition={{ duration: 0.2 }} className="h-full">
                      <Card className="border-white/10 bg-card/50 h-full overflow-hidden transition-colors hover:border-white/15 group relative">
                        <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${s.color}80, transparent)` }} />
                        <CardContent className="pt-5 pb-4 flex flex-col gap-3">
                          <div className="text-3xl leading-none font-serif" style={{ color: `${s.color}30` }}>"</div>
                          <p className="text-sm text-foreground/90 leading-relaxed -mt-2">"{q.quote}"</p>
                          <div className="flex items-center justify-between gap-2 flex-wrap mt-auto">
                            <span className={`inline-flex items-center self-start text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border ${s.bg} ${s.border}`} style={{color:s.color}}>{q.tag}</span>
                            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">{q.source}</span>
                          </div>
                        </CardContent>
                        <button
                          onClick={() => deleteVoc(q.id)}
                          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3"/>
                        </button>
                      </Card>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* ── 3. CREATIVE ANGLE BUILDER ────────────────────────────────────── */}
        <motion.div ref={angleBuilderRef} id="angle-builder" variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          <h2 className="text-xl font-bold tracking-tight mb-6">Creative Angle Builder</h2>
          <Card className="border-white/10 bg-card/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {([
                  { key: "product",  label: "Product / Offer",            placeholder: "e.g. Lead gen system for agents" },
                  { key: "audience", label: "Target Audience",            placeholder: "e.g. Real estate agents" },
                  { key: "pain",     label: "Core Pain",                  placeholder: "e.g. Inconsistent leads" },
                  { key: "outcome",  label: "Desired Outcome",            placeholder: "e.g. Predictable deal flow" },
                  { key: "existing", label: "Existing Solution They Use", placeholder: "e.g. Zillow ads, cold outreach" },
                ] as { key: keyof typeof form; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <Input className="bg-background/60 border-white/10 text-sm transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" placeholder={placeholder} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleAngleGenerate} disabled={angleLoading} className="gap-2 min-w-[160px]">
                  {angleLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Angles</>}
                </Button>
                <AnimatePresence>
                  {sentBadge && (
                    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                      <Target className="w-3.5 h-3.5" /> Strategy applied from Avatar Builder
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence>
            {angleGenerated && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
                {angles.map((a) => (
                  <motion.div key={a.type} variants={cardItem}>
                    <motion.div whileHover={{ y: -3, boxShadow: `0 8px 30px ${a.color}25` }} transition={{ duration: 0.18 }}>
                      <Card className="border-white/10 bg-card/60 h-full overflow-hidden">
                        <div className="h-0.5" style={{ background: a.color }} />
                        <CardHeader className="pb-2 pt-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                            <span className="text-xs font-bold tracking-wide" style={{ color: a.color }}>{a.type}</span>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-foreground/85 leading-relaxed">{a.angle}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <NextStepBanner
          step="Phase 2"
          title="Competitor Intelligence"
          cta="Go to Competitors"
          description="Reverse-engineer the winning hook types, angles, and formats being used in your market before you write a single script."
          href="/competitor-intelligence"
          icon={BarChart3}
          color="#8b5cf6"
        />
      </div>
    </PageTransition>
  );
}
