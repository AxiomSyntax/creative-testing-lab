import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Image, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface AdPattern {
  id: string;
  emoji: string;
  label: string;
  summary: string;
  whatItIs: string;
  whenToUse: string;
  whyItWorks: string;
  bestUseCases: string[];
}

const AD_PATTERNS: AdPattern[] = [
  {
    id: "product-shot",
    emoji: "📸",
    label: "Product Shot",
    summary: "A clean image focused on the product itself, often paired with a short benefit headline.",
    whatItIs: "A high-quality photograph or render of the product against a clean background. The product is the hero — nothing competes with it visually. A short benefit-driven headline or tagline is typically the only copy.",
    whenToUse: "Use when the product itself is visually compelling or when brand recognition is already established. Works well for retargeting, e-commerce, and any product where aesthetics are a core part of the value.",
    whyItWorks: "Simplicity directs attention. When nothing competes with the product, the viewer's eye goes directly to it. A clean shot also signals quality and confidence — brands that show the product plainly are implying it speaks for itself.",
    bestUseCases: ["E-commerce retargeting", "Premium products", "Brand awareness", "Clean aesthetic brands"],
  },
  {
    id: "ui-screenshot",
    emoji: "🖥️",
    label: "UI Screenshot",
    summary: "A screenshot of a software interface or product UI, sometimes annotated to highlight key features.",
    whatItIs: "A cropped or full screenshot of the product's interface, often with callout arrows, highlight boxes, or labels pointing to key features. Shows the product in its actual working state.",
    whenToUse: "Use for SaaS products, apps, or tools where showing the interface is the fastest way to communicate value. Particularly effective for audiences who are already familiar with the product category.",
    whyItWorks: "Software buyers want to know what they're getting before they commit. A real UI screenshot reduces risk perception and answers the 'what does it actually look like?' question instantly, which accelerates trust.",
    bestUseCases: ["SaaS products", "App marketing", "Technical audiences", "Product-aware buyers"],
  },
  {
    id: "infographic",
    emoji: "📊",
    label: "Infographic",
    summary: "A graphic that explains information visually using icons, steps, statistics, or diagrams.",
    whatItIs: "A designed visual that presents information — a process, a comparison, a set of statistics, or a framework — using icons, diagrams, numbered steps, and minimal text. The goal is to make complex information easy to absorb at a glance.",
    whenToUse: "Use when your value proposition requires explanation, when you're educating an audience on a problem or process, or when data is the most compelling part of your argument.",
    whyItWorks: "The brain processes visual information faster than text. An infographic lets you communicate a complex idea in a few seconds that would take a paragraph to explain in writing — dramatically reducing cognitive effort for the viewer.",
    bestUseCases: ["Complex products", "Educational campaigns", "Cold audiences", "Problem awareness"],
  },
  {
    id: "quote-ad",
    emoji: "💬",
    label: "Quote Ad",
    summary: "A strong statement or testimonial presented as a quote to communicate a key insight or belief.",
    whatItIs: "A single powerful quote — from a customer, the founder, an expert, or the brand itself — displayed as the primary visual element. Often uses large typography with minimal supporting design.",
    whenToUse: "Use when you have a genuinely compelling customer result, a provocative brand belief, or a bold claim that works better shown as a direct statement than described in ad copy.",
    whyItWorks: "Quotation marks signal authenticity and directness. A quote format bypasses the defensive filter readers apply to marketing copy because it reads as a personal statement rather than a brand message.",
    bestUseCases: ["Testimonial-based trust building", "Personal brand products", "Mission-driven brands", "Retargeting"],
  },
  {
    id: "comparison-graphic",
    emoji: "⚖️",
    label: "Comparison Graphic",
    summary: "A visual comparison such as 'Old Way vs New Way' or 'Manual vs Automated'.",
    whatItIs: "A two-column or split visual that places two approaches, states, or options side by side. One side represents the inferior or outdated approach, the other represents the product's solution.",
    whenToUse: "Use in competitive markets where the audience is currently using an alternative, or when the product's advantage is most obvious when contrasted with the status quo.",
    whyItWorks: "Comparison reframes the decision from 'should I buy this?' to 'which option is better?' — a far easier cognitive task. Seeing both options simultaneously makes the gap feel larger and the choice feel obvious.",
    bestUseCases: ["SaaS products", "Cost reduction messaging", "Process replacement products", "Products replacing manual workflows"],
  },
  {
    id: "list-ad",
    emoji: "📋",
    label: "List Ad",
    summary: "A structured list such as '3 mistakes founders make' or '5 ways to improve conversions'.",
    whatItIs: "An ad built around a numbered or bulleted list of points — tips, mistakes, reasons, or benefits. The list structure is the visual hook, and the content delivers value or creates curiosity.",
    whenToUse: "Use when you want to educate, create curiosity, or signal expertise. Works well at top of funnel for cold audiences and in feed placements where people are already in a content-consuming mindset.",
    whyItWorks: "Lists create a completion compulsion — once a viewer starts reading, they feel compelled to finish. They also communicate organized thinking, which builds perceived authority and makes the content feel actionable rather than promotional.",
    bestUseCases: ["Cold traffic", "Educational content", "Authority building", "Curiosity-driven campaigns"],
  },
  {
    id: "meme-ad",
    emoji: "😂",
    label: "Meme Ad",
    summary: "An ad using recognizable meme formats or humorous visuals to capture attention.",
    whatItIs: "An ad built around a familiar meme template, internet humor format, or cultural reference. The humor is the hook — the product message is embedded within or immediately after the joke lands.",
    whenToUse: "Use for brand awareness with younger or internet-savvy audiences, or when the brand voice supports a playful tone. Works well in feeds where entertainment value drives engagement.",
    whyItWorks: "Memes carry pre-loaded emotional responses. When the format is already familiar, the brain processes it faster and with less resistance. Humor also lowers guard, making the audience more receptive to the message that follows.",
    bestUseCases: ["Social-first brands", "Younger audiences", "Awareness campaigns", "Scroll-stopping attention plays"],
  },
  {
    id: "visual-metaphor",
    emoji: "🎭",
    label: "Visual Metaphor",
    summary: "A conceptual image representing a problem or idea symbolically.",
    whatItIs: "An image that communicates a concept indirectly through symbolism. For example, a tangled mess of wires to represent disorganized workflows, or a heavy weight on someone's shoulders to represent business stress.",
    whenToUse: "Use when the problem or solution is abstract and difficult to photograph directly, or when you want to create an emotional or conceptual resonance that a literal product shot cannot achieve.",
    whyItWorks: "Metaphors engage the imagination. When a viewer interprets a symbolic image, they actively participate in constructing the meaning — which creates stronger memory encoding and emotional connection than a literal image.",
    bestUseCases: ["Abstract problems", "Awareness campaigns", "Emotional storytelling", "Brand positioning"],
  },
  {
    id: "statistic-ad",
    emoji: "📈",
    label: "Statistic Ad",
    summary: "A visual highlighting a key statistic or data point to create curiosity or authority.",
    whatItIs: "An ad where a single bold number or data point is the primary visual element — e.g. '78% of ads fail in the first 3 seconds' or '$2.4M in revenue generated'. Supporting context is minimal.",
    whenToUse: "Use when you have a compelling number — a result, an industry stat, or a proof point — that creates immediate curiosity or validates the product's value. Works well for cold traffic and authority-building campaigns.",
    whyItWorks: "Specific numbers are more credible than vague claims. A precise statistic signals that the claim is measured and evidence-based, which temporarily overrides skepticism and prompts the viewer to want to understand the context behind the number.",
    bestUseCases: ["Authority building", "Cold traffic", "Data-heavy industries", "Trust-first campaigns"],
  },
  {
    id: "problem-solution",
    emoji: "🔧",
    label: "Problem / Solution Graphic",
    summary: "A visual layout showing the problem and the solution clearly.",
    whatItIs: "A structured two-part visual that presents the problem the audience faces on one side and the product's solution on the other. Uses clear labels, icons, or contrasting design to separate the two states.",
    whenToUse: "Use when your audience is acutely aware of the problem and actively searching for a solution. Particularly effective for products solving a well-defined pain point with a clear mechanism of action.",
    whyItWorks: "The problem-solution structure mirrors how buyers think. They identify a pain, then seek relief. When your ad matches that mental sequence — naming the problem they recognize before presenting your solution — it feels personally relevant rather than generic.",
    bestUseCases: ["Problem-aware audiences", "Direct response campaigns", "Solution-presenting offers", "Clear ROI messaging"],
  },
  {
    id: "carousel-ad",
    emoji: "🎠",
    label: "Carousel Ad",
    summary: "Multiple images in a swipeable sequence used to show steps, features, or comparisons.",
    whatItIs: "A multi-card ad format where the viewer swipes through two to ten individual panels. Each card carries its own image and copy, allowing for a sequential narrative, feature walkthrough, or multi-point argument.",
    whenToUse: "Use to walk through a step-by-step process, showcase multiple product variants or features, build a before-and-after story across frames, or present several proof points in a structured sequence.",
    whyItWorks: "The swipe interaction converts a passive viewer into an active participant. Engagement signals increase with each card swiped, and each panel provides an additional opportunity to capture attention if the first frame did not convert independently.",
    bestUseCases: ["Product catalogues", "Feature showcases", "Educational sequences", "Step-by-step guides"],
  },
];

// ─── AdCard ───────────────────────────────────────────────────────────────────

const ACCENT = "#f59e0b";

function AdCard({ pattern, index }: { pattern: AdPattern; index: number }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: open ? ACCENT + "55" : hovered ? "rgba(255,255,255,0.14)" : "#1e293b",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.06]"
        style={{ background: open ? ACCENT + "0e" : "transparent" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
          style={{ background: ACCENT + "18", borderColor: ACCENT + "44" }}
        >
          {pattern.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-base block">{pattern.label}</span>
          {!open && (
            <p className="text-xs text-slate-500 mt-0.5 truncate pr-4">
              {pattern.summary.slice(0, 90)}…
            </p>
          )}
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
            <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: `1px solid ${ACCENT}22` }}>
              {[
                { label: "What it is",     text: pattern.whatItIs   },
                { label: "When to use it", text: pattern.whenToUse  },
                { label: "Why it works",   text: pattern.whyItWorks },
              ].map(({ label, text }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.22, ease: "easeOut" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: ACCENT }}>
                    {label}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.21, duration: 0.22, ease: "easeOut" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
                  Best Use Cases
                </p>
                <ul className="space-y-1.5">
                  {pattern.bestUseCases.map((c) => (
                    <li key={c} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: ACCENT }} />
                      {c}
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

export default function StaticAdLibrary() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Static Ad Library</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              {AD_PATTERNS.length} static advertising patterns. Recognize them when analyzing competitor creatives or designing new image ads.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Image className="w-3.5 h-3.5" />
              {AD_PATTERNS.length} patterns
            </div>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
            style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
          >
            Static Ad Patterns
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {AD_PATTERNS.map((pattern, i) => (
            <AdCard key={pattern.id} pattern={pattern} index={i} />
          ))}
        </div>

        <NextStepBanner
          step="Competitor Intelligence"
          title="Analyze Competitor Ads"
          cta="Go to Competitors"
          description="Use these patterns to identify and classify static creatives when scanning competitor ads in the research board."
          href="/competitor-intelligence"
          icon={FileText}
          color="#f59e0b"
        />
      </div>
    </PageTransition>
  );
}
