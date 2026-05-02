import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Radio, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface AwarenessLevel {
  id: string;
  label: string;
  color: string;
  tagline: string;
  whatTheyBelieve: string;
  whatMessageWorks: string;
  hookTypes: string[];
}

const LEVELS: AwarenessLevel[] = [
  {
    id: "unaware",
    label: "Unaware",
    color: "#64748b",
    tagline: "They don't know they have a problem.",
    whatTheyBelieve:
      "Life is just the way it is. The pain they experience — the friction, the inefficiency, the frustration — hasn't been framed as a solvable problem. They may not even realize what they're putting up with or that an alternative exists.",
    whatMessageWorks:
      "Interrupt their scroll with a relatable moment, scenario, or emotion that names the feeling they haven't put words to. Don't mention your product yet. Lead with the human experience and let the pattern recognition do the work. The goal is to get them to think: 'that's exactly how I feel.'",
    hookTypes: [
      "Relatable scenario hooks (\"Have you ever noticed...\")",
      "Bold curiosity statements (\"Most people don't realize...\")",
      "Emotional storytelling openers",
      "Contrarian or surprising facts",
    ],
  },
  {
    id: "problem-aware",
    label: "Problem Aware",
    color: "#10b981",
    tagline: "They know the problem. They don't know what solves it.",
    whatTheyBelieve:
      "They have identified a real frustration or pain point and know they want it gone — but they don't yet know what category of solution addresses it. They may be searching for answers in vague terms, asking peers, or trying random fixes without a clear framework for what they're looking for.",
    whatMessageWorks:
      "Validate and amplify the problem first. Show that you understand their exact pain in specific, recognizable terms. Then introduce the category of solution — not your product specifically — and position it as the logical answer to the frustration they've been sitting with.",
    hookTypes: [
      "Problem agitation hooks (\"If you're still doing X, here's why it keeps failing\")",
      "Empathy-first openers (\"I know how frustrating it is when...\")",
      "Question hooks that name the exact pain",
      "Statistics that frame the problem's scale",
    ],
  },
  {
    id: "solution-aware",
    label: "Solution Aware",
    color: "#3b82f6",
    tagline: "They know solution types exist. They haven't committed to one.",
    whatTheyBelieve:
      "They've researched the problem and know there are solutions out there. They may have tried one or more alternatives that didn't work, or they're actively comparing options. They are skeptical, informed, and evaluating whether your approach is genuinely different or just more of the same.",
    whatMessageWorks:
      "Lead with differentiation at the mechanism level — explain why other solutions fail and what specifically makes your approach work differently. Avoid generic benefit claims. Speak to the sophistication of someone who has already done research and needs a reason to believe you've cracked what others haven't.",
    hookTypes: [
      "Mechanism reveal hooks (\"Here's why most X tools don't actually work\")",
      "Comparison hooks (\"Old way vs new way\")",
      "Contrarian takes on conventional wisdom in the category",
      "\"Why I switched from X to Y\" style narrative openers",
    ],
  },
  {
    id: "product-aware",
    label: "Product Aware",
    color: "#8b5cf6",
    tagline: "They know your product. They haven't bought yet.",
    whatTheyBelieve:
      "They've seen your brand or product before and are interested, but something is holding them back. Common objections at this stage include price concerns, doubts about whether it works for their specific situation, trust in the brand, or simply not feeling enough urgency to act now. The decision is sitting on the fence.",
    whatMessageWorks:
      "Address the objections directly. Don't re-explain what the product does — they know. Focus on social proof, risk reversal, specific results from people like them, and anything that removes the remaining friction between consideration and purchase. Give them a reason to act today rather than 'eventually.'",
    hookTypes: [
      "Testimonial-led hooks (customer result as the opening frame)",
      "Objection-busting openers (\"You might be thinking X, here's why that's not true\")",
      "Results-focused hooks (specific outcome numbers up front)",
      "Risk reversal openers (guarantee or zero-risk framing)",
    ],
  },
  {
    id: "most-aware",
    label: "Most Aware",
    color: "#f59e0b",
    tagline: "They're ready. They just need the right offer.",
    whatTheyBelieve:
      "They know the product, they want it, and they're essentially waiting for the right moment, the right price, or the right prompt to act. They are the warmest possible audience — the only thing between them and a purchase is the offer itself. They don't need convincing; they need activation.",
    whatMessageWorks:
      "Be direct. Lead with the offer, the deal, the deadline, or the next step. This is the one audience where a clear 'buy now' message is not only acceptable but preferred. Don't bury the CTA inside a long narrative. Get to the point immediately and make the action easy.",
    hookTypes: [
      "Offer-first openers (lead with discount, bonus, or deal)",
      "Urgency and scarcity hooks (\"Last chance\", \"Ends Friday\")",
      "Direct call-to-action openers",
      "Reactivation hooks for lapsed or cart-abandon audiences",
    ],
  },
];

// ─── Pyramid ──────────────────────────────────────────────────────────────────

const PYRAMID_LAYERS = [
  { id: "most-aware",     label: "Most Aware",     color: "#f59e0b", points: "250,10 200,52 300,52",          textY: 36,  fontSize: 10 },
  { id: "product-aware",  label: "Product Aware",  color: "#8b5cf6", points: "200,54 300,54 351,96 149,96",   textY: 78,  fontSize: 11 },
  { id: "solution-aware", label: "Solution Aware", color: "#3b82f6", points: "149,98 351,98 401,140 99,140",  textY: 122, fontSize: 12 },
  { id: "problem-aware",  label: "Problem Aware",  color: "#10b981", points: "99,142 401,142 451,184 49,184", textY: 166, fontSize: 12 },
  { id: "unaware",        label: "Unaware",        color: "#64748b", points: "49,186 451,186 500,228 0,228",  textY: 210, fontSize: 13 },
];

function AwarenessPyramid({ onSelect, selected }: { onSelect: (id: string) => void; selected: string | null }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="w-full flex justify-center select-none">
      <div className="w-full max-w-lg">
        <svg
          viewBox="0 0 500 240"
          className="w-full"
          style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.4))" }}
        >
          {PYRAMID_LAYERS.map((layer) => {
            const isSelected = selected === layer.id;
            const isHovered = hovered === layer.id;
            const opacity = isSelected ? 1 : isHovered ? 0.92 : 0.7;
            return (
              <g
                key={layer.id}
                onClick={() => onSelect(layer.id)}
                onMouseEnter={() => setHovered(layer.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {isHovered && !isSelected && (
                  <polygon
                    points={layer.points}
                    fill={layer.color}
                    opacity={0.35}
                    style={{
                      filter: `blur(6px)`,
                      transform: "scale(1.04)",
                      transformOrigin: "250px 120px",
                    }}
                  />
                )}
                <polygon
                  points={layer.points}
                  fill={layer.color}
                  opacity={opacity}
                  style={{
                    transition: "opacity 0.15s ease, filter 0.15s ease, transform 0.15s ease",
                    filter: isHovered ? `brightness(1.25) drop-shadow(0 0 8px ${layer.color}99)` : "none",
                    transform: isHovered ? "scale(1.015)" : "scale(1)",
                    transformOrigin: "250px 120px",
                  }}
                />
                {isSelected && (
                  <polygon
                    points={layer.points}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    opacity={0.5}
                  />
                )}
                {isHovered && !isSelected && (
                  <polygon
                    points={layer.points}
                    fill="none"
                    stroke={layer.color}
                    strokeWidth="1.5"
                    opacity={0.6}
                  />
                )}
                <text
                  x="250"
                  y={layer.textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={layer.fontSize}
                  fontWeight="700"
                  fontFamily="system-ui, sans-serif"
                  style={{
                    pointerEvents: "none",
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    transition: "font-size 0.15s ease",
                  }}
                >
                  {layer.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Largest audience</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">Most purchase-ready</span>
        </div>
      </div>
    </div>
  );
}

// ─── LevelCard ────────────────────────────────────────────────────────────────

function LevelCard({
  level,
  index,
  forceOpen,
}: {
  level: AwarenessLevel;
  index: number;
  forceOpen: boolean;
}) {
  const [manualOpen, setManualOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const open = forceOpen || manualOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: open ? level.color + "55" : hovered ? "rgba(255,255,255,0.14)" : "#1e293b",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      id={`level-${level.id}`}
    >
      <button
        onClick={() => setManualOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.06]"
        style={{ background: open ? level.color + "0e" : "transparent" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
          style={{ background: level.color + "18", borderColor: level.color + "44" }}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: level.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-base block">{level.label}</span>
          <p className="text-xs text-slate-500 mt-0.5 truncate pr-4">{level.tagline}</p>
        </div>

        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: `1px solid ${level.color}22` }}>
              {[
                { label: "What they believe",    text: level.whatTheyBelieve   },
                { label: "What message works",   text: level.whatMessageWorks  },
              ].map(({ label, text }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.22, ease: "easeOut" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: level.color }}>
                    {label}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.22, ease: "easeOut" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: level.color }}>
                  What hook types work best
                </p>
                <ul className="space-y-1.5">
                  {level.hookTypes.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <span className="w-1 h-1 rounded-full shrink-0 mt-2" style={{ background: level.color }} />
                      {h}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwarenessLevels() {
  const [selected, setSelected] = useState<string | null>(null);

  function handlePyramidSelect(id: string) {
    setSelected((prev) => (prev === id ? null : id));
    setTimeout(() => {
      document.getElementById(`level-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Awareness Levels</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              The five stages of buyer awareness define how much a prospect knows before they see your ad. Matching your message to their awareness level is one of the highest-leverage decisions in ad creative.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Radio className="w-3.5 h-3.5" />
              5 levels
            </div>
          </div>
        </div>

        {/* Pyramid */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center mb-4">
            Awareness Hierarchy — click a level to expand
          </p>
          <AwarenessPyramid onSelect={handlePyramidSelect} selected={selected} />
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border text-sky-400 bg-sky-500/15 border-sky-500/30">
            The Five Levels
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Cards — rendered Unaware → Most Aware */}
        <div className="space-y-3">
          {LEVELS.map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              index={i}
              forceOpen={selected === level.id}
            />
          ))}
        </div>

        <NextStepBanner
          step="Angle Library"
          title="Choose Your Angle"
          cta="Open Angle Library"
          description="Once you know your audience's awareness level, pick the angle that matches how they're thinking right now."
          href="/angle-library"
          icon={FileText}
          color="#0ea5e9"
        />
      </div>
    </PageTransition>
  );
}
