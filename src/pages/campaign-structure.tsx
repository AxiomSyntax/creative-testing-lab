import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Network, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CampaignType {
  id: string;
  label: string;
  badge: string;
  color: string;
  summary: string;
  whatItIs: string;
  whenToUse: string;
  whyItWorks: string;
}

const CAMPAIGN_TYPES: CampaignType[] = [
  {
    id: "testing",
    label: "Testing Campaign",
    badge: "ABO",
    color: "#3b82f6",
    summary: "Test new creatives, hooks, and angles with controlled ad set budgets.",
    whatItIs:
      "A campaign used to test new creatives, hooks, and angles with controlled ad set budgets. Each ad set receives equal budget so no single creative is starved of spend before it has been given a fair chance to perform.",
    whenToUse:
      "When validating new ideas and creative hypotheses. Use it at the start of any creative cycle before you have data to know which angles and formats resonate.",
    whyItWorks:
      "ABO allows individual ad sets to receive equal budget for fair creative testing. Budget control sits at the ad set level so the platform cannot collapse spend into one winner prematurely.",
  },
  {
    id: "scaling",
    label: "Scaling Campaign",
    badge: "CBO",
    color: "#10b981",
    summary: "Distribute budget dynamically across winning ad sets after validating creatives.",
    whatItIs:
      "A campaign where the platform distributes budget dynamically across winning ad sets. Rather than locking each ad set to a fixed daily spend, the algorithm moves money toward whichever combinations are delivering results.",
    whenToUse:
      "After identifying strong creatives in testing. Once you have clear winners from your ABO testing phase, move them into CBO to let the algorithm allocate budget efficiently at scale.",
    whyItWorks:
      "CBO allows the algorithm to push budget toward the best performing combinations. The system can respond to real-time signals faster than manual budget management, compounding the performance of proven creatives.",
  },
  {
    id: "automation",
    label: "Automation Campaign",
    badge: "Advantage+",
    color: "#f59e0b",
    summary: "Platform handles targeting, placement, and optimization for proven creatives at scale.",
    whatItIs:
      "A highly automated campaign type where the platform handles targeting, placement, and optimization. Creative is the primary lever the advertiser controls — the algorithm takes care of everything else.",
    whenToUse:
      "Once proven creatives exist and scaling becomes the main objective. This is most effective after you have already validated your best angles and formats in the testing and scaling phases.",
    whyItWorks:
      "The algorithm can optimize at scale using larger data signals. With more data and fewer manual constraints, the platform finds audiences and placements that manual targeting would miss.",
  },
  {
    id: "retargeting",
    label: "Retargeting Campaign",
    badge: "Retargeting",
    color: "#ef4444",
    summary: "Convert warm audiences who already interacted with the brand.",
    whatItIs:
      "Campaigns targeting users who already interacted with the brand — site visitors, video viewers, engaged social audiences, or abandoned cart users. The creative can be more direct and conversion-focused than cold traffic.",
    whenToUse:
      "To convert warm audiences such as site visitors, video viewers, or engaged users. Run alongside cold traffic campaigns as a way to recapture intent that was not converted on first exposure.",
    whyItWorks:
      "Warm audiences require less persuasion and often convert more efficiently. Because the prospect has already seen the brand, the trust barrier is lower and direct response offers land with less resistance.",
  },
];

interface BudgetModel {
  id: string;
  label: string;
  color: string;
  description: string;
}

const BUDGET_MODELS: BudgetModel[] = [
  {
    id: "abo",
    label: "ABO",
    color: "#3b82f6",
    description:
      "Budget is controlled at the ad set level to ensure equal testing conditions. Each ad set gets a fixed daily spend regardless of performance — ideal for fair creative validation.",
  },
  {
    id: "cbo",
    label: "CBO",
    color: "#10b981",
    description:
      "Budget is managed at the campaign level and automatically distributed across ad sets. The algorithm directs spend toward whichever ad sets are performing best in real time.",
  },
  {
    id: "advantage-plus",
    label: "Advantage+",
    color: "#f59e0b",
    description:
      "Automated campaign type where targeting and optimization are handled primarily by the platform. The advertiser's main input is the creative itself.",
  },
];

// ─── Flow Diagram ─────────────────────────────────────────────────────────────

const MAIN_FLOW_STEPS = [
  { label: "Creative Testing",    sub: "Ideation & hypothesis",        color: "#8b5cf6" },
  { label: "Testing Campaign",    sub: "ABO — equal budget split",     color: "#3b82f6" },
  { label: "Scaling Campaign",    sub: "CBO — dynamic allocation",     color: "#10b981" },
  { label: "Automation Campaign", sub: "Advantage+ — full automation", color: "#f59e0b" },
];

function Arrow() {
  return (
    <div className="flex flex-col items-center py-1 gap-0.5">
      <div className="w-px h-4 bg-white/15" />
      <svg width="12" height="7" viewBox="0 0 12 7" fill="none">
        <path d="M6 7L0 0h12L6 7z" fill="rgba(255,255,255,0.2)" />
      </svg>
    </div>
  );
}

function CampaignFlowDiagram() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-6">
      <p className="text-[10px] font-black uppercase tracking-widest text-center text-slate-500 mb-6">
        Campaign Flow — Creative to Scale
      </p>

      {/* Main prospecting flow */}
      <div className="flex flex-col items-center gap-0">
        {MAIN_FLOW_STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center w-full max-w-xs">
            <div
              className="w-full rounded-lg px-4 py-3 text-center border"
              style={{ borderColor: step.color + "55", background: step.color + "18" }}
            >
              <p className="text-sm font-bold text-white leading-tight">{step.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{step.sub}</p>
            </div>
            {i < MAIN_FLOW_STEPS.length - 1 && <Arrow />}
          </div>
        ))}
      </div>

      {/* Parallel divider */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <div className="flex-1 border-t border-dashed border-white/10" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-2">
          Runs in parallel with prospecting
        </span>
        <div className="flex-1 border-t border-dashed border-white/10" />
      </div>

      {/* Retargeting — parallel, visually offset */}
      <div className="flex justify-center">
        <div
          className="rounded-lg px-4 py-3 text-center border w-full max-w-xs"
          style={{
            borderColor: "#ef444455",
            background: "#ef444412",
            borderStyle: "dashed",
          }}
        >
          <p className="text-sm font-bold text-white leading-tight">Retargeting Campaign</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Warm audience conversion</p>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Type Card ───────────────────────────────────────────────────────

const ACCENT = "#a78bfa";

function CampaignCard({ campaign, index }: { campaign: CampaignType; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-xl border border-white/8 bg-white/3 overflow-hidden"
      style={{ borderColor: open ? campaign.color + "44" : undefined }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/4 transition-colors"
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: campaign.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{campaign.label}</span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{
                color: campaign.color,
                background: campaign.color + "18",
                borderColor: campaign.color + "40",
              }}
            >
              {campaign.badge}
            </span>
          </div>
          {!open && (
            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{campaign.summary}</p>
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
            <div className="px-5 pb-5 pt-4 space-y-4" style={{ borderTop: `1px solid ${campaign.color}22` }}>
              {[
                { label: "What it is",     text: campaign.whatItIs   },
                { label: "When to use it", text: campaign.whenToUse  },
                { label: "Why it works",   text: campaign.whyItWorks },
              ].map(({ label, text }) => (
                <div key={label}>
                  <p
                    className="text-[10px] font-black uppercase tracking-widest mb-1.5"
                    style={{ color: campaign.color }}
                  >
                    {label}
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignStructure() {
  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Campaign Structure</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              How creatives move from testing to scaling within a paid ads campaign structure. Each campaign type serves a distinct role in the creative lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Network className="w-3.5 h-3.5" />
              4 campaign types
            </div>
          </div>
        </div>

        {/* Section 1 — Flow */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Campaign Flow
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <CampaignFlowDiagram />
        </div>

        {/* Section 2 — Campaign Types */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Campaign Types
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="space-y-3">
            {CAMPAIGN_TYPES.map((ct, i) => (
              <CampaignCard key={ct.id} campaign={ct} index={i} />
            ))}
          </div>
        </div>

        {/* Section 3 — Creative Testing Setup */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Creative Testing Setup
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              A typical creative testing campaign is structured to give multiple hypotheses a fair chance simultaneously while keeping budget distribution controlled at the ad set level.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { level: "Campaign",            value: "1 Testing Campaign",       color: "#8b5cf6", indent: 0 },
                { level: "Ad Sets",             value: "5 Ad Sets",                color: "#3b82f6", indent: 1 },
                { level: "Creatives per Ad Set", value: "3–5 Creatives per Ad Set", color: "#10b981", indent: 2 },
              ].map(({ level, value, color, indent }) => (
                <div
                  key={level}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 border"
                  style={{
                    marginLeft: indent * 24,
                    borderColor: color + "44",
                    background: color + "12",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-32 shrink-0">{level}</span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5 — Promotion Rules */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Promotion Rules
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-5 space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              A creative is promoted from the Testing Campaign into the Scaling Campaign when it meets all of the following conditions.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { label: "CPA below target",         sub: "Cost per acquisition is within the acceptable threshold."          },
                { label: "CTR above benchmark",      sub: "Click-through rate meets or exceeds the established baseline."     },
                { label: "Conversion rate stable",   sub: "Conversion rate is consistent across sufficient spend."            },
                { label: "Minimum spend reached",    sub: "The creative has received enough budget to produce reliable data."  },
              ].map(({ label, sub }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-lg border border-white/8 bg-white/3 px-4 py-3"
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: "#10b981" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10b981" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3" style={{ borderColor: "#3b82f633", background: "#3b82f612" }}>
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
              <p className="text-xs text-slate-300 leading-relaxed">
                Creatives that pass all criteria are promoted from the <span className="text-white font-semibold">Testing Campaign</span> into the <span className="text-white font-semibold">Scaling Campaign</span> for broader budget allocation.
              </p>
            </div>

            {/* Scaling Principle */}
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: ACCENT }}>
                Scaling Principle
              </p>
              <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3 space-y-1.5">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Winning creatives should be <span className="text-white font-semibold">duplicated</span> into scaling campaigns rather than moved from the testing campaign.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This preserves the integrity of the testing environment while allowing larger budgets to be deployed in scaling campaigns. Moving a creative out of testing disrupts the ad set's learning history and prevents future comparison against new challengers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6 — Traffic Temperature */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Traffic Temperature
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                label: "Cold Traffic",
                color: "#3b82f6",
                badge: "Prospecting",
                description:
                  "People who have never interacted with the brand. Prospecting campaigns focus on discovery and problem awareness. Messaging must earn attention before making any offer.",
              },
              {
                label: "Warm Traffic",
                color: "#f59e0b",
                badge: "Engaged",
                description:
                  "People who engaged with ads, watched videos, or visited the website. Messaging should focus on solution awareness and social proof. Trust is partially established.",
              },
              {
                label: "Hot Traffic",
                color: "#ef4444",
                badge: "High Intent",
                description:
                  "High-intent users such as add-to-cart visitors or returning customers. Messaging should focus on urgency, proof, and offers. The barrier to conversion is low.",
              },
            ].map(({ label, color, badge, description }) => (
              <div
                key={label}
                className="rounded-xl border bg-white/3 p-4 space-y-2.5"
                style={{ borderColor: color + "33" }}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-sm font-bold text-white">{label}</p>
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ color, background: color + "20" }}
                  >
                    {badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7 — Retargeting Layers */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Retargeting Layers
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                label: "Video View Retargeting",
                color: "#8b5cf6",
                description: "People who watched a large portion of a video ad. High intent signal — they engaged with the creative but did not click through.",
              },
              {
                label: "Website Visitor Retargeting",
                color: "#3b82f6",
                description: "People who visited the landing page but did not convert. They showed interest in the offer but needed more exposure before acting.",
              },
              {
                label: "Add to Cart Retargeting",
                color: "#f59e0b",
                description: "People who started checkout but did not complete the purchase. Highest commercial intent — close to conversion with a small barrier remaining.",
              },
              {
                label: "Customer Upsell",
                color: "#10b981",
                description: "Existing customers shown new offers or upgrades. Lower barrier to purchase — trust is already established and the relationship is warm.",
              },
            ].map(({ label, color, description }) => (
              <div
                key={label}
                className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2"
                style={{ borderColor: color + "33" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <p className="text-sm font-bold text-white">{label}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Structures */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
              style={{ color: ACCENT, background: ACCENT + "15", borderColor: ACCENT + "30" }}
            >
              Budget Structures
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BUDGET_MODELS.map((bm) => (
              <div
                key={bm.id}
                className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2"
                style={{ borderColor: bm.color + "33" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: bm.color }} />
                  <p className="text-sm font-bold text-white">{bm.label}</p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{bm.description}</p>
              </div>
            ))}
          </div>
        </div>

        <NextStepBanner
          step="Awareness Levels"
          title="Match Campaigns to Awareness"
          cta="Open Awareness Levels"
          description="Pair your campaign structure with the right awareness level targeting so your creative message meets the audience where they are."
          href="/awareness-levels"
          icon={FileText}
          color={ACCENT}
        />
      </div>
    </PageTransition>
  );
}
