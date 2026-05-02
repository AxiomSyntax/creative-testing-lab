import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, GripVertical, Trash2, FlaskConical, ChevronDown,
  ArrowRight, CheckCheck, Layers, Target, MousePointerClick,
  TrendingUp, Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useProject } from "@/contexts/ProjectContext";
import { HOOK_TYPES } from "@/data/hooks";

// ─── Constants ────────────────────────────────────────────────────────────────

const ANGLES  = ["Pain Point","Transformation","Social Proof","Curiosity","Authority","Comparison","Urgency","Mechanism Reveal","Fear + Relief","Ease of Use"];
const FORMATS = ["UGC","Talking Head","Motion Graphic","Split Screen","Text-Only","Product Demo","Screen Recording","Testimonial","Founder POV","Animation"];

const PRIORITIES = [
  { value: "P0", label: "P0 — Critical", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20"    },
  { value: "P1", label: "P1 — High",     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { value: "P2", label: "P2 — Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { value: "P3", label: "P3 — Low",      color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20"  },
] as const;

const IMPACT_EFFORT = ["High", "Medium", "Low"] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type Column   = "backlog" | "ready" | "running";
type Priority = typeof PRIORITIES[number]["value"];
type Level    = typeof IMPACT_EFFORT[number];

interface BacklogItem {
  id: string;
  hookType: string;
  angle: string;
  format: string;
  expectedImpact: Level;
  effort: Level;
  priority: Priority;
  notes: string;
  column: Column;
  createdAt: number;
}

const COLUMNS: { id: Column; label: string; subtitle: string; accent: string; headerBg: string; dropBg: string }[] = [
  { id: "backlog",  label: "Backlog",        subtitle: "Ideas to evaluate",       accent: "from-blue-500/50 to-transparent",   headerBg: "bg-blue-500/[0.07] border-blue-500/15",   dropBg: "bg-blue-500/5 border-blue-500/20"   },
  { id: "ready",   label: "Ready to Test",   subtitle: "Prioritised and queued",  accent: "from-amber-500/50 to-transparent",  headerBg: "bg-amber-500/[0.07] border-amber-500/15", dropBg: "bg-amber-500/5 border-amber-500/20" },
  { id: "running", label: "Running",         subtitle: "Currently being tested",  accent: "from-emerald-500/50 to-transparent",headerBg: "bg-emerald-500/[0.07] border-emerald-500/15",dropBg: "bg-emerald-500/5 border-emerald-500/20"},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(items: { id: string }[]) {
  const max = items.reduce((m, x) => {
    const n = parseInt((x.id ?? "").replace("bl-", ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `bl-${max + 1}`;
}
function safeJSON<T>(s: string | null, fb: T): T {
  if (!s) return fb;
  try { return JSON.parse(s) as T; } catch { return fb; }
}

const priorityMeta = (p: Priority) => PRIORITIES.find(x => x.value === p) ?? PRIORITIES[2];
const levelColor = (l: Level) => ({ High: "text-emerald-400", Medium: "text-yellow-400", Low: "text-slate-400" }[l]);

const blankForm = (): Omit<BacklogItem, "id" | "createdAt" | "column"> => ({
  hookType: HOOK_TYPES[0] ?? "Curiosity Hook",
  angle: ANGLES[0],
  format: FORMATS[0],
  expectedImpact: "Medium",
  effort: "Medium",
  priority: "P2",
  notes: "",
});

// ─── Dropdown ────────────────────────────────────────────────────────────────

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[] | string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/40 pr-6 cursor-pointer"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Add Item Form ────────────────────────────────────────────────────────────

function AddItemForm({ column, onAdd, onCancel, allItems }: {
  column: Column; onAdd: (item: BacklogItem) => void; onCancel: () => void; allItems: BacklogItem[];
}) {
  const [form, setForm] = useState(blankForm());
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit() {
    onAdd({ ...form, id: uid(allItems), column, createdAt: Date.now() });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-white/12 bg-card/60 p-4 flex flex-col gap-3"
    >
      <p className="text-xs font-bold text-white">New experiment</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Select label="Hook Type"    value={form.hookType}       options={HOOK_TYPES} onChange={set("hookType")}       />
        </div>
        <Select label="Angle"          value={form.angle}          options={ANGLES}     onChange={set("angle")}          />
        <Select label="Format"         value={form.format}         options={FORMATS}    onChange={set("format")}         />
        <Select label="Expected Impact" value={form.expectedImpact} options={IMPACT_EFFORT} onChange={v => setForm(p => ({ ...p, expectedImpact: v as Level }))} />
        <Select label="Effort"         value={form.effort}         options={IMPACT_EFFORT} onChange={v => setForm(p => ({ ...p, effort: v as Level }))} />
        <div className="col-span-2">
          <Select label="Priority" value={form.priority} options={PRIORITIES.map(p => p.value)} onChange={v => setForm(p => ({ ...p, priority: v as Priority }))} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/35">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Hypothesis or context…"
          rows={2}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/40 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={submit}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-white/10 text-xs font-medium text-muted-foreground hover:text-white hover:border-white/25 transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ─── Experiment Card ──────────────────────────────────────────────────────────

function ItemCard({ item, onDelete, onSendToLab, isDragging }: {
  item: BacklogItem;
  onDelete: () => void;
  onSendToLab: () => void;
  isDragging: boolean;
}) {
  const pm = priorityMeta(item.priority);
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<ReturnType<typeof setTimeout>>();

  function handleSend() {
    onSendToLab();
    setSent(true);
    clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSent(false), 2500);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl border border-white/8 bg-card/50 overflow-hidden select-none group"
    >
      {/* Card header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors cursor-grab shrink-0" />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pm.bg} ${pm.color}`}>
            {pm.value}
          </span>
          <span className="text-xs font-semibold text-white truncate">{item.hookType}</span>
        </div>
        <button
          onClick={onDelete}
          className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-muted-foreground/30 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Card body */}
      <div className="px-3.5 py-3 flex flex-col gap-2.5">
        {/* Main fields */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Target className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/25">Angle</p>
              <p className="text-[11px] font-semibold text-foreground/80 truncate">{item.angle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/25">Format</p>
              <p className="text-[11px] font-semibold text-foreground/80 truncate">{item.format}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/25">Impact</p>
              <p className={`text-[11px] font-bold ${levelColor(item.expectedImpact)}`}>{item.expectedImpact}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="w-3 h-3 text-muted-foreground/30 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/25">Effort</p>
              <p className={`text-[11px] font-bold ${levelColor(item.effort)}`}>{item.effort}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <p className="text-[10px] text-muted-foreground/40 leading-relaxed border-t border-white/5 pt-2 line-clamp-2">
            {item.notes}
          </p>
        )}

        {/* Send to Creative Lab */}
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 py-1.5"
            >
              <CheckCheck className="w-3 h-3" />
              Added to Creative Lab
            </motion.div>
          ) : (
            <motion.button
              key="btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSend}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/8 bg-white/[0.03] hover:bg-primary/10 hover:border-primary/25 text-[10px] font-bold text-muted-foreground/50 hover:text-primary transition-all duration-150 group/btn"
            >
              <FlaskConical className="w-3 h-3 group-hover/btn:text-primary" />
              Send to Creative Lab
              <ArrowRight className="w-2.5 h-2.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col, items, draggingId, onDrop, onDelete, onSendToLab, onAdd,
}: {
  col: typeof COLUMNS[number];
  items: BacklogItem[];
  draggingId: string | null;
  onDrop: (colId: Column) => void;
  onDelete: (id: string) => void;
  onSendToLab: (item: BacklogItem) => void;
  onAdd: (item: BacklogItem) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(true);
  }
  function handleDragLeave() { setIsOver(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    onDrop(col.id);
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[400px] ${
        isOver ? `${col.dropBg}` : "border-white/8 bg-white/[0.02]"
      }`}
    >
      {/* Column header */}
      <div className={`p-4 rounded-t-2xl border-b border-white/5 ${col.headerBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">{col.label}</h3>
              <span className="text-[10px] font-bold text-muted-foreground/40 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/30 mt-0.5">{col.subtitle}</p>
          </div>
          <div className={`h-0.5 w-12 rounded-full bg-gradient-to-r ${col.accent}`} />
        </div>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2.5 p-3 flex-1">
        <AnimatePresence>
          {items.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={e => { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }}
              className="cursor-grab active:cursor-grabbing"
            >
              <ItemCard
                item={item}
                isDragging={draggingId === item.id}
                onDelete={() => onDelete(item.id)}
                onSendToLab={() => onSendToLab(item)}
              />
            </div>
          ))}
        </AnimatePresence>

        {/* Drop zone hint when dragging */}
        {isOver && draggingId && (
          <div className={`rounded-xl border-2 border-dashed p-3 flex items-center justify-center transition-colors ${col.dropBg}`}>
            <span className="text-xs text-muted-foreground/40">Drop here</span>
          </div>
        )}

        {/* Add form / Add button */}
        <AnimatePresence>
          {showForm ? (
            <AddItemForm
              key="form"
              column={col.id}
              allItems={items}
              onAdd={item => { onAdd(item); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <motion.button
              key="addBtn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/8 hover:border-white/20 text-xs font-medium text-muted-foreground/30 hover:text-muted-foreground/70 transition-all duration-150 mt-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add experiment
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExperimentBacklog() {
  const { projectKey, activeProjectCode } = useProject();
  const [items, setItems] = useLocalStorage<BacklogItem[]>(projectKey("backlog:items"), []);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function addItem(item: BacklogItem) {
    setItems(prev => [item, ...prev]);
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function moveItem(id: string, colId: Column) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, column: colId } : i));
  }

  function handleDrop(colId: Column) {
    if (draggingId) {
      moveItem(draggingId, colId);
      setDraggingId(null);
    }
  }

  function sendToCreativeLab(item: BacklogItem) {
    const key = projectKey("lab:experiments");
    try {
      const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as any[];
      const id = `lab-bl-${Date.now()}`;
      // Derive a unique variantId that won't collide with existing ones
      const nums = existing.map((e: any) => {
        const m = (e.variantId ?? "").match(/V(\d+)(?:[^0-9]|$)/);
        return m ? parseInt(m[1]) : 0;
      });
      const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
      const variantId = `${activeProjectCode}-V${String(nextNum).padStart(2, "0")}`;
      const testId = variantId; // single-variant test — testId equals variantId
      const newExp = {
        id,
        variantId,
        testId,
        adVariant:      `${item.hookType} / ${item.angle}`,
        hookType:       item.hookType,
        primaryAngle:   item.angle,
        creativeFormat: item.format,
        cta:            "Direct Response",
        status:         "Draft",
        adType:         "video",
        timeline:       [],
        createdAt:      new Date().toISOString(),
        thumbStopRate: 0,
        holdRate: 0,
        ctr: 0,
        cpa: 0,
      };
      localStorage.setItem(key, JSON.stringify([...existing, newExp]));
      // clb:write fires automatically via the patched localStorage.setItem
      // Move card to Running
      moveItem(item.id, "running");
    } catch { /* ignore */ }
  }

  const totalItems = items.length;
  const colItems = (colId: Column) => items.filter(i => i.column === colId);

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
              Creative Testing
            </span>
            <h1 className="text-3xl font-bold text-white mt-3">Experiment Backlog</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Collect, prioritise, and queue up future creative tests before sending them to Creative Lab.
            </p>
          </div>

          {totalItems > 0 && (
            <div className="flex items-center gap-3 mt-1">
              {COLUMNS.map(col => (
                <div key={col.id} className="text-center">
                  <p className="text-lg font-extrabold text-white">{colItems(col.id).length}</p>
                  <p className="text-[10px] text-muted-foreground/40">{col.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kanban board */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-5"
          onDragStart={e => {
            const id = e.dataTransfer.getData("text/plain");
            if (id) setDraggingId(id);
          }}
          onDragEnd={() => setDraggingId(null)}
        >
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              items={colItems(col.id)}
              draggingId={draggingId}
              onDrop={handleDrop}
              onDelete={deleteItem}
              onSendToLab={sendToCreativeLab}
              onAdd={addItem}
            />
          ))}
        </div>

        {/* Empty state hint */}
        {totalItems === 0 && (
          <p className="text-center text-xs text-muted-foreground/25 mt-2">
            Use the "+ Add experiment" buttons to start building your backlog.
          </p>
        )}

        <NextStepBanner
          step="Creative Lab"
          title="Manage Your Experiments"
          cta="Open Creative Lab"
          description="Head to Creative Lab to log performance data, update statuses, and find your winning creative."
          href="/creative-lab"
          icon={FlaskConical}
          color="#10b981"
        />
      </div>
    </PageTransition>
  );
}
