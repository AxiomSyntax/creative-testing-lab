import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Layers, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface FormatItem {
  id: string;
  emoji: string;
  label: string;
  summary: string;
  whatItIs: string;
  whenToUse: string;
  whyItWorks: string;
  bestUseCases: string[];
  color: string;
}

interface FormatSection {
  id: string;
  label: string;
  color: string;
  formats: FormatItem[];
}

const FORMAT_SECTIONS: FormatSection[] = [
  {
    id: "production",
    label: "Production Formats",
    color: "#3b82f6",
    formats: [
      {
        id: "ugc",
        emoji: "📱",
        label: "UGC",
        summary: "Casual creator-style content filmed with a phone that feels authentic and native to social platforms.",
        whatItIs: "User-Generated Content style ads are filmed on a phone in a casual, unpolished way that mimics how real users post on social media. They feature real-looking people in everyday settings.",
        whenToUse: "Use UGC when you want to build trust quickly, test a new offer cheaply, or reach audiences who tune out polished ads. It works especially well at top-of-funnel for cold audiences.",
        whyItWorks: "It bypasses ad skepticism. Because it looks like organic content, viewers lower their guard and engage more naturally with the message before realizing it's an ad.",
        bestUseCases: ["Cold audiences", "Skeptical audiences", "Consumer products", "Problem-aware buyers"],
        color: "#3b82f6",
      },
      {
        id: "talking-head",
        emoji: "🎙️",
        label: "Talking Head",
        summary: "A person speaking directly to the camera explaining a problem or solution.",
        whatItIs: "A single person faces the camera and speaks directly to the viewer. No heavy editing, no b-roll — just direct communication. Can be filmed casually or in a semi-polished setup.",
        whenToUse: "Use when you need to deliver a clear, logical argument or explanation. Best for demonstrating expertise, building trust with a founder or spokesperson, or walking through a specific claim.",
        whyItWorks: "Direct eye contact and one-on-one delivery creates a parasocial connection. The viewer feels addressed personally, which increases persuasiveness and retention.",
        bestUseCases: ["Direct response campaigns", "Expert positioning", "Education-first funnels", "Long-form arguments"],
        color: "#3b82f6",
      },
      {
        id: "studio-ad",
        emoji: "🎬",
        label: "Studio Ad",
        summary: "Professionally produced ad with controlled lighting, polished visuals, and scripted delivery.",
        whatItIs: "A high-production ad shot in a studio or controlled environment with professional lighting, camera work, and scripted, rehearsed delivery. Looks and feels like a traditional TV or brand ad.",
        whenToUse: "Use for brand credibility campaigns, retargeting warm audiences, or when the product itself needs to look premium. Also useful for platforms where polished content performs well.",
        whyItWorks: "Production quality signals brand trust and financial investment. For buyers who are already aware of the product, a polished ad reinforces that the brand is legitimate and credible.",
        bestUseCases: ["High-ticket offers", "Authority positioning", "B2B products", "Complex solutions requiring trust"],
        color: "#3b82f6",
      },
      {
        id: "screen-recording",
        emoji: "🖥️",
        label: "Screen Recording",
        summary: "Screen capture showing software or product usage with narration.",
        whatItIs: "A recording of a computer or phone screen, typically with a voiceover walking the viewer through the product. Common for SaaS, apps, tools, and digital services.",
        whenToUse: "Use when the core value of your product is best seen in action — dashboards, workflows, results inside a tool. Great for software products where showing beats telling.",
        whyItWorks: "It removes abstraction. Instead of claiming a feature exists, the viewer watches it being used in real time, which dramatically reduces doubt and increases purchase intent.",
        bestUseCases: ["SaaS products", "App demos", "Technical audiences", "Product-aware buyers"],
        color: "#3b82f6",
      },
      {
        id: "product-demo",
        emoji: "✨",
        label: "Product Demo",
        summary: "Showing the product in action to demonstrate features or results.",
        whatItIs: "A format centered entirely on demonstrating what the product does and what results it produces. Can be filmed in person, on screen, or as a hybrid of both.",
        whenToUse: "Use when your product's value is immediately visible — physical products, software tools, before/after results. Works across cold and warm traffic.",
        whyItWorks: "Seeing is believing. A well-executed demo answers the buyer's core question — 'will this actually work for me?' — faster than any written or spoken claim.",
        bestUseCases: ["E-commerce", "Physical products", "Feature-heavy software", "Visual results"],
        color: "#3b82f6",
      },
      {
        id: "motion-graphics",
        emoji: "🎨",
        label: "Motion Graphics / Text on Screen",
        summary: "Animated text or motion graphics where the message is delivered primarily through text.",
        whatItIs: "Ads built primarily from animated text, graphics, and visual elements rather than live footage. The message is communicated through what appears on screen, often with music or minimal voiceover.",
        whenToUse: "Use when you need to convey a complex concept quickly, when you lack on-camera talent, or when your brand has a strong visual identity to express. Also strong for silent viewing.",
        whyItWorks: "Text on screen captures attention even when sound is off — the dominant viewing mode on mobile. Motion adds visual energy that keeps the eye engaged through the full message.",
        bestUseCases: ["Silent viewing environments", "Brand awareness", "Mobile-first audiences", "Complex statistics"],
        color: "#3b82f6",
      },
    ],
  },
  {
    id: "narrative",
    label: "Narrative Formats",
    color: "#8b5cf6",
    formats: [
      {
        id: "founder-story",
        emoji: "🌱",
        label: "Founder Story",
        summary: "The founder explains how the product was created and the problem it solves.",
        whatItIs: "The founder or creator of the product speaks directly about why they built it — the personal problem they experienced, the gap they saw, and the solution they created.",
        whenToUse: "Use for new brands building initial trust, products that solve a personal or emotional problem, or any situation where origin story adds credibility to the offer.",
        whyItWorks: "People buy from people. A founder story creates a human connection with the brand and makes the product feel like a mission rather than a transaction, which lowers resistance.",
        bestUseCases: ["New brands", "Mission-driven products", "Trust-building campaigns", "Emotional problem-solving products"],
        color: "#8b5cf6",
      },
      {
        id: "transformation-story",
        emoji: "🔄",
        label: "Transformation Story",
        summary: "A before/after narrative showing how a situation improved after using the product.",
        whatItIs: "A structured narrative that takes the viewer from a relatable before state — pain, struggle, frustration — through the use of the product to a clear after state with results.",
        whenToUse: "Use when your product produces visible or describable results. Particularly powerful for health, fitness, finance, productivity, and business tools.",
        whyItWorks: "The before-after arc is one of the most persuasive structures in storytelling. It gives the viewer a vision of what their life could look like, which makes the offer feel concrete and achievable.",
        bestUseCases: ["Health and fitness", "Financial products", "Career transformation", "Before/after results"],
        color: "#8b5cf6",
      },
      {
        id: "testimonial",
        emoji: "💬",
        label: "Testimonial",
        summary: "A customer sharing their experience and results using the product.",
        whatItIs: "A real or actor-portrayed customer recounts their experience using the product — the problem they had, what they tried, why they chose this product, and the results they got.",
        whenToUse: "Use to overcome skepticism with warm audiences or to add social proof at the middle and bottom of funnel. Works especially well when the testimonial mirrors the target audience closely.",
        whyItWorks: "Social proof is one of the strongest purchase triggers. When a viewer sees someone like them getting a result, it shifts the question from 'could this work?' to 'when do I start?'",
        bestUseCases: ["Middle-of-funnel", "Skeptical audiences", "High-ticket purchases", "Social-proof campaigns"],
        color: "#8b5cf6",
      },
      {
        id: "comparison",
        emoji: "⚖️",
        label: "Comparison",
        summary: "Old way vs new way comparison demonstrating the advantage of the product.",
        whatItIs: "A structured contrast between the traditional or competitor approach (the old way) and what your product offers (the new way). Can be visual, spoken, or text-based.",
        whenToUse: "Use when your audience is currently using an alternative solution and needs a clear reason to switch. Strong in competitive markets or for products that replace an existing behavior.",
        whyItWorks: "Comparison reframes the decision. Instead of asking 'should I buy this?', the viewer is now evaluating 'which option is better?' — a much easier question that favors the new solution.",
        bestUseCases: ["Competitive markets", "Product switching campaigns", "Cost-replacement products", "SaaS vs manual workflows"],
        color: "#8b5cf6",
      },
      {
        id: "split-screen",
        emoji: "↔️",
        label: "Split Screen",
        summary: "Two visuals shown side by side to compare problem vs solution or before vs after.",
        whatItIs: "The screen is divided into two simultaneous panels showing contrasting scenarios — typically the problem on one side and the solution on the other, or before on the left and after on the right.",
        whenToUse: "Use for physical products with visual transformations, apps with clear UI improvements, or any message where the contrast is more powerful when seen simultaneously.",
        whyItWorks: "Simultaneous contrast is more persuasive than sequential contrast. Seeing both states at the same time makes the gap — and therefore the value — feel larger and more immediate.",
        bestUseCases: ["Physical product transformations", "App UI improvements", "A/B-style messaging", "Visual result products"],
        color: "#8b5cf6",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform Style",
    color: "#10b981",
    formats: [
      {
        id: "native-tiktok",
        emoji: "⚡",
        label: "Native TikTok Style",
        summary: "Fast-paced vertical editing style with captions, jump cuts, and pacing designed to feel native to TikTok.",
        whatItIs: "Vertical video edited with fast jump cuts, on-screen captions, trending audio, and a pacing style that mirrors organic TikTok content. Deliberately avoids looking like a traditional ad.",
        whenToUse: "Use for TikTok and Reels placements targeting younger demographics, or any audience that spends significant time consuming short-form social content.",
        whyItWorks: "Platform-native content earns attention because it doesn't trigger the pattern interrupt that makes users scroll past ads. The more it looks like content, the more it gets treated like content.",
        bestUseCases: ["Gen Z audiences", "TikTok and Reels placements", "Brand awareness", "Entertainment-first content"],
        color: "#10b981",
      },
    ],
  },
];

const TOTAL_FORMATS = FORMAT_SECTIONS.reduce((acc, s) => acc + s.formats.length, 0);

// ─── FormatCard ───────────────────────────────────────────────────────────────

function FormatCard({ format, index }: { format: FormatItem; index: number }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

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
        borderColor: open ? format.color + "55" : hovered ? "rgba(255,255,255,0.14)" : "#1e293b",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.06]"
        style={{ background: open ? format.color + "0e" : "transparent" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
          style={{ background: format.color + "18", borderColor: format.color + "44" }}
        >
          {format.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-bold text-white text-base block">{format.label}</span>
          {!open && (
            <p className="text-xs text-slate-500 mt-0.5 truncate pr-4">
              {format.summary.slice(0, 90)}…
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
            <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: `1px solid ${format.color}22` }}>
              {[
                { label: "What it is",     text: format.whatItIs   },
                { label: "When to use it", text: format.whenToUse  },
                { label: "Why it works",   text: format.whyItWorks },
              ].map(({ label, text }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.22, ease: "easeOut" }}
                >
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: format.color }}>
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
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: format.color }}>
                  Best Use Cases
                </p>
                <ul className="space-y-1.5">
                  {format.bestUseCases.map((c) => (
                    <li key={c} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <span className="w-1 h-1 rounded-full shrink-0" style={{ background: format.color }} />
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

export default function FormatLibrary() {
  let globalIndex = 0;

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Format Library</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              {TOTAL_FORMATS} creative format types across {FORMAT_SECTIONS.length} categories. Understand what each format means when selecting formats in Script Matrix or reviewing competitor ads.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Layers className="w-3.5 h-3.5" />
              {FORMAT_SECTIONS.length} sections · {TOTAL_FORMATS} formats
            </div>
          </div>
        </div>

        {/* Sections */}
        {FORMAT_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/5" />
              <span
                className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
                style={{
                  color: section.color,
                  background: section.color + "15",
                  borderColor: section.color + "30",
                }}
              >
                {section.label}
              </span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {section.formats.map((format) => {
              const idx = globalIndex++;
              return <FormatCard key={format.id} format={format} index={idx} />;
            })}
          </div>
        ))}

        <NextStepBanner
          step="Script Matrix"
          title="Build Your Scripts"
          cta="Open Script Matrix"
          description="Use formats when building script variants in the Script Matrix to keep your creative testing structured and comparable."
          href="/script-testing"
          icon={FileText}
          color="#3b82f6"
        />
      </div>
    </PageTransition>
  );
}
