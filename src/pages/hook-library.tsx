import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Copy, CheckCheck, BookOpen, FileText } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { HOOK_CATEGORIES } from "@/data/hooks";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExampleHook({ text, accent }: { text: string; accent: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="group flex items-start gap-3 rounded-lg px-4 py-3 border bg-[#0f1117] transition-all duration-150 hover:border-white/20"
      style={{ borderColor: "#1e293b" }}
    >
      <span className="text-slate-600 text-xs font-mono mt-0.5 shrink-0 select-none">→</span>
      <p className="text-sm text-slate-200 leading-relaxed flex-1 italic">"{text}"</p>
      <button
        onClick={copy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1.5 rounded-md hover:bg-white/10"
        title="Copy hook"
      >
        {copied
          ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
          : <Copy className="w-3.5 h-3.5 text-slate-400" />
        }
      </button>
    </div>
  );
}

function HookCard({ category, index }: { category: typeof HOOK_CATEGORIES[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ boxShadow: "0 8px 28px rgba(0,0,0,0.35)" }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: open ? category.color + "55" : hovered ? "rgba(255,255,255,0.14)" : "#1e293b",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-white/[0.06]"
        style={{ background: open ? category.color + "0e" : "transparent" }}
      >
        {/* Emoji badge */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border"
          style={{ background: category.color + "18", borderColor: category.color + "44" }}
        >
          {category.emoji}
        </div>

        {/* Label + pill count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-white text-base">{category.label}</span>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ color: category.color, background: category.color + "20" }}
            >
              {category.examples.length} examples
            </span>
          </div>
          {!open && (
            <p className="text-xs text-slate-500 mt-0.5 truncate pr-4">
              {category.description.slice(0, 90)}…
            </p>
          )}
        </div>

        {/* Chevron */}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
        </motion.div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4" style={{ borderTop: `1px solid ${category.color}22` }}>
              {/* Description */}
              <motion.p
                className="text-sm text-slate-400 leading-relaxed pt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0, duration: 0.22, ease: "easeOut" }}
              >
                {category.description}
              </motion.p>

              {/* Divider */}
              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07, duration: 0.22, ease: "easeOut" }}
              >
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: category.color }}>
                  Example Hooks
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </motion.div>

              {/* Examples */}
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.22, ease: "easeOut" }}
              >
                {category.examples.map((ex, i) => (
                  <ExampleHook key={i} text={ex} accent={category.color} />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HookLibrary() {
  const [expandAll, setExpandAll] = useState(false);
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  const allOpen = HOOK_CATEGORIES.every((c) => keys[c.id] !== false && expandAll || keys[c.id] === true);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
              Creative Resource
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Hook Library</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              {HOOK_CATEGORIES.length} proven hook frameworks with explanations and swipe-ready examples. Click any card to expand. Hover an example to copy it.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <BookOpen className="w-3.5 h-3.5" />
              {HOOK_CATEGORIES.length} categories · {HOOK_CATEGORIES.reduce((acc, c) => acc + c.examples.length, 0)} hooks
            </div>
          </div>
        </div>

        {/* Section divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/5" />
          <span
            className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1 rounded-full border"
            style={{ color: "#f59e0b", background: "#f59e0b15", borderColor: "#f59e0b30" }}
          >
            Hook Frameworks
          </span>
          <div className="flex-1 h-px bg-white/5" />
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {HOOK_CATEGORIES.map((category, i) => (
            <HookCard key={category.id} category={category} index={i} />
          ))}
        </div>

        <NextStepBanner
          step="Script Matrix"
          title="Build Your Scripts"
          cta="Open Script Matrix"
          description="Apply your chosen hooks in the Script Matrix to build structured, testable hook + body + CTA combinations."
          href="/script-testing"
          icon={FileText}
          color="#f59e0b"
        />
      </div>
    </PageTransition>
  );
}
