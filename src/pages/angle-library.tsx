import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Crosshair, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Angle {
  id: string;
  emoji: string;
  label: string;
  summary: string;
  whatItIs: string;
  whenToUse: string;
  whyItWorks: string;
  bestUseCases: string[];
}

const ANGLES: Angle[] = [
  {
    id: "cost-reduction",
    emoji: "💸",
    label: "Cost Reduction",
    summary: "Position the product as a way to save money or replace a more expensive alternative.",
    whatItIs: "The ad frames the product primarily around financial savings — replacing a higher-cost service, eliminating recurring expenses, or delivering better ROI than the current solution. Price contrast is typically front and center.",
    whenToUse: "Use when the audience is spending on an existing solution and the product is meaningfully cheaper or eliminates that spend. Also effective when budget constraints are a primary objection in the purchase decision.",
    whyItWorks: "Loss aversion is more powerful than gain desire. Framing the purchase as stopping a money leak activates a stronger emotional response than framing it as gaining a benefit. The viewer mentally calculates what they are currently wasting.",
    bestUseCases: ["SaaS replacing expensive agencies", "Tools that eliminate subscriptions", "B2B buyers with budget pressure", "Cost-conscious audiences"],
  },
  {
    id: "time-saving",
    emoji: "⏱️",
    label: "Time Saving",
    summary: "Show how the product saves time or eliminates a slow, manual process.",
    whatItIs: "The ad focuses on how the product compresses time — automating a repetitive task, eliminating manual steps, or delivering in minutes what used to take hours or days. Speed and efficiency are the lead value propositions.",
    whenToUse: "Use when the audience is currently doing a task manually or inefficiently and time is a genuine constraint. Strong for productivity tools, automation products, and any offer where fast results are a core differentiator.",
    whyItWorks: "Time is universally valued and felt as a finite resource. When the audience can visualize how many hours they would reclaim, the product stops feeling like a cost and starts feeling like an investment with an obvious return.",
    bestUseCases: ["Productivity and automation tools", "Busy professionals", "Agencies and freelancers", "High-output operators"],
  },
  {
    id: "ease-of-use",
    emoji: "🧩",
    label: "Ease of Use",
    summary: "Emphasize how simple or beginner-friendly the product is to use.",
    whatItIs: "The ad makes the product feel approachable by demonstrating how simple it is to get started and see results. Often contrasts with complex alternatives. Key messages include 'no experience needed', 'set up in minutes', or 'anyone can do this'.",
    whenToUse: "Use when the audience has been intimidated by or has failed with alternatives, when the product category is perceived as complex, or when simplicity is a genuine differentiator in a crowded market.",
    whyItWorks: "Complexity is one of the most common silent objections. When a buyer believes a solution will be hard to learn or implement, they stall on the purchase. Demonstrating simplicity removes that friction before it becomes a reason not to buy.",
    bestUseCases: ["Non-technical audiences", "Competitive categories with steep learning curves", "Products with fast time-to-value", "Consumer tools and apps"],
  },
  {
    id: "fear-risk-avoidance",
    emoji: "🛡️",
    label: "Fear / Risk Avoidance",
    summary: "Lead with a problem, threat, or downside the audience wants to avoid.",
    whatItIs: "The ad opens with or centers on a negative outcome — a risk the audience faces, a mistake they might be making, or a cost of inaction. The product is positioned as the protection or prevention mechanism.",
    whenToUse: "Use when the audience has a clear fear or recognized threat, when the cost of inaction is high, or when the market is already aware of the problem. Particularly effective for insurance, security, compliance, and health products.",
    whyItWorks: "Loss aversion consistently outperforms gain framing in decision-making research. The prospect of losing something already owned or avoiding a bad outcome creates more urgency than the prospect of gaining something new.",
    bestUseCases: ["Security and compliance tools", "Health and wellness products", "Financial protection offers", "High-stakes decisions with real downside"],
  },
  {
    id: "status-upgrade",
    emoji: "🏆",
    label: "Status Upgrade",
    summary: "Position the product as something that elevates the buyer's identity or social standing.",
    whatItIs: "The ad connects the product to an aspirational identity — being seen as a professional, expert, leader, or high-performer. It is less about what the product does and more about who the buyer becomes by using it.",
    whenToUse: "Use for premium products, personal development offers, or anything where the buyer's self-image is tied to the purchase. Works strongly with audiences who are actively working on a professional or personal identity.",
    whyItWorks: "People buy to become the person they want to be. When a product is framed as a marker of a desirable identity rather than a functional tool, the purchase becomes emotionally compelling and resistant to price objections.",
    bestUseCases: ["Premium and luxury products", "Personal development and coaching", "Professional tools and certifications", "High-aspiration audiences"],
  },
  {
    id: "social-proof",
    emoji: "👥",
    label: "Social Proof",
    summary: "Lead with volume, credibility, or community to reduce perceived risk.",
    whatItIs: "The ad foregrounds evidence that other people — ideally people like the viewer — have already made this choice and gotten results. This includes customer counts, testimonials, star ratings, case studies, or community size.",
    whenToUse: "Use when trust is the primary objection, when entering a competitive market where alternatives exist, or when the audience is sophisticated and needs validation before acting. Effective at all funnel stages.",
    whyItWorks: "Uncertainty about a purchase causes hesitation. Social proof transfers the decision-making burden — instead of judging the product independently, the viewer defers to the judgment of people already using it, dramatically reducing perceived risk.",
    bestUseCases: ["New or lesser-known brands", "High-ticket purchases", "Products with strong communities", "Audiences who research before buying"],
  },
  {
    id: "mechanism-reveal",
    emoji: "🔬",
    label: "Mechanism Reveal",
    summary: "Explain the specific reason why this product works when others have failed.",
    whatItIs: "The ad introduces a named mechanism — a proprietary process, unique ingredient, novel method, or specific technical approach — and explains why it produces results. The mechanism is what differentiates the product from generic alternatives.",
    whenToUse: "Use when the audience has tried other solutions that did not work, when the product's results need explanation to be believed, or when the category is saturated and you need a credible reason for differentiation.",
    whyItWorks: "Skeptical audiences demand a reason. When you give them a specific, logical mechanism that explains why something works, it bypasses the 'this sounds like every other ad' objection and creates a framework through which they evaluate and believe the result.",
    bestUseCases: ["Health and supplement products", "Saturated categories", "Products with tried-and-failed audiences", "Premium offers that need justification"],
  },
  {
    id: "transformation",
    emoji: "🔄",
    label: "Transformation",
    summary: "Show the before state and the after state to make the product's impact vivid and concrete.",
    whatItIs: "The ad maps a clear arc from a recognizable painful or mediocre state to a desirable outcome state, with the product as the turning point. The gap between before and after is what creates desire.",
    whenToUse: "Use when the product produces a visible or describable change, when the audience is deeply unhappy with their current state, or when the market responds to narrative rather than feature-led advertising.",
    whyItWorks: "People are motivated by the vision of a better future. The transformation arc works because it activates both the pain of the current state and the desire for the outcome state simultaneously — creating maximum purchase motivation.",
    bestUseCases: ["Health, fitness, and wellness", "Business results and income growth", "Any product with visible outcomes", "Emotionally engaged audiences"],
  },
  {
    id: "speed-instant-result",
    emoji: "⚡",
    label: "Speed / Instant Result",
    summary: "Emphasize how fast the product works or how quickly results appear.",
    whatItIs: "The ad leads with the speed of the outcome — results in minutes, setup in seconds, first win within a day. The core message is that the audience does not have to wait long to experience value.",
    whenToUse: "Use when fast results are genuinely true and are a differentiator, or when impatience or previous long-wait experiences are a known audience pain point. Works particularly well in crowded markets where speed is a competitive edge.",
    whyItWorks: "Delayed gratification is a barrier to commitment. When the audience can see that results are near-immediate, the psychological cost of the purchase drops significantly. Speed also signals product efficacy — if it works fast, it must work.",
    bestUseCases: ["Tools with immediate time-to-value", "Audiences burned by slow results elsewhere", "High-intent buyers who are ready to act", "Short sales cycles"],
  },
  {
    id: "opportunity-growth",
    emoji: "📈",
    label: "Opportunity / Growth",
    summary: "Frame the product around a window of opportunity, market trend, or growth potential.",
    whatItIs: "The ad positions the product relative to a rising trend, an emerging opportunity, or a significant upside that is available now but may not be later. The audience is invited to be early, positioned ahead of the curve, or part of a growing movement.",
    whenToUse: "Use for products in growing markets, when first-mover advantage is real, when the audience is growth-minded and seeks upside, or when there is a credible time-sensitive reason to act now.",
    whyItWorks: "FOMO — fear of missing out — is a reliable motivator when the opportunity feels real. Framing the product as access to a wave that is building activates both ambition and urgency, making inaction feel like a choice to fall behind rather than simply a delay.",
    bestUseCases: ["Emerging technology products", "Investment and financial tools", "Business-building audiences", "Growth-oriented professionals"],
  },
];

// ─── AngleCard ────────────────────────────────────────────────────────────────

const ACCENT = "#a78bfa";

function AngleCard({ angle, index }: { angle: Angle; index: number }) {
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
          {angle.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-base block">{angle.label}</span>
          {!open && (
            <p className="text-xs text-slate-500 mt-0.5 truncate pr-4">
              {angle.summary.slice(0, 90)}…
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
                { label: "What it is",     text: angle.whatItIs   },
                { label: "When to use it", text: angle.whenToUse  },
                { label: "Why it works",   text: angle.whyItWorks },
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
                  {angle.bestUseCases.map((c) => (
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

export default function AngleLibrary() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Angle Library</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              {ANGLES.length} core marketing angles used to frame ads and hooks. Use these when developing creative angles for new campaigns or diagnosing why existing ads resonate.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Crosshair className="w-3.5 h-3.5" />
              {ANGLES.length} angles
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
            Marketing Angles
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {ANGLES.map((angle, i) => (
            <AngleCard key={angle.id} angle={angle} index={i} />
          ))}
        </div>

        <NextStepBanner
          step="Hook Library"
          title="Pair Angles With Hooks"
          cta="Open Hook Library"
          description="Combine your chosen angle with the right hook type to build a complete opening for your ad creative."
          href="/hook-library"
          icon={FileText}
          color="#a78bfa"
        />
      </div>
    </PageTransition>
  );
}
