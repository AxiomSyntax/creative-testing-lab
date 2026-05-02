import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";

interface NextStepBannerProps {
  step: string;
  title: string;
  cta: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

export function NextStepBanner({
  step, title, cta, description, href, icon: Icon, color,
}: NextStepBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, type: "spring", stiffness: 280, damping: 26 }}
      className="mt-10"
    >
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{ borderColor: `${color}22` }}
      >
        <div
          className="h-0.5"
          style={{ background: `linear-gradient(to right, ${color}90, ${color}40, transparent)` }}
        />
        <div
          className="px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${color}09 0%, transparent 55%)` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}28` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="text-[9px] font-black uppercase tracking-widest opacity-60"
                style={{ color }}
              >
                Next step
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground/20" />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color }}
              >
                {step}
              </span>
            </div>
            <p className="text-sm font-bold text-white leading-snug">{title}</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5 leading-relaxed max-w-xl">
              {description}
            </p>
          </div>

          <Link href={href} className="shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-150"
              style={{
                background: `${color}18`,
                color,
                border: `1px solid ${color}35`,
              }}
            >
              {cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
