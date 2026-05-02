import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Copy, CheckCheck, Sparkles, ChevronDown, RotateCcw, FileText, Lightbulb } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { useProject } from "@/contexts/ProjectContext";

// ─── Data ────────────────────────────────────────────────────────────────────

const HOOK_TYPES = [
  { id: "question", label: "Question Hook", emoji: "❓", desc: "Ask a relatable question the audience is thinking" },
  { id: "negative", label: "Negative Hook", emoji: "🚫", desc: "Start with a problem or pain statement" },
  { id: "statistic", label: "Statistic Hook", emoji: "📊", desc: "Lead with a striking number or percentage" },
  { id: "quotation", label: "Quotation Hook", emoji: "💬", desc: "Use a powerful quote from a customer or authority" },
  { id: "anecdotal", label: "Anecdotal Hook", emoji: "📖", desc: "Share a short relatable personal story" },
  { id: "curiosity", label: "Curiosity Hook", emoji: "🔍", desc: "Say something unexpected that demands attention" },
  { id: "controversial", label: "Controversial Hook", emoji: "⚡", desc: "Challenge a widely held belief or norm" },
  { id: "promise", label: "Promise Hook", emoji: "🤝", desc: "Make a bold, specific, believable promise" },
  { id: "result", label: "Result-Oriented Hook", emoji: "🏆", desc: "Lead with the outcome — before explaining how" },
];

const ANGLE_TYPES = [
  { id: "mechanism", label: "Mechanism Reveal", emoji: "⚙️", desc: "Explain the unique ingredient or process behind the result" },
  { id: "contrarian", label: "Contrarian Claim", emoji: "🔄", desc: "Challenge conventional wisdom in the space" },
  { id: "empathy", label: "Empathy Bridge", emoji: "🫂", desc: "Mirror the audience's exact frustration before offering hope" },
  { id: "transformation", label: "Transformation Story", emoji: "🦋", desc: "Before-and-after narrative that builds desire" },
  { id: "social", label: "Social Proof", emoji: "👥", desc: "Leverage testimonials, numbers, and community wins" },
  { id: "fear", label: "Fear + Solution", emoji: "🛡️", desc: "Agitate the risk of inaction, then reveal the solution" },
  { id: "desire", label: "Dream Outcome", emoji: "✨", desc: "Paint the ideal life after solving the problem" },
  { id: "scientific", label: "Scientific Principle", emoji: "🔬", desc: "Back the claim with research or expert authority" },
];

const AD_FORMATS = [
  { id: "ugc", label: "UGC", emoji: "🎙️", desc: "User-generated style — casual, authentic, face-to-camera" },
  { id: "vsl", label: "VSL", emoji: "🎥", desc: "Long-form video sales letter with structured persuasion" },
  { id: "greenscreen", label: "Greenscreen", emoji: "🟩", desc: "Presenter in front of dynamic visuals or product context" },
  { id: "carousel", label: "Carousel", emoji: "📱", desc: "Swipeable slides that tell a progressive story" },
  { id: "ai-avatar", label: "AI Avatar", emoji: "🤖", desc: "AI-generated presenter for scalable, low-cost creative" },
  { id: "meme", label: "Meme / Skit", emoji: "😂", desc: "Culturally relevant format for high organic resonance" },
  { id: "static", label: "Static Image", emoji: "🖼️", desc: "High-impact still creative with strong copy overlay" },
  { id: "reels", label: "Reels / Short-form", emoji: "⚡", desc: "Fast-paced vertical video optimised for feed placement" },
];

const PERSONAS = [
  { id: "pain-aware", label: "Pain-Aware", emoji: "😣", desc: "Knows the problem but hasn't found a solution yet" },
  { id: "solution-aware", label: "Solution-Aware", emoji: "🔎", desc: "Knows solutions exist but hasn't committed to one" },
  { id: "product-aware", label: "Product-Aware", emoji: "🧠", desc: "Knows your product — needs a reason to buy now" },
  { id: "skeptic", label: "Skeptic", emoji: "🤨", desc: "Has tried things before and been burned — needs proof" },
  { id: "new", label: "New to Problem", emoji: "🌱", desc: "Just discovering they have this problem — education first" },
  { id: "aspirer", label: "Aspirer", emoji: "🚀", desc: "Driven by identity and transformation, not pain" },
];

const EMOTIONAL_TRIGGERS = [
  { id: "frustration", label: "Frustration", emoji: "😤", color: "#ef4444" },
  { id: "hope", label: "Hope", emoji: "🌅", color: "#f59e0b" },
  { id: "trust", label: "Trust", emoji: "🤝", color: "#3b82f6" },
  { id: "urgency", label: "Urgency", emoji: "⏱️", color: "#ef4444" },
  { id: "fomo", label: "FOMO", emoji: "😨", color: "#8b5cf6" },
  { id: "curiosity", label: "Curiosity", emoji: "🧩", color: "#06b6d4" },
  { id: "pride", label: "Pride", emoji: "💪", color: "#10b981" },
  { id: "relief", label: "Relief", emoji: "😮‍💨", color: "#10b981" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestConcept {
  id: number;
  hook: typeof HOOK_TYPES[0];
  angle: typeof ANGLE_TYPES[0];
  format: typeof AD_FORMATS[0];
  persona: typeof PERSONAS[0];
  trigger: typeof EMOTIONAL_TRIGGERS[0];
  brief: string;
}

// ─── Brief generator ──────────────────────────────────────────────────────────

function generateBrief(hook: typeof HOOK_TYPES[0], angle: typeof ANGLE_TYPES[0], format: typeof AD_FORMATS[0], persona: typeof PERSONAS[0], trigger: typeof EMOTIONAL_TRIGGERS[0]): string {
  return `Open with a ${hook.label.toLowerCase()} targeting a ${persona.label.toLowerCase()} audience to trigger ${trigger.label.toLowerCase()}. Use a ${angle.label.toLowerCase()} framework delivered through ${format.label} creative. The ad should feel ${trigger.label === "Trust" || trigger.label === "Hope" ? "warm and credible" : trigger.label === "Urgency" || trigger.label === "FOMO" ? "time-pressured and direct" : "resonant and emotionally charged"}.`;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pick<T>(arr: T[], n: number, used: Set<string>, key: keyof T): T[] {
  const shuffled = shuffle(arr);
  const result: T[] = [];
  for (const item of shuffled) {
    if (result.length >= n) break;
    const k = String(item[key]);
    if (!used.has(k)) {
      result.push(item);
      used.add(k);
    }
  }
  if (result.length < n) result.push(...shuffle(arr).slice(0, n - result.length));
  return result;
}

function generateConcepts(
  hooks: string[],
  angles: string[],
  formats: string[],
  personas: string[],
  triggers: string[],
  count: number
): TestConcept[] {
  const filteredHooks = hooks.length ? HOOK_TYPES.filter((h) => hooks.includes(h.id)) : HOOK_TYPES;
  const filteredAngles = angles.length ? ANGLE_TYPES.filter((a) => angles.includes(a.id)) : ANGLE_TYPES;
  const filteredFormats = formats.length ? AD_FORMATS.filter((f) => formats.includes(f.id)) : AD_FORMATS;
  const filteredPersonas = personas.length ? PERSONAS.filter((p) => personas.includes(p.id)) : PERSONAS;
  const filteredTriggers = triggers.length ? EMOTIONAL_TRIGGERS.filter((t) => triggers.includes(t.id)) : EMOTIONAL_TRIGGERS;

  const concepts: TestConcept[] = [];
  for (let i = 0; i < count; i++) {
    const hook = filteredHooks[i % filteredHooks.length] ?? shuffle(HOOK_TYPES)[0];
    const angle = filteredAngles[i % filteredAngles.length] ?? shuffle(ANGLE_TYPES)[0];
    const format = filteredFormats[i % filteredFormats.length] ?? shuffle(AD_FORMATS)[0];
    const persona = filteredPersonas[i % filteredPersonas.length] ?? shuffle(PERSONAS)[0];
    const trigger = filteredTriggers[i % filteredTriggers.length] ?? shuffle(EMOTIONAL_TRIGGERS)[0];
    concepts.push({
      id: i + 1,
      hook: shuffle([hook])[0],
      angle: shuffle([angle])[0],
      format: shuffle([format])[0],
      persona: shuffle([persona])[0],
      trigger: shuffle([trigger])[0],
      brief: generateBrief(hook, angle, format, persona, trigger),
    });
  }
  return concepts;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChipGroupProps {
  label: string;
  items: { id: string; label: string; emoji: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  accentColor: string;
}

function ChipGroup({ label, items, selected, onToggle, accentColor }: ChipGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>{label}</p>
        {selected.length > 0 && (
          <button onClick={() => selected.forEach(onToggle)} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">
            clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150"
              style={
                active
                  ? { borderColor: accentColor, background: accentColor + "22", color: "#fff" }
                  : { borderColor: "#334155", background: "transparent", color: "#94a3b8" }
              }
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all duration-150"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy Brief"}
    </button>
  );
}

const CARD_ACCENTS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

function ConceptCard({ concept, index, onSendToHypothesis, sent }: {
  concept: TestConcept;
  index: number;
  onSendToHypothesis: () => void;
  sent?: boolean;
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const copyText = `Test Concept #${concept.id}\nHook: ${concept.hook.label}\nAngle: ${concept.angle.label}\nFormat: ${concept.format.label}\nPersona: ${concept.persona.label}\nEmotional Trigger: ${concept.trigger.label}\n\nCreative Brief:\n${concept.brief}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      className="rounded-xl border bg-[#111827] overflow-hidden flex flex-col"
      style={{ borderColor: accent + "44" }}
    >
      {/* Card header */}
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: accent + "33", background: accent + "12" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: accent }}>Test Concept #{concept.id}</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
          <span className="text-[11px] text-slate-400">{concept.format.emoji} {concept.format.label}</span>
        </div>
        <span className="text-xs font-medium rounded-full px-2 py-0.5 border" style={{ color: concept.trigger.color, borderColor: concept.trigger.color + "55", background: concept.trigger.color + "15" }}>
          {concept.trigger.emoji} {concept.trigger.label}
        </span>
      </div>

      {/* Variable grid */}
      <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 flex-1">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Hook</p>
          <p className="text-sm font-semibold text-white">{concept.hook.emoji} {concept.hook.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{concept.hook.desc}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Angle</p>
          <p className="text-sm font-semibold text-white">{concept.angle.emoji} {concept.angle.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{concept.angle.desc}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Format</p>
          <p className="text-sm font-semibold text-white">{concept.format.emoji} {concept.format.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{concept.format.desc}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-0.5">Persona</p>
          <p className="text-sm font-semibold text-white">{concept.persona.emoji} {concept.persona.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{concept.persona.desc}</p>
        </div>
      </div>

      {/* Brief */}
      <div className="px-5 pb-2 pt-0">
        <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-1.5">Creative Brief</p>
        <p className="text-xs text-slate-300 leading-relaxed">{concept.brief}</p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 flex items-center justify-between gap-2 border-t border-white/5">
        <CopyButton text={copyText} />
        <button
          onClick={onSendToHypothesis}
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
            sent
              ? "border-violet-500/45 bg-violet-500/15 text-violet-300"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-violet-500/10 hover:border-violet-500/25 hover:text-violet-300"
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
          {sent ? "Sent to Hypothesis" : "Generate Hypothesis"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Simulator() {
  const { projectKey } = useProject();
  const [, navigate] = useLocation();
  const [selectedHooks, setSelectedHooks] = useState<string[]>([]);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [conceptCount, setConceptCount] = useState(3);
  const [concepts, setConcepts] = useState<TestConcept[]>([]);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sentConceptIds, setSentConceptIds] = useState<Set<number>>(new Set());

  const toggle = useCallback((setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) => {
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const handleGenerate = () => {
    setIsGenerating(true);
    setConcepts([]);
    setTimeout(() => {
      const result = generateConcepts(
        selectedHooks,
        selectedAngles,
        selectedFormats,
        selectedPersonas,
        selectedTriggers,
        conceptCount,
      );
      setConcepts(result);
      setGenerated(true);
      setIsGenerating(false);
    }, 500);
  };

  const handleReset = () => {
    setSelectedHooks([]);
    setSelectedAngles([]);
    setSelectedFormats([]);
    setSelectedPersonas([]);
    setSelectedTriggers([]);
    setConcepts([]);
    setGenerated(false);
    setSentConceptIds(new Set());
  };

  function handleSendToHypothesis(concept: TestConcept) {
    localStorage.setItem(
      projectKey("simulator:pending"),
      JSON.stringify({
        angle:       concept.angle.label,
        awareness:   concept.persona.label,
        hookHint:    concept.hook.label,
        triggerHint: concept.trigger.label,
        format:      concept.format.label,
      })
    );
    setSentConceptIds(prev => new Set([...prev, concept.id]));
    navigate("/hypothesis");
  }

  const totalSelected =
    selectedHooks.length + selectedAngles.length + selectedFormats.length +
    selectedPersonas.length + selectedTriggers.length;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              Testing Engine
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Ad Testing Simulator</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Select your variables, then generate structured test concepts. Leave fields empty to let the engine pick randomly.
            </p>
          </div>
          {generated && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-sm text-slate-400 hover:text-white hover:border-white/30 transition-all duration-150 mt-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ─── Left panel: Selectors ─── */}
          <div className="xl:col-span-2 space-y-5">
            <div className="rounded-xl border border-white/10 bg-[#0f1117] p-5 space-y-6">
              <ChipGroup
                label="Hook Type"
                items={HOOK_TYPES}
                selected={selectedHooks}
                onToggle={toggle(setSelectedHooks)}
                accentColor="#6366f1"
              />
              <ChipGroup
                label="Angle Type"
                items={ANGLE_TYPES}
                selected={selectedAngles}
                onToggle={toggle(setSelectedAngles)}
                accentColor="#f59e0b"
              />
              <ChipGroup
                label="Ad Format"
                items={AD_FORMATS}
                selected={selectedFormats}
                onToggle={toggle(setSelectedFormats)}
                accentColor="#3b82f6"
              />
              <ChipGroup
                label="Persona"
                items={PERSONAS}
                selected={selectedPersonas}
                onToggle={toggle(setSelectedPersonas)}
                accentColor="#10b981"
              />
              <ChipGroup
                label="Emotional Trigger"
                items={EMOTIONAL_TRIGGERS}
                selected={selectedTriggers}
                onToggle={toggle(setSelectedTriggers)}
                accentColor="#ef4444"
              />

              {/* Count selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Number of Concepts</p>
                <div className="flex gap-2">
                  {[3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setConceptCount(n)}
                      className="flex-1 py-2 rounded-lg border text-sm font-semibold transition-all duration-150"
                      style={
                        conceptCount === n
                          ? { borderColor: "#6366f1", background: "#6366f122", color: "#fff" }
                          : { borderColor: "#334155", background: "transparent", color: "#64748b" }
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                {isGenerating ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}>
                      <Shuffle className="w-4 h-4" />
                    </motion.div>
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate {conceptCount} Test Concepts
                    {totalSelected > 0 && (
                      <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {totalSelected} selected
                      </span>
                    )}
                  </>
                )}
              </button>

              {totalSelected === 0 && !generated && (
                <p className="text-center text-[11px] text-slate-600">
                  No selections? The engine picks randomly across all variables.
                </p>
              )}
            </div>
          </div>

          {/* ─── Right panel: Results ─── */}
          <div className="xl:col-span-3 space-y-4">
            <AnimatePresence mode="wait">
              {!generated && !isGenerating && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-white/10 bg-[#0f1117] flex flex-col items-center justify-center text-center p-16 gap-4"
                >
                  <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Ready to generate</p>
                    <p className="text-sm text-slate-500 mt-1">Select your variables and hit Generate to create structured test concepts.</p>
                  </div>
                  <div className="flex gap-3 text-[11px] text-slate-600">
                    <span>✦ Hook</span>
                    <span>✦ Angle</span>
                    <span>✦ Format</span>
                    <span>✦ Persona</span>
                    <span>✦ Trigger</span>
                  </div>
                </motion.div>
              )}

              {isGenerating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-white/10 bg-[#0f1117] flex flex-col items-center justify-center text-center p-16 gap-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center"
                  >
                    <Sparkles className="w-6 h-6 text-violet-400" />
                  </motion.div>
                  <p className="text-slate-400 text-sm">Building test concepts…</p>
                </motion.div>
              )}

              {generated && !isGenerating && (
                <motion.div key="results" className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">
                      {concepts.length} test concepts generated
                      {totalSelected > 0 && ` from ${totalSelected} selected variable${totalSelected > 1 ? "s" : ""}`}
                    </p>
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      Regenerate
                    </button>
                  </div>
                  {concepts.map((concept, i) => (
                    <ConceptCard
                      key={concept.id}
                      concept={concept}
                      index={i}
                      sent={sentConceptIds.has(concept.id)}
                      onSendToHypothesis={() => handleSendToHypothesis(concept)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <NextStepBanner
          step="Script Matrix"
          title="Build Your Scripts"
          cta="Open Script Matrix"
          description="Refine your best concepts into structured hook, body, and CTA combinations in the Script Matrix."
          href="/script-testing"
          icon={FileText}
          color="#f59e0b"
        />
      </div>
    </PageTransition>
  );
}
