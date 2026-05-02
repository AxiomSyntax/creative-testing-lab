import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { HOOK_TYPES, HOOK_DESC } from "@/data/hooks";
import { AppDropdown } from "@/components/app-dropdown";
import { PageTransition } from "@/components/page-transition";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink, Zap, Target, Video, Star, ImagePlus,
  Plus, Trash2, Pencil, Check, X, Lightbulb, Link as LinkIcon,
  ChevronRight, FlaskConical, Sparkles, ScanEye, Loader2,
  ScanSearch, Activity, ArrowRight, FileText,
} from "lucide-react";
import { NextStepBanner } from "@/components/next-step-banner";
import { motion, AnimatePresence, Variants } from "framer-motion";

// ── ANIMATION ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants  = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

// ── OPTION LISTS ──────────────────────────────────────────────────────────────
const ANGLES      = ["Mechanism Reveal","Time Saving","Cost Reduction","Status Upgrade","Fear + Relief","Transformation Story","Ease of Use","Social Proof"];
const FORMATS     = ["UGC","Founder Story","Product Demo","Screen Recording","Talking Head","Text on Screen","Native TikTok Style","Studio Ad"];
const EMOTIONS    = ["Curiosity","Relief","Fear","Status","Trust","FOMO","Aspiration","Skepticism"];
const CTAS        = ["Start Free Trial","Book a Call","Watch Video","Get Discount","Learn More","Download","Start Now"];
const LONGEVITIES = ["<7 days","7–30 days","30–90 days","90+ days"];
const FORMAT_COLORS  = ["#6366f1","#8b5cf6","#f59e0b","#10b981","#ef4444","#06b6d4","#ec4899","#f97316"];
const HOOK_COLORS    = ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#6366f1","#8b5cf6","#ec4899","#10b981","#f59e0b"];
const EMOTION_COLORS = ["#06b6d4","#10b981","#ef4444","#f97316","#3b82f6","#f59e0b","#8b5cf6","#64748b"];
const CTA_COLORS     = ["#6366f1","#8b5cf6","#f97316","#ef4444","#64748b","#10b981","#06b6d4"];

const ANGLE_DESC: Record<string,string> = {
  "Mechanism Reveal":    "Positions the product around a unique process or mechanism that produces the result.",
  "Time Saving":         "Frames the product as a way to eliminate wasted time and reduce effort.",
  "Cost Reduction":      "Leads with savings, efficiency gains, or cutting unnecessary spend.",
  "Status Upgrade":      "Appeals to the desire to be perceived as successful, elite, or ahead of peers.",
  "Fear + Relief":       "Opens by amplifying a fear, then positions the product as the path to safety.",
  "Transformation Story":"Takes the audience from a painful current state to a desired future outcome.",
  "Ease of Use":         "Removes adoption friction by showing how simple the product is to use.",
  "Social Proof":        "Leads with evidence that others have already achieved results.",
};
const FORMAT_DESC: Record<string,string> = {
  "UGC":                "User-generated style content that feels native, organic, and high-trust.",
  "Founder Story":      "Authentic narrative from the brand founder that builds personal credibility.",
  "Product Demo":       "Direct showcase of what the product does and how it works.",
  "Screen Recording":   "Software or workflow demonstration that shows the tool in real action.",
  "Talking Head":       "Direct-to-camera delivery that creates a conversational, personal feel.",
  "Text on Screen":     "Copy-driven format using on-screen text to deliver the message without a presenter.",
  "Native TikTok Style":"Raw, lo-fi format that mirrors organic TikTok content to reduce ad resistance.",
  "Studio Ad":          "Polished, produced creative with high production value and brand aesthetics.",
};
const EMOTION_DESC: Record<string,string> = {
  "Curiosity":   "Opens with an unexpected claim or gap that encourages viewers to keep watching.",
  "Relief":      "Promises escape from a painful, stressful, or frustrating situation.",
  "Fear":        "Amplifies a risk or consequence to motivate action through avoidance.",
  "Status":      "Taps into the desire to be seen, respected, or admired by others.",
  "Trust":       "Builds confidence through credibility signals, proof, or authority.",
  "FOMO":        "Creates urgency through scarcity, exclusivity, or time-sensitive opportunity.",
  "Aspiration":  "Connects to a positive future identity the audience wants to achieve.",
  "Skepticism":  "Acknowledges doubt upfront to build credibility with a resistant audience.",
};
const CTA_DESC: Record<string,string> = {
  "Start Free Trial": "Low-friction entry point that removes financial risk to increase conversion rate.",
  "Book a Call":      "High-intent CTA that qualifies leads and moves them into a sales conversation.",
  "Watch Video":      "Soft CTA that extends engagement without demanding an immediate decision.",
  "Get Discount":     "Urgency-driven offer that uses price reduction to accelerate action.",
  "Learn More":       "Non-committal CTA suited for cold audiences still in the awareness phase.",
  "Download":         "Delivers immediate value through a resource, lowering the barrier to entry.",
  "Start Now":        "Direct, action-oriented language that reduces hesitation with momentum.",
};

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface CompRow {
  id: string;
  brand: string;
  adLink: string;
  hookType: string;
  angle: string;
  format: string;
  emotion: string;
  cta: string;
  longevity: string;
  notes: string;
  // breakdown panel fields
  screenshot: string;   // data URL
  insight: string;      // strategic insight textarea
  testHook: string;
  testAngle: string;
  testFormat: string;
}

function blank(id: string): CompRow {
  return {
    id, brand:"", adLink:"", hookType:"", angle:"", format:"",
    emotion:"", cta:"", longevity:"", notes:"",
    screenshot:"", insight:"", testHook:"", testAngle:"", testFormat:"",
  };
}

let _uid = 1;
function uid() { return String(_uid++); }

const DEMO_COMP_ROWS: CompRow[] = [
  { id:"demo-1", brand:"Notion",      adLink:"https://www.facebook.com/ads/library", hookType:"Question Hook",  angle:"Ease of Use",         format:"Screen Recording", emotion:"Relief",     cta:"Start Free Trial", longevity:"30–90 days", notes:"Opens by asking if their current tool is slowing them down.", screenshot:"", insight:"", testHook:"", testAngle:"", testFormat:"" },
  { id:"demo-2", brand:"Monday.com",  adLink:"https://www.facebook.com/ads/library", hookType:"Statistic Hook", angle:"Time Saving",          format:"Talking Head",     emotion:"FOMO",       cta:"Book a Call",      longevity:"7–30 days",  notes:"Leads with a stat about hours saved per week.",              screenshot:"", insight:"", testHook:"", testAngle:"", testFormat:"" },
  { id:"demo-3", brand:"ClickUp",     adLink:"https://www.facebook.com/ads/library", hookType:"Negative Hook",  angle:"Cost Reduction",       format:"UGC",              emotion:"Fear",       cta:"Get Discount",     longevity:"90+ days",   notes:"Frames competitors as expensive and feature-limited.",       screenshot:"", insight:"", testHook:"", testAngle:"", testFormat:"" },
  { id:"demo-4", brand:"Asana",       adLink:"https://www.facebook.com/ads/library", hookType:"Curiosity Hook", angle:"Transformation Story", format:"Studio Ad",        emotion:"Aspiration", cta:"Learn More",       longevity:"30–90 days", notes:"Before/after workflow story showing team transformation.",   screenshot:"", insight:"", testHook:"", testAngle:"", testFormat:"" },
];

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function mode(vals: string[]): string | null {
  const nz = vals.filter(Boolean);
  if (!nz.length) return null;
  const f: Record<string,number> = {};
  for (const v of nz) f[v] = (f[v]||0)+1;
  return Object.entries(f).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null;
}
function distribution(options: string[], vals: string[], colors: string[]) {
  const total = vals.filter(Boolean).length;
  return options.map((opt,i) => {
    const count = vals.filter(v=>v===opt).length;
    const pct   = total > 0 ? Math.round((count/total)*100) : 0;
    return { label:opt, count, pct, color: colors[i%colors.length] };
  });
}
function satLabel(n: number): { label: string; color: string } {
  if (n===0) return {label:"—",    color:"#64748b"};
  if (n<=2)  return {label:"Low",  color:"#10b981"};
  if (n<=4)  return {label:"Medium",color:"#f59e0b"};
  return             {label:"High", color:"#ef4444"};
}
function underserved(options: string[], vals: string[]): string {
  const nz = vals.filter(Boolean);
  const f: Record<string,number> = {};
  for (const v of nz) f[v] = (f[v]||0)+1;
  return [...options].sort((a,b)=>(f[a]??0)-(f[b]??0))[0];
}
function underservedData(options: string[], vals: string[], total: number) {
  const nz = vals.filter(Boolean);
  const f: Record<string,number> = {};
  for (const v of nz) f[v] = (f[v]||0)+1;
  const value = [...options].sort((a,b)=>(f[a]??0)-(f[b]??0))[0];
  const count = f[value] ?? 0;
  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
  return { value, count, pct };
}

const SAT_BADGE: Record<string,string> = {
  High:   "bg-red-500/10 text-red-400 border border-red-500/20",
  Medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Low:    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};
const SAT_BAR: Record<string,string> = {
  High:"#ef4444", Medium:"#f59e0b", Low:"#10b981",
};

// ── AUTO-ANALYZE ENGINE ───────────────────────────────────────────────────────
interface AnalysisResult {
  platform: string;
  brand: string;
  adLink: string;
  screenshot: string;
  hookType: string;  hookConf: number;
  angle: string;     angleConf: number;
  format: string;    formatConf: number;
  emotion: string;   emotionConf: number;
  cta: string;       ctaConf: number;
  longevity: string;
  notes: string;
}

function analyzeUrl(url: string, screenshot: string): AnalysisResult {
  const u = url.toLowerCase();

  // Platform detection
  let platform = "Unknown";
  if (u.includes("facebook.com") || u.includes("fb.com") || u.includes("ads/library")) platform = "Meta";
  else if (u.includes("tiktok.com") || u.includes("library.tiktok"))                   platform = "TikTok";
  else if (u.includes("youtube.com") || u.includes("youtu.be"))                        platform = "YouTube";
  else if (u.includes("adstransparency.google.com"))                                   platform = "Google Ads";
  else if (u.includes("spyhero.com"))                                                  platform = "Multi-Platform";
  else if (u.includes("vidtao.com"))                                                   platform = "YouTube";
  else if (u.includes("americanswipe"))                                                platform = "Multi-Platform";

  // Seeded pseudo-random (deterministic per URL so results are stable)
  let seed = url.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0xffffffff; };
  const pick = <T extends string>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const rng  = (base: number) => Math.max(49, Math.min(94, Math.round(base + (rand()-0.5)*22)));

  // Platform-informed format (higher confidence)
  const platformFormat: Record<string,[string,number]> = {
    "TikTok":        ["Native TikTok Style", 87],
    "YouTube":       ["Founder Story",       78],
    "Meta":          ["UGC",                 81],
    "Google Ads":    ["Studio Ad",           74],
    "Multi-Platform":["Product Demo",        70],
    "Unknown":       [pick(FORMATS),         56],
  };
  const [format, formatConf] = platformFormat[platform] ?? platformFormat["Unknown"];

  // Hook heuristics — URL path patterns give light signal
  const likelyQuestion  = u.includes("question") || u.includes("why") || u.includes("how");
  const likelySocial    = u.includes("review") || u.includes("testimonial") || u.includes("social");
  const likelyTransform = u.includes("before") || u.includes("result") || u.includes("success");
  const likelyStat      = u.includes("stat") || u.includes("data") || u.includes("study");
  const hookBias = likelyQuestion  ? "Question Hook"
                 : likelySocial    ? "Story Hook"
                 : likelyTransform ? "Result-Oriented Hook"
                 : likelyStat      ? "Statistic Hook"
                 : pick(HOOK_TYPES);

  const angleBias = likelySocial    ? "Social Proof"
                  : likelyTransform ? "Transformation Story"
                  : pick(ANGLES);

  return {
    platform,
    brand:      "",
    adLink:     url,
    screenshot,
    hookType:   hookBias,   hookConf:   rng(69),
    angle:      angleBias,  angleConf:  rng(64),
    format,                 formatConf,
    emotion:    pick(EMOTIONS), emotionConf: rng(62),
    cta:        pick(CTAS),     ctaConf:     rng(71),
    longevity:  "",
    notes:      `Detected via ${platform} URL pattern.`,
  };
}

const ANALYZE_STEPS = [
  "Reading ad URL...",
  "Detecting platform and brand...",
  "Classifying hook and angle...",
  "Calculating confidence scores...",
];

// ── CONFIDENCE BADGE ──────────────────────────────────────────────────────────
function ConfBadge({ conf }: { conf: number }) {
  const cls = conf >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : conf >= 65 ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            :              "bg-slate-500/10 text-slate-400 border-slate-500/15";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
      {conf}%
    </span>
  );
}

// ── PATTERN SCANNER ───────────────────────────────────────────────────────────
const SCAN_STEPS = [
  "Resolving platform from URL...",
  "Identifying hook structure...",
  "Mapping creative angle and format...",
  "Detecting emotional trigger and CTA...",
];

type ScanState = "input" | "scanning" | "results";

function PatternScanner({ onAdd }: { onAdd: (partial: Partial<CompRow>) => void }) {
  const [scanState,  setScanState]  = useState<ScanState>("input");
  const [url,        setUrl]        = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [stepIdx,    setStepIdx]    = useState(0);
  const [progress,   setProgress]   = useState(0);
  const [result,     setResult]     = useState<AnalysisResult|null>(null);
  const [draft,      setDraft]      = useState<AnalysisResult|null>(null);
  const [added,      setAdded]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function startScan() {
    if (!url.trim()) return;
    setScanState("scanning"); setStepIdx(0); setProgress(0); setAdded(false);
  }

  function reset() {
    setScanState("input"); setStepIdx(0); setProgress(0);
    setResult(null); setDraft(null); setAdded(false);
    setUrl(""); setScreenshot("");
    if (fileRef.current) fileRef.current.value = "";
  }

  useEffect(() => {
    if (scanState !== "scanning") return;
    let cancelled = false;
    const T: ReturnType<typeof setTimeout>[] = [];
    const go = (ms: number, fn: () => void) => T.push(setTimeout(fn, ms));

    go(380,  () => { setStepIdx(0); setProgress(18); });
    go(750,  () => { setProgress(35); });
    go(1050, () => { setStepIdx(1); setProgress(52); });
    go(1380, () => { setProgress(70); });
    go(1680, () => { setStepIdx(2); setProgress(82); });
    go(1980, () => { setStepIdx(3); setProgress(95); });

    const MIN_MS = 2350;
    const apiCall = fetch("/api/scan-creative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, screenshot }),
    }).then(r => r.json());

    Promise.all([apiCall, new Promise<void>(resolve => setTimeout(resolve, MIN_MS))])
      .then(([data]) => {
        if (cancelled) return;
        const r: AnalysisResult = {
          platform: data.platform ?? "Unknown", brand: data.brand ?? "",
          adLink: url, screenshot,
          hookType: data.hookType,  hookConf:    data.hookConf,
          angle:    data.angle,     angleConf:   data.angleConf,
          format:   data.format,    formatConf:  data.formatConf,
          emotion:  data.emotion,   emotionConf: data.emotionConf,
          cta:      data.cta,       ctaConf:     data.ctaConf,
          longevity: "", notes: data.notes ?? "",
        };
        setResult(r); setDraft({ ...r }); setProgress(100);
        setTimeout(() => setScanState("results"), 250);
      })
      .catch(() => {
        if (cancelled) return;
        const r = analyzeUrl(url, screenshot);
        setResult(r); setDraft({ ...r }); setProgress(100);
        setTimeout(() => setScanState("results"), 250);
      });

    return () => { cancelled = true; T.forEach(clearTimeout); };
  }, [scanState]);

  function upd(field: keyof AnalysisResult, value: string) {
    setDraft(d => d ? {...d,[field]:value} : d);
  }

  function handleAdd() {
    if (!draft) return;
    onAdd({
      brand:draft.brand, adLink:draft.adLink, screenshot:draft.screenshot,
      hookType:draft.hookType, angle:draft.angle, format:draft.format,
      emotion:draft.emotion, cta:draft.cta, longevity:draft.longevity, notes:draft.notes,
    });
    setAdded(true);
  }

  const FIELD_DEFS = [
    { label:"Hook Type",         field:"hookType" as const, options:HOOK_TYPES, color:"#8b5cf6" },
    { label:"Primary Angle",     field:"angle"    as const, options:ANGLES,     color:"#6366f1" },
    { label:"Creative Format",   field:"format"   as const, options:FORMATS,    color:"#f59e0b" },
    { label:"Emotional Trigger", field:"emotion"  as const, options:EMOTIONS,   color:"#ec4899" },
    { label:"CTA Style",         field:"cta"      as const, options:CTAS,       color:"#06b6d4" },
  ];

  const confMap: Record<string,number> = result
    ? { hookType:result.hookConf, angle:result.angleConf, format:result.formatConf, emotion:result.emotionConf, cta:result.ctaConf }
    : {};

  return (
    <div className="flex flex-col gap-4">

      {/* Input card */}
      <Card className="border-white/10 bg-card/50 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-primary/60 via-violet-500/30 to-transparent" />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">

            {/* URL input */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ad Link *</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  className="w-full bg-background/60 border border-white/10 rounded-lg pl-8 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                  placeholder="Paste a Meta, TikTok, YouTube, or Google Ads URL..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && startScan()}
                  disabled={scanState === "scanning"}
                />
              </div>
            </div>

            {/* Screenshot upload */}
            <div className="shrink-0 flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Screenshot <span className="font-normal normal-case tracking-normal text-muted-foreground/50">(optional)</span>
              </label>
              {screenshot ? (
                <div className="relative group w-fit">
                  <img src={screenshot} alt="" className="w-14 h-10 object-cover rounded-md border border-white/10" />
                  <button onClick={() => { setScreenshot(""); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-background border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  ><X className="w-2.5 h-2.5 text-foreground" /></button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-dashed border-white/12 bg-white/[0.02] hover:border-white/22 hover:bg-white/[0.04] transition-all text-xs text-muted-foreground/60 hover:text-muted-foreground h-10"
                ><ImagePlus className="w-3.5 h-3.5" />Upload</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
            </div>

            {/* Scan button */}
            <motion.div whileHover={{scale:1.02}} whileTap={{scale:0.97}} className="shrink-0 self-end">
              <Button
                onClick={startScan}
                disabled={!url.trim() || scanState === "scanning"}
                className="gap-2 h-10 px-5 bg-primary/90 hover:bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/15 disabled:opacity-40"
              >
                {scanState === "scanning"
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ScanSearch className="w-3.5 h-3.5" />
                }
                {scanState === "scanning" ? "Scanning..." : "Scan Creative"}
              </Button>
            </motion.div>

          </div>
        </CardContent>
      </Card>

      {/* Scanner animation / Results */}
      <AnimatePresence mode="wait">

        {/* ── SCANNING STATE ── */}
        {scanState === "scanning" && (
          <motion.div key="scanning"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            transition={{duration:0.28}}
          >
            <Card className="border-primary/15 bg-primary/[0.025] overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-primary via-violet-500/60 to-cyan-500/40" />
              <CardContent className="pt-10 pb-10">
                <div className="flex flex-col items-center gap-7 max-w-sm mx-auto">

                  {/* Animated rings */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <ScanSearch className="w-7 h-7 text-primary" />
                    </div>
                    <motion.div animate={{rotate:360}} transition={{duration:1.8,repeat:Infinity,ease:"linear"}}
                      className="absolute -inset-2 rounded-[22px] border-2 border-transparent border-t-primary/50 border-r-primary/20"
                    />
                    <motion.div animate={{rotate:-360}} transition={{duration:3,repeat:Infinity,ease:"linear"}}
                      className="absolute -inset-4 rounded-[28px] border border-primary/10"
                    />
                  </div>

                  {/* Progress */}
                  <div className="w-full flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">Scanning creative patterns...</p>
                      <span className="text-xs font-mono text-primary tabular-nums">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary via-violet-400 to-cyan-400"
                        animate={{width:`${progress}%`}} transition={{duration:0.4,ease:"easeOut"}}
                      />
                    </div>

                    {/* Detection steps */}
                    <div className="flex flex-col gap-2 mt-1">
                      {SCAN_STEPS.map((label, i) => (
                        <div key={label} className={`flex items-center gap-2.5 py-1 px-2.5 rounded-lg transition-all duration-300 ${
                          i < stepIdx  ? "bg-emerald-500/5"
                        : i === stepIdx ? "bg-primary/8"
                        : "opacity-35"}`}
                        >
                          {i < stepIdx
                            ? <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-emerald-400" /></div>
                            : i === stepIdx
                            ? <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                            : <div className="w-4 h-4 rounded-full border border-white/10 shrink-0" />
                          }
                          <span className={`text-xs ${i <= stepIdx ? "text-foreground/80 font-medium" : "text-muted-foreground/50"}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── RESULTS STATE ── */}
        {scanState === "results" && draft && (
          <motion.div key="results"
            initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            transition={{duration:0.32}}
          >
            <Card className="border-emerald-500/20 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
              <CardContent className="pt-5 pb-5 flex flex-col gap-5">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/15 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">AI Suggested Patterns</p>
                      <p className="text-xs text-emerald-400/70">AI suggestions based on the ad content. Review and adjust before adding to the research board.</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{draft.platform}
                  </span>
                </div>

                {/* Pattern grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {FIELD_DEFS.map(({ label, field, options, color }) => {
                    const conf = confMap[field] ?? 60;
                    const val  = draft[field];
                    return (
                      <div key={field}
                        className="rounded-xl border border-white/5 bg-background/40 p-3 flex flex-col gap-2 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70 leading-tight">{label}</p>
                          <ConfBadge conf={conf} />
                        </div>
                        {val && (
                          <span className="inline-flex w-fit px-2 py-0.5 rounded-md text-[10px] font-semibold border leading-snug"
                            style={{background:`${color}15`,color,borderColor:`${color}30`}}
                          >{val}</span>
                        )}
                        {/* Confidence bar */}
                        <div className="h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{background:color,opacity:0.45}}
                            initial={{width:0}} animate={{width:`${conf}%`}} transition={{duration:0.75,ease:[0.22,1,0.36,1]}}
                          />
                        </div>
                        {/* Editable select */}
                        <FieldSelect
                          value={draft[field]}
                          onChange={v => upd(field, v)}
                          options={[...options]}
                          placeholder={`Edit...`}
                          color={color}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Brand + longevity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand Name</label>
                    <input
                      className="w-full bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 transition-colors"
                      placeholder="Enter brand name..."
                      value={draft.brand}
                      onChange={e => upd("brand", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ad Longevity</label>
                    <FieldSelect
                      value={draft.longevity}
                      onChange={v => upd("longevity", v)}
                      options={LONGEVITIES}
                      placeholder="Select longevity..."
                      color="#64748b"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 flex-wrap gap-3">
                  <button onClick={reset}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    <ChevronRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                    Scan another
                  </button>
                  <div className="flex items-center gap-3">
                    <AnimatePresence>
                      {added && (
                        <motion.span initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0}}
                          className="text-xs text-emerald-400 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />Added to board
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={added}
                      className="gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-default"
                    >
                      {added ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      {added ? "Added!" : "Add to Research Board"}
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── STATIC DATA ───────────────────────────────────────────────────────────────
const AD_TOOLS = [
  { name:"Meta Ads Library",        url:"https://www.facebook.com/ads/library",  icon:"📘", description:"Discover long-running Meta ads and identify proven creative angles at scale." },
  { name:"TikTok Ads Library",      url:"https://library.tiktok.com/ads/",       icon:"🎵", description:"Analyze viral short-form creatives and hook patterns driving TikTok growth." },
  { name:"Google Ads Transparency", url:"https://adstransparency.google.com/",   icon:"🔍", description:"Search and monitor active Google ad campaigns across the web and YouTube." },
  { name:"Google Labs",             url:"https://labs.google.com",               icon:"🧪", description:"Explore experimental Google tools for emerging ad formats and AI research." },
  { name:"SpyHero",                 url:"https://app.spyhero.com",               icon:"🕵️", description:"Competitor ad spy tool for identifying scaling campaigns before they peak." },
  { name:"VidTao",                  url:"https://www.vidtao.com",                icon:"▶️", description:"YouTube ad intelligence platform for analyzing long-form video ad performance." },
  { name:"American Swipe",          url:"https://www.americanswipe.app/",        icon:"🗂️", description:"Creative swipe file for studying proven ad concepts and copy structures." },
];

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function SH({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold tracking-tight mb-1">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
function EmptyInsights() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Lightbulb className="w-5 h-5 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground/60 max-w-xs leading-relaxed">
        Add competitor ads to the research board to generate market insights.
      </p>
    </div>
  );
}

const inputCls  = "w-full bg-background/60 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors";
const panelInputCls = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/15 transition-colors resize-none leading-relaxed";

// Compact select used inside the Research Board table rows
function Sel({ value, onChange, options, placeholder }: {
  value:string; onChange:(v:string)=>void; options:string[]; placeholder:string;
}) {
  return <AppDropdown value={value} onChange={onChange} options={options} placeholder={placeholder} size="sm" />;
}

// Larger modal select with color tint + custom chevron
function FieldSelect({ value, onChange, options, placeholder, color = "#8b5cf6", size = "md" }: {
  value: string; onChange: (v: string) => void; options: string[];
  placeholder: string; color?: string; size?: "sm" | "md";
}) {
  return <AppDropdown value={value} onChange={onChange} options={options} placeholder={placeholder} color={color} size={size} />;
}

// ── CREATIVE BREAKDOWN PANEL ──────────────────────────────────────────────────
function BreakdownField({ label, value, description, color = "#8b5cf6" }: {
  label: string; value: string; description?: string; color?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {value ? (
        <>
          <span className="inline-flex w-fit px-2.5 py-1 rounded-md text-xs font-semibold border"
            style={{ background:`${color}15`, color, borderColor:`${color}30` }}
          >{value}</span>
          {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
        </>
      ) : (
        <p className="text-xs text-muted-foreground/40 italic">Not set</p>
      )}
    </div>
  );
}

interface PanelProps {
  row: CompRow;
  onClose: () => void;
  onUpdate: (fields: Partial<CompRow>) => void;
}

function CreativeBreakdown({ row, onClose, onUpdate }: PanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localNotes, setLocalNotes] = useState(row.notes ?? "");
  useEffect(() => { setLocalNotes(row.notes ?? ""); }, [row.id]);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdate({ screenshot: ev.target?.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full md:w-[500px] z-50 flex flex-col bg-[#0c0c11] border-l border-white/10 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
              <ScanEye className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Creative Breakdown</p>
              <p className="text-sm font-semibold text-foreground leading-tight">{row.brand || "Unnamed Ad"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-7">

          {/* Ad Overview */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <p className="text-sm font-bold text-foreground">Ad Overview</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Brand",       value: row.brand     },
                { label: "Ad Longevity",value: row.longevity },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value || <span className="text-muted-foreground/40 font-normal text-xs">—</span>}</p>
                </div>
              ))}
              {row.adLink && (
                <div className="col-span-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ad Link</p>
                  <a href={row.adLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 transition-colors font-medium"
                  >
                    <LinkIcon className="w-3 h-3" />{row.adLink.length > 50 ? row.adLink.slice(0,50)+"…" : row.adLink}
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Creative Preview */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-violet-500" />
              <p className="text-sm font-bold text-foreground">Creative Preview</p>
            </div>
            {row.screenshot ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 group">
                <img src={row.screenshot} alt="Ad screenshot" className="w-full object-cover max-h-64" />
                <button
                  onClick={() => { onUpdate({ screenshot:"" }); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all py-10 flex flex-col items-center gap-2.5"
              >
                <ImagePlus className="w-7 h-7 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground/60">Click to upload ad screenshot</p>
                <p className="text-[10px] text-muted-foreground/40">PNG, JPG, WebP supported</p>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </section>

          {/* Field analysis */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <p className="text-sm font-bold text-foreground">Creative Analysis</p>
            </div>
            <div className="flex flex-col gap-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <BreakdownField label="Hook Type"        value={row.hookType} description={HOOK_DESC[row.hookType]}   color="#8b5cf6" />
              <div className="h-px bg-white/5" />
              <BreakdownField label="Primary Angle"    value={row.angle}    description={ANGLE_DESC[row.angle]}     color="#6366f1" />
              <div className="h-px bg-white/5" />
              <BreakdownField label="Creative Format"  value={row.format}   description={FORMAT_DESC[row.format]}   color="#f59e0b" />
              <div className="h-px bg-white/5" />
              <BreakdownField label="Emotional Trigger"value={row.emotion}  description={EMOTION_DESC[row.emotion]} color="#ec4899" />
              <div className="h-px bg-white/5" />
              <BreakdownField label="CTA Strategy"     value={row.cta}      description={CTA_DESC[row.cta]}         color="#06b6d4" />
            </div>
          </section>

          {/* Strategic Insight */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-bold text-foreground">Strategic Insight</p>
                <p className="text-xs text-muted-foreground mt-0.5">Why this ad works, what pattern it follows, and how it could be improved or tested.</p>
              </div>
            </div>
            <textarea
              rows={5}
              className={panelInputCls}
              placeholder="What makes this ad work? What pattern does it follow? How would you improve it? What would you test?"
              value={row.insight}
              onChange={e => onUpdate({ insight: e.target.value })}
            />
          </section>

          {/* Testing Opportunity */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-cyan-500" />
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
                  Testing Opportunity
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Define alternative angles, hooks, and formats to test against this ad.</p>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4 flex flex-col gap-4">
              {[
                { label:"Alternative Hook",   field:"testHook" as const,   options: HOOK_TYPES,  ph:"Pick an alternative hook..."  },
                { label:"Alternative Angle",  field:"testAngle" as const,  options: ANGLES,      ph:"Pick an alternative angle..." },
                { label:"Alternative Format", field:"testFormat" as const, options: FORMATS,     ph:"Pick an alternative format..."},
              ].map(({ label, field, options, ph }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{label}</p>
                  <FieldSelect
                    value={row[field]}
                    onChange={v => onUpdate({ [field]: v })}
                    options={[...options]}
                    placeholder={ph}
                    color="#06b6d4"
                  />
                  {row[field] && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="w-3 h-3 text-cyan-400/60 shrink-0" />
                      <p className="text-xs text-cyan-400/60">
                        {field==="testHook"   && HOOK_DESC[row[field]]}
                        {field==="testAngle"  && ANGLE_DESC[row[field]]}
                        {field==="testFormat" && FORMAT_DESC[row[field]]}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section className="flex flex-col gap-2 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Research Notes</p>
            <textarea
              className={panelInputCls}
              rows={4}
              value={localNotes}
              placeholder="Add research notes..."
              onChange={e => setLocalNotes(e.target.value)}
              onBlur={e => onUpdate({ notes: e.target.value })}
            />
          </section>

        </div>
      </motion.div>
    </>
  );
}

// ── RESEARCH BOARD ────────────────────────────────────────────────────────────
interface BoardProps {
  rows: CompRow[];
  setRows: React.Dispatch<React.SetStateAction<CompRow[]>>;
  onRowClick: (id: string) => void;
  selectedRowId: string | null;
  isDemo?: boolean;
}

function ResearchBoard({ rows, setRows, onRowClick, selectedRowId, isDemo }: BoardProps) {
  const [editingId, setEditingId] = useState<string|null>(null);
  const [draft,     setDraft]     = useState<CompRow|null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newRow,    setNewRow]    = useState<CompRow>(blank(uid()));

  function startEdit(e: React.MouseEvent, row: CompRow) {
    e.stopPropagation();
    setEditingId(row.id); setDraft({...row});
  }
  function cancelEdit() { setEditingId(null); setDraft(null); }
  function saveEdit() {
    if (!draft) return;
    setRows(prev=>prev.map(r=>r.id===draft.id?draft:r));
    setEditingId(null); setDraft(null);
  }
  function deleteRow(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setRows(prev=>prev.filter(r=>r.id!==id));
    if (editingId===id) { setEditingId(null); setDraft(null); }
  }
  function saveNew() {
    setRows(prev=>[...prev, {...newRow, id:uid()}]);
    setNewRow(blank(uid())); setAddingNew(false);
  }
  function cancelNew() { setNewRow(blank(uid())); setAddingNew(false); }

  const pd = (f:keyof CompRow, v:string) => setDraft(d=>d?{...d,[f]:v}:d);
  const pn = (f:keyof CompRow, v:string) => setNewRow(r=>({...r,[f]:v}));

  const COLS = [
    { label:"Brand",             cls:"text-foreground/70",  w:"min-w-[120px]" },
    { label:"Ad Link",           cls:"text-blue-400/70",    w:"min-w-[72px]"  },
    { label:"Hook Type",         cls:"text-violet-400/70",  w:"min-w-[160px]" },
    { label:"Primary Angle",     cls:"text-indigo-400/70",  w:"min-w-[160px]" },
    { label:"Creative Format",   cls:"text-amber-400/70",   w:"min-w-[150px]" },
    { label:"Emotional Trigger", cls:"text-pink-400/70",    w:"min-w-[145px]" },
    { label:"CTA Style",         cls:"text-cyan-400/70",    w:"min-w-[140px]" },
    { label:"Ad Longevity",      cls:"text-foreground/50",  w:"min-w-[115px]" },
    { label:"Notes",             cls:"text-foreground/50",  w:"min-w-[180px]" },
    { label:"",                  cls:"",                    w:"w-[110px]"     },
  ];

  function RowDisplay({ row }: { row: CompRow }) {
    const isEditing  = editingId === row.id;
    const isSelected = selectedRowId === row.id;
    const d = isEditing ? (draft ?? row) : row;
    return (
      <motion.tr layout
        initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
        transition={{duration:0.22}}
        onClick={() => !isEditing && onRowClick(row.id)}
        className={`border-b border-white/5 last:border-0 transition-colors group cursor-pointer
          ${isEditing  ? "bg-primary/[0.04]"  : ""}
          ${isSelected ? "bg-primary/[0.06] border-l-2 border-l-primary/40" : "hover:bg-white/[0.025]"}
        `}
      >
        <td className="px-3 py-2.5 min-w-[120px]">
          {isEditing
            ? <input className={inputCls} value={d.brand} onChange={e=>pd("brand",e.target.value)} placeholder="Brand name" onClick={e=>e.stopPropagation()} />
            : <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground/90">{row.brand || <span className="text-muted-foreground/30 italic text-xs">—</span>}</span>
                {isDemo && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20">Example</span>}
                {isSelected && !isDemo && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </div>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[72px]">
          {isEditing
            ? <input className={inputCls} value={d.adLink} onChange={e=>pd("adLink",e.target.value)} placeholder="https://..." onClick={e=>e.stopPropagation()} />
            : row.adLink
              ? <a href={row.adLink} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors">
                  <LinkIcon className="w-3 h-3"/>View
                </a>
              : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[160px]">
          {isEditing
            ? <Sel value={d.hookType} onChange={v=>pd("hookType",v)} options={HOOK_TYPES} placeholder="Hook Type" />
            : row.hookType
              ? <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-violet-500/10 text-violet-400 border border-violet-500/15">{row.hookType}</span>
              : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[160px]">
          {isEditing
            ? <Sel value={d.angle} onChange={v=>pd("angle",v)} options={ANGLES} placeholder="Angle" />
            : row.angle ? <span className="text-xs text-indigo-300/80">{row.angle}</span> : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[150px]">
          {isEditing
            ? <Sel value={d.format} onChange={v=>pd("format",v)} options={FORMATS} placeholder="Format" />
            : row.format
              ? <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-400 border border-amber-500/15">{row.format}</span>
              : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[145px]">
          {isEditing
            ? <Sel value={d.emotion} onChange={v=>pd("emotion",v)} options={EMOTIONS} placeholder="Trigger" />
            : row.emotion ? <span className="text-xs text-pink-400/80">{row.emotion}</span> : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[140px]">
          {isEditing
            ? <Sel value={d.cta} onChange={v=>pd("cta",v)} options={CTAS} placeholder="CTA" />
            : row.cta
              ? <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">{row.cta}</span>
              : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[115px]">
          {isEditing
            ? <Sel value={d.longevity} onChange={v=>pd("longevity",v)} options={LONGEVITIES} placeholder="Longevity" />
            : row.longevity ? <span className="text-xs text-muted-foreground">{row.longevity}</span> : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 min-w-[180px]">
          {isEditing
            ? <input className={inputCls} value={d.notes} onChange={e=>pd("notes",e.target.value)} placeholder="Notes..." onClick={e=>e.stopPropagation()} />
            : row.notes ? <span className="text-xs text-muted-foreground line-clamp-2">{row.notes}</span> : <span className="text-muted-foreground/30 text-xs">—</span>
          }
        </td>
        <td className="px-3 py-2.5 w-[110px]">
          {!isDemo && (isEditing
            ? <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}>
                <button onClick={saveEdit}   className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"><Check className="w-3 h-3"/></button>
                <button onClick={cancelEdit} className="p-1.5 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"><X className="w-3 h-3"/></button>
              </div>
            : <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e=>startEdit(e,row)}    className="p-1.5 rounded-md bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"><Pencil className="w-3 h-3"/></button>
                <button onClick={e=>deleteRow(e,row.id)} className="p-1.5 rounded-md bg-red-500/5 text-red-400/50 hover:text-red-400 hover:bg-red-500/15 transition-colors"><Trash2 className="w-3 h-3"/></button>
              </div>
          )}
        </td>
      </motion.tr>
    );
  }

  return (
    <Card className="border-white/10 bg-card/50 overflow-hidden shadow-2xl">
      <div className="h-0.5 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-0">
          <p className="text-xs text-muted-foreground/50">Click any row to open the Creative Breakdown panel.</p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.025]">
              {COLS.map(({label,cls,w})=>(
                <th key={label} className={`px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${cls} ${w}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {rows.map(row=><RowDisplay key={row.id} row={row} />)}
            </AnimatePresence>
            <AnimatePresence>
              {addingNew && (
                <motion.tr key="new" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                  transition={{duration:0.22}} className="border-b border-white/5 bg-primary/[0.04]"
                >
                  <td className="px-3 py-2.5 min-w-[120px]"><input className={inputCls} value={newRow.brand}    onChange={e=>pn("brand",e.target.value)}    placeholder="Brand name" autoFocus /></td>
                  <td className="px-3 py-2.5 min-w-[72px]"> <input className={inputCls} value={newRow.adLink}   onChange={e=>pn("adLink",e.target.value)}   placeholder="https://..." /></td>
                  <td className="px-3 py-2.5 min-w-[160px]"><Sel value={newRow.hookType} onChange={v=>pn("hookType",v)} options={HOOK_TYPES} placeholder="Hook Type" /></td>
                  <td className="px-3 py-2.5 min-w-[160px]"><Sel value={newRow.angle}    onChange={v=>pn("angle",v)}    options={ANGLES}     placeholder="Angle" /></td>
                  <td className="px-3 py-2.5 min-w-[150px]"><Sel value={newRow.format}   onChange={v=>pn("format",v)}   options={FORMATS}    placeholder="Format" /></td>
                  <td className="px-3 py-2.5 min-w-[145px]"><Sel value={newRow.emotion}  onChange={v=>pn("emotion",v)}  options={EMOTIONS}   placeholder="Trigger" /></td>
                  <td className="px-3 py-2.5 min-w-[140px]"><Sel value={newRow.cta}      onChange={v=>pn("cta",v)}      options={CTAS}       placeholder="CTA" /></td>
                  <td className="px-3 py-2.5 min-w-[115px]"><Sel value={newRow.longevity}onChange={v=>pn("longevity",v)}options={LONGEVITIES} placeholder="Longevity" /></td>
                  <td className="px-3 py-2.5 min-w-[180px]"><input className={inputCls} value={newRow.notes}    onChange={e=>pn("notes",e.target.value)}    placeholder="Notes..." /></td>
                  <td className="px-3 py-2.5 w-[80px]">
                    <div className="flex items-center gap-1">
                      <button onClick={saveNew}   className="p-1.5 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"><Check className="w-3 h-3"/></button>
                      <button onClick={cancelNew} className="p-1.5 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"><X className="w-3 h-3"/></button>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
            {rows.length===0 && !isDemo && !addingNew && (
              <tr>
                <td colSpan={10} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-foreground/60">No competitor ads logged yet</p>
                    <p className="text-xs text-muted-foreground/50 max-w-xs">Use the Ad Research Tools above to find competitor ads, then log them here to generate market insights.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <p className="text-xs text-muted-foreground/40">{`${rows.length} competitor ad${rows.length!==1?"s":""} logged`}</p>
        {!addingNew && (
          <Button size="sm" variant="outline"
            className="gap-1.5 text-xs border-white/10 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all"
            onClick={()=>{setAddingNew(true);setEditingId(null);setDraft(null);}}
          >
            <Plus className="w-3.5 h-3.5"/> Add Row
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function CompetitorIntelligence() {
  const { projectKey } = useProject();
  const [, navigate] = useLocation();
  const [rows,             setRows]            = useLocalStorage<CompRow[]>(projectKey("competitors:rows"), []);
  const [selectedRowId,    setSelectedRowId]   = useState<string|null>(null);

  const isDemo      = false;
  const displayRows = rows;

  function addAnalyzedRow(partial: Partial<CompRow>) {
    const id = uid();
    setRows(prev => [...prev, { ...blank(id), ...partial, id }]);
  }

  const selectedRow = displayRows.find(r=>r.id===selectedRowId) ?? null;

  function updateRow(fields: Partial<CompRow>) {
    if (!selectedRowId) return;
    setRows(prev=>prev.map(r=>r.id===selectedRowId ? {...r,...fields} : r));
  }

  // ── live analytics ────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const hooks   = displayRows.map(r=>r.hookType);
    const angles  = displayRows.map(r=>r.angle);
    const formats = displayRows.map(r=>r.format);
    const emos    = displayRows.map(r=>r.emotion);
    const ctas    = displayRows.map(r=>r.cta);
    const total   = displayRows.length;

    const angleDist = ANGLES.map(angle => {
      const count = displayRows.filter(r=>r.angle===angle).length;
      const pct   = total>0 ? Math.round((count/total)*100) : 0;
      const level = pct>=50?"High": pct>=20?"Medium":"Low";
      return { angle, count, pct, level, opportunity: pct<20 && total>0 };
    }).sort((a,b)=>b.pct-a.pct);

    const formatDist = distribution(FORMATS, formats, FORMAT_COLORS)
      .sort((a,b)=>b.pct-a.pct).filter(f=>f.count>0);

    const hookDist   = distribution(HOOK_TYPES, hooks, HOOK_COLORS)
      .sort((a,b)=>b.pct-a.pct).filter(f=>f.count>0);

    const emoDist    = distribution(EMOTIONS, emos, EMOTION_COLORS)
      .sort((a,b)=>b.pct-a.pct).filter(f=>f.count>0);

    const ctaDist    = distribution(CTAS, ctas, CTA_COLORS)
      .sort((a,b)=>b.pct-a.pct).filter(f=>f.count>0);

    return {
      dominantHook:    mode(hooks),
      dominantAngle:   mode(angles),
      dominantFormat:  mode(formats),
      dominantEmotion: mode(emos),
      saturation:      satLabel(total),
      angleDist,
      formatDist,
      hookDist,
      emoDist,
      ctaDist,
      underAngle:      underserved(ANGLES,     angles),
      underFormat:     underserved(FORMATS,    formats),
      underHook:       underserved(HOOK_TYPES, hooks),
      underAngleData:  underservedData(ANGLES,     angles,  total),
      underHookData:   underservedData(HOOK_TYPES, hooks,   total),
      underFormatData: underservedData(FORMATS,    formats, total),
      dominantHookPct:   (() => { const dh = mode(hooks);   return total>0 && dh ? Math.round(hooks.filter(h=>h===dh).length/total*100) : 0; })(),
      dominantAnglePct:  (() => { const da = mode(angles);  return total>0 && da ? Math.round(angles.filter(a=>a===da).length/total*100) : 0; })(),
      dominantFormatPct: (() => { const df = mode(formats); return total>0 && df ? Math.round(formats.filter(f=>f===df).length/total*100) : 0; })(),
      total,
    };
  }, [displayRows]);

  const hasData = displayRows.length > 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-12 pb-20">

        {/* HEADER */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/5">Phase 2</Badge>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Competitor Intelligence</h1>
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Don't copy — deconstruct. Research competitors to detect creative patterns,
            identify saturated angles, and locate whitespace opportunities.
          </p>
        </motion.div>

        {/* 1. AD RESEARCH TOOLS */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{delay:0.08}}>
          <SH title="Ad Research Tools" description="Open any platform to start your competitive research." />
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {AD_TOOLS.map(tool=>(
              <motion.div key={tool.name} variants={cardItem}>
                <motion.div whileHover={{y:-3,boxShadow:"0 12px 32px rgba(99,102,241,0.12)"}} transition={{duration:0.18}} className="h-full">
                  <Card className="border-white/10 bg-card/50 h-full overflow-hidden hover:border-white/15 transition-colors flex flex-col">
                    <div className="h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                    <CardContent className="pt-5 pb-4 flex flex-col gap-3 flex-1">
                      <div className="flex items-start gap-3">
                        <span className="text-xl shrink-0 mt-0.5">{tool.icon}</span>
                        <p className="text-sm font-semibold text-foreground leading-snug">{tool.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tool.description}</p>
                      <a href={tool.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="w-full gap-1.5 border-white/10 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all text-xs mt-1">
                          <ExternalLink className="w-3 h-3"/> Open Tool
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* 2. CREATIVE PATTERN SCANNER */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.05}}>
          <SH title="Creative Pattern Scanner"
              description="Paste a competitor ad link to automatically detect creative patterns and add the ad to your research board." />
          <PatternScanner onAdd={addAnalyzedRow} />
        </motion.div>

        {/* 3. COMPETITOR RESEARCH BOARD */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.05}}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-1">Competitor Research Board</h2>
              <p className="text-sm text-muted-foreground">Log and analyze competitor ads. Click any row to open the Creative Breakdown panel.</p>
            </div>
          </div>
          <ResearchBoard
            rows={displayRows} setRows={setRows}
            onRowClick={id => setSelectedRowId(prev => prev===id ? null : id)}
            selectedRowId={selectedRowId}
            isDemo={isDemo}
          />
        </motion.div>

        {/* 3. MARKET PATTERN ANALYSIS */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <SH title="Market Pattern Analysis" description="Patterns detected from your logged competitor ads." />
          <Card className="border-white/10 bg-card/50 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-violet-500/20 to-transparent" />
            <CardContent className="pt-6 pb-5">
              {!hasData ? <EmptyInsights /> : (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    {label:"Dominant Hook Type",  value:analytics.dominantHook,    color:"#8b5cf6"},
                    {label:"Dominant Angle",      value:analytics.dominantAngle,   color:"#f59e0b"},
                    {label:"Dominant Format",     value:analytics.dominantFormat,  color:"#6366f1"},
                    {label:"Dominant Trigger",    value:analytics.dominantEmotion, color:"#ec4899"},
                    {label:"Market Saturation",   value:analytics.saturation.label,color:analytics.saturation.color},
                  ].map(({label,value,color})=>(
                    <motion.div key={label} whileHover={{y:-2}} transition={{duration:0.15}}
                      className="rounded-xl border border-white/5 bg-background/40 p-4 hover:border-white/10 transition-colors"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
                      {value
                        ? <p className="text-sm font-bold" style={{color}}>{value}</p>
                        : <p className="text-xs text-muted-foreground/40 italic">Not enough data</p>
                      }
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 4. ANGLE SATURATION MAP */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <SH title="Angle Saturation Map" description="Frequency of each creative angle across your logged competitor ads." />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-white/10 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-amber-500/50 via-amber-500/20 to-transparent" />
              <CardContent className="pt-6 pb-5">
                {!hasData ? <EmptyInsights /> : (
                  <div className="flex flex-col gap-4">
                    {analytics.angleDist.map(a=>(
                      <div key={a.angle}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-foreground/85">{a.angle}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{a.count} ad{a.count!==1?"s":""} · {a.pct}%</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${SAT_BADGE[a.level]}`}>{a.level}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/5">
                          <motion.div className="h-full rounded-full" style={{background:SAT_BAR[a.level]}}
                            initial={{width:0}} animate={{width:`${a.pct}%`}}
                            transition={{duration:0.6,ease:[0.22,1,0.36,1]}}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-emerald-400">Opportunity Angles</CardTitle>
                <CardDescription className="text-xs">Low saturation — high whitespace potential.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col gap-2.5">
                {!hasData ? <EmptyInsights /> : (
                  <>
                    {analytics.angleDist.filter(a=>a.opportunity).map(a=>(
                      <motion.div key={a.angle} whileHover={{x:3}} transition={{duration:0.14}}
                        className="flex items-center gap-2.5 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2.5 hover:border-emerald-500/25 transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-sm font-medium text-emerald-300">{a.angle}</span>
                      </motion.div>
                    ))}
                    {analytics.angleDist.filter(a=>a.opportunity).length===0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">All angles are in use — strong market coverage.</p>
                    )}
                    <div className="mt-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2.5">
                      <p className="text-xs text-emerald-400/70 leading-relaxed">Angles below 20% usage — strong candidates for your next creative test.</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* 5. CREATIVE FORMAT ANALYSIS */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <SH title="Creative Format Analysis" description="Distribution of creative formats across your logged competitor ads." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-white/10 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-blue-500/50 via-blue-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Format Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {!hasData ? <EmptyInsights /> : analytics.formatDist.length===0
                  ? <p className="text-xs text-muted-foreground/50 text-center py-8">No formats selected in your logged ads yet.</p>
                  : (
                    <div className="flex flex-col gap-4">
                      {analytics.formatDist.map(f=>(
                        <div key={f.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{background:f.color}}/>
                              <span className="text-sm font-medium text-foreground/85">{f.label}</span>
                            </div>
                            <span className="text-sm font-bold" style={{color:f.color}}>{f.pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/5">
                            <motion.div className="h-full rounded-full" style={{background:f.color}}
                              initial={{width:0}} animate={{width:`${f.pct}%`}}
                              transition={{duration:0.65,ease:[0.22,1,0.36,1]}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-violet-500/5 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-violet-400" />
                  <CardTitle className="text-base text-violet-300">Underserved Formats</CardTitle>
                </div>
                <CardDescription className="text-xs">Formats absent or low in competitor ads — high differentiation potential.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 flex flex-col gap-3">
                {!hasData ? <EmptyInsights /> : (
                  <>
                    {FORMATS.filter(f=>!analytics.formatDist.find(d=>d.label===f)).slice(0,4).map(f=>(
                      <motion.div key={f} whileHover={{x:3}} transition={{duration:0.14}}
                        className="rounded-lg border border-violet-500/15 bg-background/40 p-3 hover:border-violet-500/25 transition-colors"
                      >
                        <p className="text-sm font-semibold text-violet-300">{f}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">0 competitor ads — unused format in your market.</p>
                      </motion.div>
                    ))}
                    {FORMATS.filter(f=>!analytics.formatDist.find(d=>d.label===f)).length===0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">All formats are covered by your logged competitor ads.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* 6. HOOK TYPE ANALYSIS */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <SH title="Hook Type Analysis" description="Distribution of hook types across your logged competitor ads." />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-white/10 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-violet-500/50 via-violet-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Hook Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                {!hasData ? <EmptyInsights /> : analytics.hookDist.length===0
                  ? <p className="text-xs text-muted-foreground/50 text-center py-8">No hook types selected in your logged ads yet.</p>
                  : (
                    <div className="flex flex-col gap-4">
                      {analytics.hookDist.map(h=>(
                        <div key={h.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{background:h.color}}/>
                              <span className="text-sm font-medium text-foreground/85">{h.label}</span>
                            </div>
                            <span className="text-sm font-bold" style={{color:h.color}}>{h.pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/5">
                            <motion.div className="h-full rounded-full" style={{background:h.color}}
                              initial={{width:0}} animate={{width:`${h.pct}%`}}
                              transition={{duration:0.65,ease:[0.22,1,0.36,1]}}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-violet-500/5 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-violet-500/60 via-violet-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-violet-400" />
                  <CardTitle className="text-base text-violet-300">Underused Hook Types</CardTitle>
                </div>
                <CardDescription className="text-xs">Hook styles absent or rare in competitor ads — whitespace to exploit.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 flex flex-col gap-3">
                {!hasData ? <EmptyInsights /> : (
                  <>
                    {HOOK_TYPES.filter(h=>!analytics.hookDist.find(d=>d.label===h)).slice(0,4).map(h=>(
                      <motion.div key={h} whileHover={{x:3}} transition={{duration:0.14}}
                        className="rounded-lg border border-violet-500/15 bg-background/40 p-3 hover:border-violet-500/25 transition-colors"
                      >
                        <p className="text-sm font-semibold text-violet-300">{h}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">0 competitor ads — unused hook in your market.</p>
                      </motion.div>
                    ))}
                    {HOOK_TYPES.filter(h=>!analytics.hookDist.find(d=>d.label===h)).length===0 && (
                      <p className="text-xs text-muted-foreground/50 text-center py-4">All hook types are covered by your logged competitor ads.</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* 6b. EMOTIONAL TRIGGER + CTA STYLE */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Emotional Trigger Distribution */}
            <Card className="border-white/10 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-pink-500/50 via-pink-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">Emotional Trigger Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasData ? <EmptyInsights /> : analytics.emoDist.length===0
                  ? <p className="text-xs text-muted-foreground/50 text-center py-6">No emotional triggers logged yet.</p>
                  : (
                    <div className="flex flex-col gap-3">
                      {analytics.emoDist.map(e=>(
                        <div key={e.label} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-foreground/75 w-[110px] shrink-0 truncate">{e.label}</span>
                          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{background:e.color}}
                              initial={{width:0}} animate={{width:`${e.pct}%`}}
                              transition={{duration:0.6,ease:[0.22,1,0.36,1]}}
                            />
                          </div>
                          <span className="text-xs font-bold w-8 text-right shrink-0" style={{color:e.color}}>{e.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>

            {/* CTA Style Distribution */}
            <Card className="border-white/10 bg-card/50 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-indigo-500/50 via-indigo-500/20 to-transparent" />
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">CTA Style Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasData ? <EmptyInsights /> : analytics.ctaDist.length===0
                  ? <p className="text-xs text-muted-foreground/50 text-center py-6">No CTA styles logged yet.</p>
                  : (
                    <div className="flex flex-col gap-3">
                      {analytics.ctaDist.map(c=>(
                        <div key={c.label} className="flex items-center gap-3">
                          <span className="text-xs font-medium text-foreground/75 w-[110px] shrink-0 truncate">{c.label}</span>
                          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                            <motion.div className="h-full rounded-full" style={{background:c.color}}
                              initial={{width:0}} animate={{width:`${c.pct}%`}}
                              transition={{duration:0.6,ease:[0.22,1,0.36,1]}}
                            />
                          </div>
                          <span className="text-xs font-bold w-8 text-right shrink-0" style={{color:c.color}}>{c.pct}%</span>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>

          </div>
        </motion.div>

        {/* 7. MARKET OPPORTUNITIES */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{once:true,amount:0.1}}>
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">Strategic Insights</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <SH title="Market Opportunities" description="Strategic opportunities detected from competitor creative patterns." />
          {!hasData ? (
            <Card className="border-white/10 bg-card/50"><CardContent className="pt-0"><EmptyInsights /></CardContent></Card>
          ) : analytics.total < 5 ? (
            <Card className="border-amber-500/15 bg-amber-500/[0.03] overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-amber-500/50 to-transparent" />
              <CardContent className="pt-0">
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-400/70" />
                  </div>
                  <p className="text-sm font-semibold text-foreground/80">
                    Log at least 5 competitor ads to generate reliable opportunity insights.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analytics.total} of 5 ads logged — {5 - analytics.total} more needed.
                  </p>
                  <div className="mt-1 w-40 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-amber-500/60"
                      initial={{width:0}} animate={{width:`${(analytics.total/5)*100}%`}}
                      transition={{duration:0.6,ease:[0.22,1,0.36,1]}}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (() => {
            const { dominantHook, dominantAngle, dominantFormat,
                    dominantHookPct, dominantAnglePct, dominantFormatPct,
                    underHookData, underAngleData, underFormatData, total } = analytics;

            const insights = [
              {
                num:         "01",
                label:       "Hook Saturation",
                color:       "#8b5cf6",
                icon:        Zap,
                pattern:     `${dominantHookPct}% of competitor ads lead with a ${dominantHook || "similar hook style"} to capture attention. This is the dominant creative entry point across your logged ads.`,
                opportunity: `Viewers who see the same hook style repeatedly begin to scroll past it. Introducing a less common hook type creates an immediate pattern-interrupt from the first frame.`,
                test: {
                  hook:   underHookData.value,
                  angle:  dominantAngle  || underAngleData.value,
                  format: dominantFormat || underFormatData.value,
                },
                testNote: `Keep a familiar angle and format — isolate the hook variable to measure its direct impact on creative performance.`,
              },
              {
                num:         "02",
                label:       "Angle Whitespace",
                color:       "#6366f1",
                icon:        Target,
                pattern:     `${dominantAnglePct}% of competitor ads use ${dominantAngle || "a dominant angle"} as their primary messaging angle. The market is heavily converging on this positioning.`,
                opportunity: `When most competitors lead with the same angle, audiences become saturated. A differentiated angle can own a positioning space that no competitor currently occupies.`,
                test: {
                  hook:   dominantHook  || underHookData.value,
                  angle:  underAngleData.value,
                  format: dominantFormat || underFormatData.value,
                },
                testNote: `Isolate angle as the test variable. Use familiar hook and format so any lift is attributed to the new positioning.`,
              },
              {
                num:         "03",
                label:       "Format Gap",
                color:       "#10b981",
                icon:        Video,
                pattern:     `${dominantFormatPct}% of competitor ads use ${dominantFormat || "the same format"} as their primary creative format. Format diversity in this market is low.`,
                opportunity: `${underFormatData.value} is barely used across competitor ads. Introducing an unfamiliar format creates native-feeling content that disrupts feed patterns and drives higher engagement.`,
                test: {
                  hook:   underHookData.value,
                  angle:  underAngleData.value,
                  format: underFormatData.value,
                },
                testNote: `This is a high-disruption test. All three variables are underused — expect stronger differentiation and wider result variance.`,
              },
            ];

            return (
              <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{once:true}}
                className="grid grid-cols-1 md:grid-cols-3 gap-5"
              >
                {insights.map(({ num, label, color, icon: Icon, pattern, opportunity, test, testNote }) => (
                  <motion.div key={num} variants={cardItem}>
                    <motion.div whileHover={{y:-4,boxShadow:`0 20px 48px ${color}1a`}} transition={{duration:0.2}} className="h-full">
                      <Card className="border-white/10 bg-card/50 h-full overflow-hidden hover:border-white/15 transition-colors">
                        <div className="h-0.5" style={{background:`linear-gradient(90deg,${color}80,transparent)`}} />
                        <CardContent className="pt-5 pb-5 flex flex-col gap-0">

                          {/* Card header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background:`${color}15`}}>
                                <Icon className="w-4 h-4" style={{color}} />
                              </div>
                              <p className="text-sm font-bold text-foreground">{label}</p>
                            </div>
                            <span className="text-[10px] font-black font-mono tabular-nums" style={{color,opacity:0.5}}>{num}</span>
                          </div>

                          {/* Market Pattern */}
                          <div className="flex flex-col gap-2 pb-4 border-b border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                              Market Pattern
                            </p>
                            <p className="text-xs text-foreground/80 leading-relaxed">{pattern}</p>
                          </div>

                          {/* Strategic Opportunity */}
                          <div className="flex flex-col gap-2 py-4 border-b border-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{color,opacity:0.7}}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:color,opacity:0.6}} />
                              Strategic Opportunity
                            </p>
                            <p className="text-xs text-foreground/75 leading-relaxed">{opportunity}</p>
                          </div>

                          {/* Suggested Creative Test */}
                          <div className="flex flex-col gap-3 pt-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
                              <FlaskConical className="w-3 h-3 text-muted-foreground/40" />
                              Suggested Creative Test
                            </p>
                            <div className="flex flex-col gap-1.5">
                              {([
                                { field: "Hook",   value: test.hook   },
                                { field: "Angle",  value: test.angle  },
                                { field: "Format", value: test.format },
                              ] as const).map(({ field, value }) => (
                                <div key={field} className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-muted-foreground/50 w-11 shrink-0">{field}</span>
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border leading-snug"
                                    style={{background:`${color}12`,color,borderColor:`${color}25`}}
                                  >{value}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 leading-relaxed italic">{testNote}</p>
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            );
          })()}
        </motion.div>

        <NextStepBanner
          step="Phase 3"
          title="Script Matrix"
          cta="Open Script Matrix"
          description="Turn your competitive patterns into structured hook, body, and CTA combinations ready to test."
          href="/script-testing"
          icon={FileText}
          color="#f59e0b"
        />
      </div>

      {/* CREATIVE BREAKDOWN PANEL (fixed overlay) */}
      <AnimatePresence>
        {selectedRow && (
          <CreativeBreakdown
            key={selectedRow.id}
            row={selectedRow}
            onClose={()=>setSelectedRowId(null)}
            onUpdate={updateRow}
          />
        )}
      </AnimatePresence>

    </PageTransition>
  );
}
