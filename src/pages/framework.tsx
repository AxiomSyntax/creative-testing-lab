import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Search,
  FlaskConical,
  TrendingUp,
  Zap,
  Sliders,
  Users,
} from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { NextStepBanner } from "@/components/next-step-banner";

// ─── Shared custom node types ────────────────────────────────────────────────

function TitleNode({ data }: NodeProps) {
  const d = data as { label: string; sub?: string };
  return (
    <div className="rounded-xl border-2 border-white/25 bg-[#1a1f2e] px-8 py-4 text-center shadow-xl">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-lg font-bold text-white">{d.label}</div>
      {d.sub && <div className="text-xs text-slate-400 mt-0.5">{d.sub}</div>}
    </div>
  );
}

function SectionNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    sub?: string;
    items?: string[];
    color?: string;
    note?: string;
  };
  return (
    <div
      className="rounded-lg border bg-[#111827] shadow-md"
      style={{
        borderColor: d.color ?? "#334155",
        minWidth: 170,
        maxWidth: 230,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div
        className="px-3 py-2 border-b"
        style={{
          borderColor: d.color ?? "#334155",
          background: (d.color ?? "#334155") + "22",
        }}
      >
        <div className="text-xs font-bold text-white leading-tight">
          {d.label}
        </div>
        {d.sub && (
          <div className="text-[10px] text-slate-400 mt-0.5">{d.sub}</div>
        )}
      </div>
      {d.items && (
        <ul className="px-3 py-2 space-y-1">
          {d.items.map((item, i) => (
            <li
              key={i}
              className="text-[10px] text-slate-300 flex items-start gap-1 leading-tight"
            >
              <span className="text-slate-500 shrink-0 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {d.note && (
        <div className="px-3 pb-2 text-[9px] text-slate-400 italic">
          {d.note}
        </div>
      )}
    </div>
  );
}

function SimpleNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    sub?: string;
    color?: string;
    bold?: boolean;
  };
  return (
    <div
      className="rounded-md border bg-[#1a1f2e] px-3 py-2 text-center shadow"
      style={{ borderColor: d.color ?? "#334155", minWidth: 120 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div
        className={`text-xs ${d.bold ? "font-bold" : "font-medium"} text-white leading-tight`}
      >
        {d.label}
      </div>
      {d.sub && (
        <div className="text-[10px] text-slate-400 mt-0.5">{d.sub}</div>
      )}
    </div>
  );
}

function ToolNode({ data }: NodeProps) {
  const d = data as { label: string; url?: string; color?: string };
  return (
    <div
      className="rounded-lg border-2 bg-white px-3 py-2 text-center shadow-md"
      style={{
        borderColor: d.color ?? "#6366f1",
        minWidth: 130,
        maxWidth: 160,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-xs font-bold text-gray-800 leading-tight">
        {d.label}
      </div>
      {d.url && <div className="text-[8px] text-gray-500 mt-0.5">{d.url}</div>}
    </div>
  );
}

function ConvNode({ data }: NodeProps) {
  const d = data as { label: string; rate: string; winner?: boolean };
  return (
    <div
      className={`rounded-md border px-2 py-2 text-center shadow-sm ${d.winner ? "border-emerald-500 bg-emerald-500/10" : "border-white/20 bg-[#1a1f2e]"}`}
      style={{ minWidth: 70 }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="text-[9px] text-slate-400">{d.label}</div>
      <div
        className={`font-bold text-sm ${d.winner ? "text-emerald-400" : "text-white"}`}
      >
        {d.rate}
      </div>
      <div className="text-[8px] text-slate-500">Conversion</div>
    </div>
  );
}

function WinnerNode({ data }: NodeProps) {
  const d = data as { label: string };
  return (
    <div className="rounded-lg border-2 border-emerald-500 bg-emerald-500/15 px-4 py-2 text-center shadow-lg">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-xs font-bold text-emerald-400">✓ Winner!</div>
      <div className="text-[10px] text-emerald-300 mt-0.5">{d.label}</div>
    </div>
  );
}

function OutcomeNode({ data }: NodeProps) {
  const d = data as { label: string; color?: string };
  return (
    <div
      className="rounded-xl border-2 px-5 py-3 text-center shadow-lg"
      style={{
        borderColor: d.color ?? "#10b981",
        background: (d.color ?? "#10b981") + "20",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="text-sm font-bold text-white">{d.label}</div>
    </div>
  );
}

function LaneNode({ data }: NodeProps) {
  const d = data as { label: string; w: number; h: number; color?: string };
  return (
    <div
      className="rounded-xl border-2 relative"
      style={{
        width: d.w,
        height: d.h,
        borderColor: d.color ?? "#ef4444",
        borderStyle: "dashed",
        background: (d.color ?? "#ef4444") + "08",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function LabelNode({ data }: NodeProps) {
  const d = data as { label: string; rotate?: string; color?: string };
  return (
    <div
      className="text-xs font-semibold text-slate-400 whitespace-nowrap"
      style={{
        transform: d.rotate ? `rotate(${d.rotate})` : undefined,
        color: d.color,
      }}
    >
      {d.label}
    </div>
  );
}

function NoteNode({ data }: NodeProps) {
  const d = data as { label: string; color?: string };
  return (
    <div
      className="rounded-md border px-3 py-2 text-center shadow"
      style={{
        borderColor: d.color ?? "#334155",
        background: (d.color ?? "#334155") + "30",
        maxWidth: 220,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-[10px] text-slate-300 leading-tight">{d.label}</div>
    </div>
  );
}

function PhaseHeaderNode({ data }: NodeProps) {
  const d = data as { label: string; sub?: string; color: string };
  return (
    <div
      className="rounded-xl px-6 py-3 text-center font-bold text-white shadow-lg border-2"
      style={{
        background: d.color + "33",
        borderColor: d.color,
        minWidth: 160,
      }}
    >
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="text-sm font-bold" style={{ color: d.color }}>
        {d.label}
      </div>
      {d.sub && (
        <div className="text-[10px] font-normal text-slate-300 mt-0.5">
          {d.sub}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SCRIPT TESTING — PNG ICON REGISTRY
// ══════════════════════════════════════════════════════════════

const _base = import.meta.env.BASE_URL;
const _icon = (n: string) => `${_base}icons/${n}`;
const ICONS = {
  // Phase 1
  scriptP1: _icon("script_phase_1_1773512821252.png"),
  videoScriptP1: _icon("video_script_phase_1_1773512821251.png"),
  videoScriptP1Win: _icon("video_script_phase_1_winner_1773512821252.png"),
  // Phase 2
  anglerP2: _icon("angler_Phase_2_1773513473495.png"),
  scriptAngelP2: _icon("script_angel_Phase_2_1773513473494.png"),
  funnelFischeP2: _icon("funnel_fische_Phase_2_1773513473496.png"),
  hook1P2: _icon("hook_-_1_Phase_2_1773513473496.png"),
  hook2P2: _icon("hook_-_2_Phase_2_1773513473497.png"),
  hook3P2: _icon("hook_-_3_Phase_2_1773513473498.png"),
  hook3P2Win: _icon("hook_-_3_Phase_2_winner_1773513473498.png"),
  hook4P2: _icon("hook_-_4_Phase_2_1773513473499.png"),
  hook5P2: _icon("hook_-_5_Phase_2_1773513473499.png"),
  // Phase 3
  anDerAngelP3: _icon("an_der_angel_Phase_3_1773513832306.png"),
  funnelFischeP3: _icon("funnel_fische_Phase_3_1773513841764.png"),
  cinemaP3: _icon("cinema_Phase_3_1773513841765.png"),
  drehbuchFischP3: _icon("Drehbuch_mit_hook_fisch_Phase_3_1773513841765.png"),
};

// Placeholder so nothing else breaks — this section is now PNG-only
function _noop_ScriptQuillIcon({ c = "#6366f1" }: { c?: string }) {
  return (
    <svg
      width="60"
      height="56"
      viewBox="0 0 60 56"
      fill="none"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="16" y="12" width="24" height="32" rx="3" opacity="0.45" />
      <rect x="8" y="6" width="24" height="32" rx="3" />
      <line x1="13" y1="15" x2="28" y2="15" />
      <line x1="13" y1="21" x2="28" y2="21" />
      <line x1="13" y1="27" x2="22" y2="27" />
      <line x1="13" y1="32" x2="25" y2="32" />
      <path d="M30 3 Q44 1 46 10 Q37 15 30 24 Z" />
      <line x1="30" y1="24" x2="34" y2="36" strokeDasharray="2 2.5" />
    </svg>
  );
}

function AnglerIcon({ c = "#f59e0b" }: { c?: string }) {
  return (
    <svg
      width="80"
      height="64"
      viewBox="0 0 80 64"
      fill="none"
      stroke={c}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="24" cy="9" r="8" />
      <line x1="24" y1="17" x2="24" y2="40" />
      <line x1="24" y1="27" x2="12" y2="36" />
      <line x1="24" y1="25" x2="40" y2="19" />
      <line x1="24" y1="40" x2="16" y2="54" />
      <line x1="24" y1="40" x2="32" y2="54" />
      <line x1="40" y1="19" x2="70" y2="6" />
      <line x1="70" y1="6" x2="74" y2="44" strokeDasharray="2 3" />
      <path d="M74 44 Q79 52 70 55 Q61 55 61 47" />
    </svg>
  );
}

function ScriptFishIcon({ c = "#10b981" }: { c?: string }) {
  return (
    <svg
      width="72"
      height="56"
      viewBox="0 0 72 56"
      fill="none"
      stroke={c}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="24" height="34" rx="3" />
      <rect x="4" y="6" width="12" height="9" rx="1" />
      <path d="M7 8 L7 13 L14 10.5 Z" strokeWidth="0.9" />
      <line x1="6" y1="20" x2="22" y2="20" />
      <line x1="6" y1="26" x2="22" y2="26" />
      <line x1="6" y1="31" x2="16" y2="31" />
      <path d="M34 34 Q46 27 56 34 Q46 41 34 34 Z" />
      <path d="M56 34 L65 29 L65 39 Z" />
      <circle cx="38" cy="33" r="2.5" fill={c} stroke="none" />
      <path d="M47 26 Q52 19 60 21" />
      <circle cx="61" cy="19" r="3" />
    </svg>
  );
}

function CinemaIcon({
  c = "#6366f1",
  size = 32,
}: {
  c?: string;
  size?: number;
}) {
  const s = size / 32;
  return (
    <svg
      width={size}
      height={Math.round(30 * s)}
      viewBox="0 0 32 30"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <rect x="1" y="1" width="30" height="20" rx="2" />
      <rect x="3" y="3" width="8" height="16" rx="1" />
      <rect x="14" y="3" width="15" height="16" rx="1" />
      <line x1="1" y1="23" x2="31" y2="23" />
      <line x1="8" y1="26" x2="24" y2="26" />
    </svg>
  );
}

function SmallHookIcon({
  v = 1,
  c = "#f59e0b",
  size = 32,
}: {
  v?: number;
  c?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 34 36"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {v === 1 && (
        <g>
          <circle cx="22" cy="8" r="6" />
          <line x1="22" y1="14" x2="22" y2="26" />
          <path d="M22 26 Q22 34 14 34 Q8 34 8 27 Q8 23 12 23" />
        </g>
      )}
      {v === 2 && (
        <g>
          <ellipse cx="17" cy="11" rx="8" ry="7" />
          <line x1="17" y1="18" x2="17" y2="26" />
          <path d="M17 26 Q17 34 10 34 Q4 34 4 27 Q4 23 8 23" />
          <line x1="25" y1="11" x2="30" y2="17" />
          <line x1="25" y1="11" x2="30" y2="22" />
        </g>
      )}
      {v === 3 && (
        <g>
          <path d="M5 17 Q5 9 11 9 Q20 9 21 17 Q20 25 11 25 Q5 25 5 17" />
          <circle cx="9" cy="14" r="2.5" />
          <path d="M21 17 L27 13 L27 21 Z" />
        </g>
      )}
      {v === 4 && (
        <g>
          <circle cx="17" cy="7" r="6" />
          <line x1="17" y1="13" x2="17" y2="24" />
          <line x1="9" y1="18" x2="25" y2="18" />
          <path d="M9 24 Q4 24 4 18 Q4 14 8 14" />
          <path d="M25 24 Q30 24 30 18 Q30 14 26 14" />
        </g>
      )}
      {v === 5 && (
        <g>
          <line x1="17" y1="3" x2="17" y2="17" />
          <path d="M17 17 Q17 26 10 29 Q5 29 5 23" />
          <path d="M17 17 Q17 26 24 29 Q29 29 29 23" />
          <path d="M17 22 Q21 28 18 33" />
        </g>
      )}
    </svg>
  );
}

function SmallVideoIcon({
  c = "#10b981",
  size = 32,
}: {
  c?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={Math.round((size * 28) / 32)}
      viewBox="0 0 32 28"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <rect x="1" y="3" width="22" height="19" rx="2" />
      <rect x="3" y="5" width="7" height="13" rx="1" />
      <rect x="13" y="5" width="8" height="13" rx="1" />
      <line x1="1" y1="24" x2="23" y2="24" />
      <line x1="6" y1="26" x2="18" y2="26" />
      <path d="M25 8 L30 11 L25 14 Z" />
      <path d="M25 17 L30 20 L25 23 Z" />
    </svg>
  );
}

function VideoProcessIcon({ c = "#6366f1" }: { c?: string }) {
  return (
    <svg
      width="320"
      height="50"
      viewBox="0 0 320 50"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="9" width="22" height="28" rx="2" />
      <line x1="4" y1="16" x2="18" y2="16" />
      <line x1="4" y1="21" x2="18" y2="21" />
      <line x1="4" y1="26" x2="13" y2="26" />
      <path d="M18 6 Q26 4 28 10 Q22 13 18 18 Z" />
      <line x1="30" y1="23" x2="40" y2="23" />
      <polyline points="37,19 41,23 37,27" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i} transform={`translate(${44 + i * 56}, 5)`}>
          <rect x="0" y="0" width="46" height="32" rx="2" />
          <rect x="2" y="2" width="14" height="28" rx="1" />
          <rect x="19" y="2" width="25" height="28" rx="1" />
          <line x1="0" y1="35" x2="46" y2="35" />
          <line x1="10" y1="38" x2="34" y2="38" />
        </g>
      ))}
    </svg>
  );
}

function HookProcessIcon({ c = "#f59e0b" }: { c?: string }) {
  return (
    <svg
      width="300"
      height="50"
      viewBox="0 0 300 50"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="0" y="9" width="22" height="28" rx="2" />
      <rect x="2" y="11" width="10" height="8" rx="1" />
      <path d="M4 13 L4 17 L10 15 Z" strokeWidth="0.9" />
      <line x1="2" y1="23" x2="20" y2="23" />
      <line x1="18" y1="11" x2="28" y2="5" />
      <line x1="30" y1="23" x2="40" y2="23" />
      <polyline points="37,19 41,23 37,27" />
      <g transform="translate(44,7)">
        <circle cx="16" cy="8" r="7" />
        <line x1="16" y1="15" x2="16" y2="26" />
        <path d="M16 26 Q16 34 9 34 Q4 34 4 28 Q4 25 7 25" />
      </g>
      <g transform="translate(96,7)">
        <ellipse cx="14" cy="10" rx="7" ry="7" />
        <line x1="14" y1="17" x2="14" y2="26" />
        <path d="M14 26 Q14 34 8 34 Q3 34 3 28" />
        <line x1="21" y1="10" x2="25" y2="17" />
      </g>
      <g transform="translate(146,7)">
        <path d="M2 16 Q2 8 8 8 Q18 8 18 16 Q18 24 8 24 Q2 24 2 16" />
        <circle cx="6" cy="13" r="2" />
        <path d="M18 16 L24 12 L24 20 Z" />
      </g>
      <g transform="translate(194,7)">
        <circle cx="13" cy="8" r="6" />
        <line x1="13" y1="14" x2="13" y2="26" />
        <line x1="6" y1="20" x2="20" y2="20" />
        <path d="M6 26 Q2 26 2 20" />
        <path d="M20 26 Q24 26 24 20" />
        <line x1="6" y1="26" x2="20" y2="26" />
      </g>
      <g transform="translate(242,5)">
        <line x1="13" y1="2" x2="13" y2="16" />
        <path d="M13 16 Q13 26 6 28 Q2 28 2 22" />
        <path d="M13 16 Q13 26 20 28 Q24 28 24 22" />
        <path d="M13 20 Q17 26 14 32" />
      </g>
    </svg>
  );
}

function VideoQualityProcessIcon({ c = "#10b981" }: { c?: string }) {
  return (
    <svg
      width="250"
      height="50"
      viewBox="0 0 250 50"
      fill="none"
      stroke={c}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4 L30 4 L22 22 L22 40 L10 34 L10 22 Z" />
      <path d="M4 2 L5 0 L6 2" />
      <path d="M14 0 L15 -2 L16 0" />
      <path d="M25 2 L26 0 L27 2" />
      <line x1="32" y1="22" x2="42" y2="22" />
      <polyline points="39,18 43,22 39,26" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${46 + i * 68}, 5)`}>
          <rect x="0" y="0" width="58" height="40" rx="4" />
          <rect x="3" y="4" width="52" height="24" rx="2" />
          <rect x="5" y="6" width="14" height="20" rx="1" />
          <rect x="22" y="6" width="30" height="20" rx="1" />
          <line x1="3" y1="30" x2="55" y2="30" />
          <line x1="18" y1="36" x2="40" y2="36" />
        </g>
      ))}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// SCRIPT TESTING — CUSTOM NODE TYPES (PNG-icon versions)
// ══════════════════════════════════════════════════════════════

function StPhaseBoxNode({ data }: NodeProps) {
  const d = data as { label: string; color: string };
  return (
    <div
      className="rounded-xl text-center shadow-xl px-8 py-3"
      style={{
        border: `2px solid ${d.color}70`,
        background: "#1a1f2e",
        minWidth: 200,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ opacity: 0 }}
      />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-lg font-bold text-white">{d.label}</div>
    </div>
  );
}

function StSubtitleNode({ data }: NodeProps) {
  const d = data as { text: string };
  return (
    <div className="text-center px-2 py-1" style={{ maxWidth: 260 }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="text-[10px] text-slate-400 leading-relaxed">{d.text}</div>
    </div>
  );
}

function StActionBoxNode({ data }: NodeProps) {
  const d = data as { label: string; imgSrc: string };
  return (
    <div
      className="rounded-xl text-center"
      style={{
        border: "1.5px solid #334155",
        background: "#0f172a",
        minWidth: 270,
        padding: "18px 20px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="flex justify-center mb-3">
        <img
          src={d.imgSrc}
          alt=""
          style={{ width: 72, height: 72, objectFit: "contain" }}
        />
      </div>
      <div className="text-sm font-semibold text-white leading-snug">
        {d.label}
      </div>
    </div>
  );
}

function StProcessBoxNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    leftImgSrc: string;
    rightImgSrcs: string[];
  };
  return (
    <div
      className="rounded-xl text-center"
      style={{
        border: "1.5px solid #334155",
        background: "#0f172a",
        padding: "14px 18px",
        minWidth: 720,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="flex items-center justify-center gap-3 mb-3">
        <img
          src={d.leftImgSrc}
          alt=""
          style={{ width: 52, height: 52, objectFit: "contain", flexShrink: 0 }}
        />
        <span className="text-slate-400 text-2xl font-thin">{"→"}</span>
        <div className="flex items-center gap-2">
          {d.rightImgSrcs.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              style={{ width: 46, height: 46, objectFit: "contain" }}
            />
          ))}
        </div>
      </div>
      <div className="text-xs font-medium text-slate-300">{d.label}</div>
    </div>
  );
}

function StTestingBadgeNode({ data }: NodeProps) {
  const d = data as { label: string; color: string };
  return (
    <div
      className="rounded-lg text-center px-5 py-2 whitespace-nowrap"
      style={{ border: `1px solid ${d.color}50`, background: "#1a1f2e" }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="text-[10px] font-semibold text-slate-400">{d.label}</div>
    </div>
  );
}

function StVariantBoxNode({ data }: NodeProps) {
  const d = data as { label: string; imgSrc: string; isWinner?: boolean };
  return (
    <div
      className="rounded-lg text-center"
      style={{
        border: `1.5px solid ${d.isWinner ? "#10b981" : "#334155"}`,
        background: d.isWinner ? "#10b98112" : "#0f172a",
        minWidth: 120,
        padding: "12px 8px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="flex justify-center mb-2">
        <img
          src={d.imgSrc}
          alt=""
          style={{ width: 44, height: 44, objectFit: "contain" }}
        />
      </div>
      <div
        className="text-[10px] font-semibold"
        style={{ color: d.isWinner ? "#10b981" : "#e2e8f0" }}
      >
        {d.label}
      </div>
    </div>
  );
}

function StConvRateNode({ data }: NodeProps) {
  const d = data as { rate: string; isWinner?: boolean };
  return (
    <div
      className="rounded-lg text-center"
      style={{
        border: `1px solid ${d.isWinner ? "#10b981" : "#1e293b"}`,
        background: d.isWinner ? "#10b98114" : "#0a0f1a",
        minWidth: 120,
        padding: "10px 8px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div
        className="font-bold text-xl"
        style={{ color: d.isWinner ? "#10b981" : "white" }}
      >
        {d.rate}
      </div>
      <div className="text-[9px] text-slate-500 mt-1">Conversion</div>
    </div>
  );
}

function StGreenBoxNode({ data }: NodeProps) {
  const d = data as { label: string };
  return (
    <div
      className="rounded-lg text-center"
      style={{
        border: "2px solid #10b981",
        background: "#10b98116",
        minWidth: 380,
        padding: "12px 20px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="text-xs font-semibold text-emerald-400 leading-relaxed">
        {d.label}
      </div>
    </div>
  );
}

function StOutcomeBoxNode({ data }: NodeProps) {
  const d = data as { label: string; imgSrc?: string; color: string };
  return (
    <div
      className="rounded-xl text-center"
      style={{
        border: `2px solid ${d.color}50`,
        background: d.color + "14",
        minWidth: 380,
        padding: "22px 20px",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ opacity: 0 }}
      />
      {d.imgSrc && (
        <div className="flex justify-center mb-4">
          <img
            src={d.imgSrc}
            alt=""
            style={{ width: 64, height: 64, objectFit: "contain" }}
          />
        </div>
      )}
      <div className="text-sm font-bold text-white leading-snug">{d.label}</div>
    </div>
  );
}

const nodeTypes = {
  titleNode: TitleNode,
  sectionNode: SectionNode,
  simpleNode: SimpleNode,
  toolNode: ToolNode,
  convNode: ConvNode,
  winnerNode: WinnerNode,
  outcomeNode: OutcomeNode,
  laneNode: LaneNode,
  labelNode: LabelNode,
  noteNode: NoteNode,
  phaseHeaderNode: PhaseHeaderNode,
  stPhaseBoxNode: StPhaseBoxNode,
  stSubtitleNode: StSubtitleNode,
  stActionBoxNode: StActionBoxNode,
  stProcessBoxNode: StProcessBoxNode,
  stTestingBadgeNode: StTestingBadgeNode,
  stVariantBoxNode: StVariantBoxNode,
  stConvRateNode: StConvRateNode,
  stGreenBoxNode: StGreenBoxNode,
  stOutcomeBoxNode: StOutcomeBoxNode,
};

// ══════════════════════════════════════════════════════════════
// DIAGRAM 1 — MARKET UNDERSTANDING
// ══════════════════════════════════════════════════════════════

const MU_NODES: Node[] = [
  {
    id: "mu-title",
    type: "titleNode",
    position: { x: 310, y: 0 },
    data: { label: "Understand Your Market" },
  },

  // 5 top branch headers
  {
    id: "mu-s1-hdr",
    type: "simpleNode",
    position: { x: 0, y: 90 },
    data: {
      label: "1: Download & Watch a Winning VSL",
      bold: true,
      color: "#6366f1",
    },
  },
  {
    id: "mu-s2-hdr",
    type: "simpleNode",
    position: { x: 200, y: 90 },
    data: {
      label: "2: Break Down the Structure",
      bold: true,
      color: "#6366f1",
    },
  },
  {
    id: "mu-s3-hdr",
    type: "simpleNode",
    position: { x: 420, y: 90 },
    data: {
      label: "3: Extract the Market Language",
      bold: true,
      color: "#6366f1",
    },
  },
  {
    id: "mu-s4-hdr",
    type: "simpleNode",
    position: { x: 640, y: 90 },
    data: {
      label: "4: Create a Quick Customer Snapshot",
      bold: true,
      color: "#6366f1",
    },
  },
  {
    id: "mu-s5-hdr",
    type: "simpleNode",
    position: { x: 880, y: 90 },
    data: {
      label: "Bonus (Optional, but Strong)",
      bold: true,
      color: "#f59e0b",
    },
  },

  // Branch 1 content
  {
    id: "mu-s1-a",
    type: "simpleNode",
    position: { x: 0, y: 190 },
    data: { label: "Download the VSL", color: "#334155" },
  },
  {
    id: "mu-s1-b",
    type: "simpleNode",
    position: { x: 0, y: 270 },
    data: { label: "Watch once as a customer", color: "#334155" },
  },
  {
    id: "mu-s1-c",
    type: "simpleNode",
    position: { x: 0, y: 350 },
    data: { label: "Write down offer pitch time", color: "#334155" },
  },

  // Branch 2 content
  {
    id: "mu-s2-a",
    type: "simpleNode",
    position: { x: 200, y: 190 },
    data: { label: "Watch again as a copywriter", color: "#334155" },
  },
  {
    id: "mu-s2-b",
    type: "sectionNode",
    position: { x: 200, y: 270 },
    data: {
      label: "Take notes!",
      color: "#334155",
      items: [
        "Hook language",
        "Problem framing",
        "Offer structure",
        "Testimonials & objections handled",
        "Visual pacing and tone",
        "Emotional trigger",
        "Main problem & pain point",
        "Solution positioning",
        "Tone (urgent, calm, optimistic, aggressive?)",
        "Core value proposition (Dream Outcome?)",
        "Hook style used (Greed, Fear, Curiosity, etc.)",
      ],
    },
  },

  // Branch 3 content
  {
    id: "mu-s3-a",
    type: "sectionNode",
    position: { x: 420, y: 190 },
    data: {
      label: "Search Sources",
      color: "#334155",
      items: [
        "Reddit, YouTube comments",
        "Facebook Ad comments",
        "Amazon reviews",
      ],
    },
  },
  {
    id: "mu-s3-b",
    type: "sectionNode",
    position: { x: 420, y: 370 },
    data: {
      label: "Look For:",
      color: "#334155",
      items: [
        "Product-related pain points",
        "Common myths or misunderstandings",
        "Things people wish existed",
        "Language customers use verbatim",
      ],
    },
  },
  {
    id: "mu-s3-c",
    type: "noteNode",
    position: { x: 420, y: 550 },
    data: {
      label:
        "Copy & paste great lines into a doc or Notion callout for future swipe.",
      color: "#334155",
    },
  },

  // Branch 4 content
  {
    id: "mu-s4-a",
    type: "sectionNode",
    position: { x: 640, y: 190 },
    data: {
      label: "Build a mini persona using what you now know",
      color: "#334155",
      items: [
        "Main Pain — 'Nothing I try ever works'",
        "Hidden Desire — 'I want to feel in control again'",
        "Emotional State — Powerless, frustrated, skeptical",
        "Key Friction — Overwhelmed by too many options",
        "Language — 'I've tried everything...'",
      ],
    },
  },

  // Branch 5 content
  {
    id: "mu-s5-a",
    type: "sectionNode",
    position: { x: 880, y: 190 },
    data: {
      label: "🌈 Wheel of Emotions",
      color: "#f59e0b",
      items: [
        "Drop emotional triggers into the Wheel of Emotions for idea mapping",
        "Frustration → Hope",
        "Skepticism → Trust",
        "Confusion → Clarity",
      ],
    },
  },
  {
    id: "mu-s5-b",
    type: "sectionNode",
    position: { x: 880, y: 420 },
    data: {
      label: "🌱 Hormozi Value Equation",
      color: "#f59e0b",
      items: [
        "Drop motivations into the Hormozi Value Equation",
        "See how you might message the offer",
        "Dream Outcome × Perceived Likelihood / Time Delay × Effort & Sacrifice",
      ],
    },
  },

  // Competitor Research
  {
    id: "mu-comp",
    type: "titleNode",
    position: { x: 290, y: 700 },
    data: { label: "Competitors Research" },
  },

  // 6 Research Platforms
  {
    id: "mu-vidtao",
    type: "toolNode",
    position: { x: 0, y: 830 },
    data: { label: "VidTao", url: "https://www.vidtao.com", color: "#6366f1" },
  },
  {
    id: "mu-spyhero",
    type: "toolNode",
    position: { x: 170, y: 830 },
    data: { label: "SPY HERO", url: "https://spy-hero.com", color: "#6366f1" },
  },
  {
    id: "mu-fblib",
    type: "toolNode",
    position: { x: 340, y: 830 },
    data: {
      label: "Facebook Ad Library",
      url: "facebook.com/ads/library",
      color: "#3b82f6",
    },
  },
  {
    id: "mu-foreplay",
    type: "toolNode",
    position: { x: 510, y: 830 },
    data: {
      label: "Foreplay",
      url: "app.foreplay.co/dashboard",
      color: "#8b5cf6",
    },
  },
  {
    id: "mu-google",
    type: "toolNode",
    position: { x: 680, y: 830 },
    data: {
      label: "Google Ads Transparency Center",
      url: "adstransparency.google.com",
      color: "#3b82f6",
    },
  },
  {
    id: "mu-ytads",
    type: "toolNode",
    position: { x: 870, y: 830 },
    data: {
      label: "YouTube Advertising",
      url: "advertising.youtube.com",
      color: "#ef4444",
    },
  },
];

const MU_EDGES: Edge[] = [
  {
    id: "e-mu-t-s1",
    source: "mu-title",
    target: "mu-s1-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-t-s2",
    source: "mu-title",
    target: "mu-s2-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-t-s3",
    source: "mu-title",
    target: "mu-s3-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-t-s4",
    source: "mu-title",
    target: "mu-s4-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-t-s5",
    source: "mu-title",
    target: "mu-s5-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s1-a",
    source: "mu-s1-hdr",
    target: "mu-s1-a",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s1-b",
    source: "mu-s1-a",
    target: "mu-s1-b",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s1-c",
    source: "mu-s1-b",
    target: "mu-s1-c",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s2-a",
    source: "mu-s2-hdr",
    target: "mu-s2-a",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s2-b",
    source: "mu-s2-a",
    target: "mu-s2-b",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s3-a",
    source: "mu-s3-hdr",
    target: "mu-s3-a",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s3-b",
    source: "mu-s3-a",
    target: "mu-s3-b",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s3-c",
    source: "mu-s3-b",
    target: "mu-s3-c",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s4-a",
    source: "mu-s4-hdr",
    target: "mu-s4-a",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s5-a",
    source: "mu-s5-hdr",
    target: "mu-s5-a",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "e-mu-s5-b",
    source: "mu-s5-a",
    target: "mu-s5-b",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "e-mu-s1c-comp",
    source: "mu-s1-c",
    target: "mu-comp",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s2b-comp",
    source: "mu-s2-b",
    target: "mu-comp",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s3c-comp",
    source: "mu-s3-c",
    target: "mu-comp",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-s4a-comp",
    source: "mu-s4-a",
    target: "mu-comp",
    style: { stroke: "#334155" },
  },
  {
    id: "e-mu-comp-vt",
    source: "mu-comp",
    target: "mu-vidtao",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "e-mu-comp-sh",
    source: "mu-comp",
    target: "mu-spyhero",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "e-mu-comp-fb",
    source: "mu-comp",
    target: "mu-fblib",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "e-mu-comp-fp",
    source: "mu-comp",
    target: "mu-foreplay",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "e-mu-comp-g",
    source: "mu-comp",
    target: "mu-google",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "e-mu-comp-yt",
    source: "mu-comp",
    target: "mu-ytads",
    animated: true,
    style: { stroke: "#ef4444" },
  },
];

// ══════════════════════════════════════════════════════════════
// DIAGRAM 2 — AD TESTING OVERVIEW
// ══════════════════════════════════════════════════════════════

const AT_NODES: Node[] = [
  // Axes
  {
    id: "at-phases-arrow",
    type: "labelNode",
    position: { x: 310, y: -50 },
    data: { label: "← Phases →", color: "#94a3b8" },
  },
  {
    id: "at-offer-label",
    type: "labelNode",
    position: { x: -130, y: 250 },
    data: { label: "Offer Validations", rotate: "-90deg", color: "#94a3b8" },
  },

  // Lane backgrounds
  {
    id: "at-lane1-bg",
    type: "laneNode",
    position: { x: 140, y: 10 },
    data: { label: "", w: 640, h: 160, color: "#ef4444" },
  },
  {
    id: "at-lane2-bg",
    type: "laneNode",
    position: { x: 140, y: 185 },
    data: { label: "", w: 640, h: 155, color: "#ef4444" },
  },
  {
    id: "at-lane3-bg",
    type: "laneNode",
    position: { x: 140, y: 355 },
    data: { label: "", w: 640, h: 210, color: "#ef4444" },
  },

  // Row labels (left)
  {
    id: "at-low-label",
    type: "simpleNode",
    position: { x: -130, y: 70 },
    data: { label: "Low Effort & Higher Speed", color: "#334155" },
  },
  {
    id: "at-med-label",
    type: "simpleNode",
    position: { x: -130, y: 240 },
    data: { label: "Medium Effort", color: "#334155" },
  },
  {
    id: "at-high-label",
    type: "simpleNode",
    position: { x: -130, y: 420 },
    data: { label: "high Effort & Lower Speed", color: "#334155" },
  },

  // Row 1 — Low Effort
  {
    id: "at-l-p1",
    type: "simpleNode",
    position: { x: 160, y: 60 },
    data: { label: "Phase 1", bold: true, color: "#334155" },
  },
  {
    id: "at-l-p2",
    type: "simpleNode",
    position: { x: 370, y: 60 },
    data: { label: "Phase 2", bold: true, color: "#334155" },
  },
  {
    id: "at-l-p3",
    type: "simpleNode",
    position: { x: 580, y: 120 },
    data: { label: "Phase 3", bold: true, color: "#334155" },
  },
  {
    id: "at-low-out",
    type: "noteNode",
    position: { x: 810, y: 50 },
    data: {
      label:
        "Lowest Effort Editing\nin order to find\nanything that's\nsticking to the wall",
      color: "#334155",
    },
  },

  // Row 2 — Medium
  {
    id: "at-m-p1",
    type: "simpleNode",
    position: { x: 160, y: 230 },
    data: { label: "Phase 1", bold: true, color: "#334155" },
  },
  {
    id: "at-m-p2",
    type: "simpleNode",
    position: { x: 370, y: 230 },
    data: { label: "Phase 2", bold: true, color: "#334155" },
  },
  {
    id: "at-m-p3",
    type: "simpleNode",
    position: { x: 580, y: 230 },
    data: { label: "Phase 3", bold: true, color: "#334155" },
  },
  {
    id: "at-med-out",
    type: "noteNode",
    position: { x: 810, y: 215 },
    data: {
      label:
        "Check if more effort\nmakes improvements /\nKeeps Ads Alive for\nLonger",
      color: "#334155",
    },
  },

  // Row 3 — High Effort
  {
    id: "at-h-p3-top",
    type: "simpleNode",
    position: { x: 580, y: 375 },
    data: { label: "Phase 3", bold: true, color: "#334155" },
  },
  {
    id: "at-h-p1",
    type: "simpleNode",
    position: { x: 160, y: 460 },
    data: { label: "Phase 1", bold: true, color: "#334155" },
  },
  {
    id: "at-h-p2",
    type: "simpleNode",
    position: { x: 370, y: 460 },
    data: { label: "Phase 2", bold: true, color: "#334155" },
  },
  {
    id: "at-h-p3",
    type: "simpleNode",
    position: { x: 580, y: 460 },
    data: { label: "Phase 3", bold: true, color: "#334155" },
  },
  {
    id: "at-high-out",
    type: "noteNode",
    position: { x: 810, y: 440 },
    data: { label: "Squeeze Profits", color: "#334155" },
  },
];

const AT_EDGES: Edge[] = [
  {
    id: "at-l-p1-p2",
    source: "at-l-p1",
    target: "at-l-p2",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-l-p2-p3",
    source: "at-l-p2",
    target: "at-l-p3",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-l-p3-out",
    source: "at-l-p3",
    target: "at-low-out",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-l-loop",
    source: "at-l-p3",
    target: "at-m-p1",
    style: { stroke: "#94a3b8", strokeDasharray: "3 3" },
  },
  {
    id: "at-m-p1-p2",
    source: "at-m-p1",
    target: "at-m-p2",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-m-p2-p3",
    source: "at-m-p2",
    target: "at-m-p3",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-m-p3-out",
    source: "at-m-p3",
    target: "at-med-out",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-m-p3-htop",
    source: "at-m-p3",
    target: "at-h-p3-top",
    style: { stroke: "#94a3b8", strokeDasharray: "3 3" },
  },
  {
    id: "at-h-ptop-hp3",
    source: "at-h-p3-top",
    target: "at-h-p3",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-h-p1-p2",
    source: "at-h-p1",
    target: "at-h-p2",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-h-p2-p3",
    source: "at-h-p2",
    target: "at-h-p3",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-h-p3-out",
    source: "at-h-p3",
    target: "at-high-out",
    style: { stroke: "#94a3b8" },
  },
  {
    id: "at-h-p3-loop",
    source: "at-h-p3",
    target: "at-h-p1",
    style: { stroke: "#94a3b8", strokeDasharray: "3 3" },
  },
  {
    id: "at-low-ll",
    source: "at-low-label",
    target: "at-l-p1",
    style: { stroke: "#334155" },
  },
  {
    id: "at-med-ll",
    source: "at-med-label",
    target: "at-m-p1",
    style: { stroke: "#334155" },
  },
  {
    id: "at-high-ll",
    source: "at-high-label",
    target: "at-h-p1",
    style: { stroke: "#334155" },
  },
];

// ══════════════════════════════════════════════════════════════
// DIAGRAM 3 — SCRIPT TESTING GUIDE
// ══════════════════════════════════════════════════════════════

// ── Column base x-offsets (3 phases side-by-side, each 720px wide + 100px gap)
const P1 = 0,
  P2 = 820,
  P3 = 1640;
// ── Shared y-positions (same for all phases)
const SY = {
  box: 0,
  sub: 78,
  action: 145,
  proc: 310,
  badge: 454,
  v: 522,
  c: 652,
  green: 744,
  out: 832,
};
// ── Variant x-offsets within a phase column (120px each, 30px gap)
const VX = [0, 150, 300, 450, 600];

const ST_NODES: Node[] = [
  // ── Guide Title (centered above all 3 phases) ──────────────────────────────
  {
    id: "st-guide-title",
    type: "titleNode",
    position: { x: P2 + 230, y: -90 },
    data: { label: "Script Testing Guide" },
  },

  // ══ PHASE 1 — Test Script (violet) ════════════════════════════════════════
  {
    id: "st-p1-box",
    type: "stPhaseBoxNode",
    position: { x: P1 + 260, y: SY.box },
    data: { label: "Phase 1", color: "#6366f1" },
  },
  {
    id: "st-p1-sub",
    type: "stSubtitleNode",
    position: { x: P1 + 230, y: SY.sub },
    data: { text: "Test if the script brings conversions by itself" },
  },
  {
    id: "st-p1-write",
    type: "stActionBoxNode",
    position: { x: P1 + 225, y: SY.action },
    data: { label: "Write multiple scripts", imgSrc: ICONS.scriptP1 },
  },
  {
    id: "st-p1-create",
    type: "stProcessBoxNode",
    position: { x: P1, y: SY.proc },
    data: {
      label: "Create Videos with Captions",
      leftImgSrc: ICONS.scriptP1,
      rightImgSrcs: [
        ICONS.videoScriptP1,
        ICONS.videoScriptP1,
        ICONS.videoScriptP1,
        ICONS.videoScriptP1,
        ICONS.videoScriptP1,
      ],
    },
  },
  {
    id: "st-p1-badge",
    type: "stTestingBadgeNode",
    position: { x: P1 + 280, y: SY.badge },
    data: { label: "Script Ad-Testing", color: "#6366f1" },
  },
  {
    id: "st-p1-v1",
    type: "stVariantBoxNode",
    position: { x: P1 + VX[0], y: SY.v },
    data: { label: "Script 1", imgSrc: ICONS.videoScriptP1 },
  },
  {
    id: "st-p1-v2",
    type: "stVariantBoxNode",
    position: { x: P1 + VX[1], y: SY.v },
    data: { label: "Script 2", imgSrc: ICONS.videoScriptP1 },
  },
  {
    id: "st-p1-v3",
    type: "stVariantBoxNode",
    position: { x: P1 + VX[2], y: SY.v },
    data: { label: "Script 3", imgSrc: ICONS.videoScriptP1Win, isWinner: true },
  },
  {
    id: "st-p1-v4",
    type: "stVariantBoxNode",
    position: { x: P1 + VX[3], y: SY.v },
    data: { label: "Script 4", imgSrc: ICONS.videoScriptP1 },
  },
  {
    id: "st-p1-v5",
    type: "stVariantBoxNode",
    position: { x: P1 + VX[4], y: SY.v },
    data: { label: "Script 5", imgSrc: ICONS.videoScriptP1 },
  },
  {
    id: "st-p1-c1",
    type: "stConvRateNode",
    position: { x: P1 + VX[0], y: SY.c },
    data: { rate: "6.2%" },
  },
  {
    id: "st-p1-c2",
    type: "stConvRateNode",
    position: { x: P1 + VX[1], y: SY.c },
    data: { rate: "6.5%" },
  },
  {
    id: "st-p1-c3",
    type: "stConvRateNode",
    position: { x: P1 + VX[2], y: SY.c },
    data: { rate: "9.5%", isWinner: true },
  },
  {
    id: "st-p1-c4",
    type: "stConvRateNode",
    position: { x: P1 + VX[3], y: SY.c },
    data: { rate: "3.7%" },
  },
  {
    id: "st-p1-c5",
    type: "stConvRateNode",
    position: { x: P1 + VX[4], y: SY.c },
    data: { rate: "2.4%" },
  },
  {
    id: "st-p1-winner",
    type: "stGreenBoxNode",
    position: { x: P1 + 170, y: SY.green },
    data: { label: "Winner!" },
  },
  {
    id: "st-p1-outcome",
    type: "stOutcomeBoxNode",
    position: { x: P1 + 170, y: SY.out },
    data: {
      label: "Converting Script goes to Phase 2",
      imgSrc: ICONS.videoScriptP1,
      color: "#6366f1",
    },
  },

  // ══ PHASE 2 — Test Hooks (amber) ══════════════════════════════════════════
  {
    id: "st-p2-box",
    type: "stPhaseBoxNode",
    position: { x: P2 + 260, y: SY.box },
    data: { label: "Phase 2", color: "#f59e0b" },
  },
  {
    id: "st-p2-sub",
    type: "stSubtitleNode",
    position: { x: P2 + 230, y: SY.sub },
    data: { text: "Test if other hooks grab more attention" },
  },
  {
    id: "st-p2-angler",
    type: "stActionBoxNode",
    position: { x: P2 + 225, y: SY.action },
    data: { label: "Test several hooks", imgSrc: ICONS.anglerP2 },
  },
  {
    id: "st-p2-create",
    type: "stProcessBoxNode",
    position: { x: P2, y: SY.proc },
    data: {
      label: "Attach several hook variants to the winning script",
      leftImgSrc: ICONS.scriptAngelP2,
      rightImgSrcs: [
        ICONS.hook1P2,
        ICONS.hook2P2,
        ICONS.hook3P2,
        ICONS.hook4P2,
        ICONS.hook5P2,
      ],
    },
  },
  {
    id: "st-p2-badge",
    type: "stTestingBadgeNode",
    position: { x: P2 + 280, y: SY.badge },
    data: { label: "Hook Ad-Testing", color: "#f59e0b" },
  },
  {
    id: "st-p2-v1",
    type: "stVariantBoxNode",
    position: { x: P2 + VX[0], y: SY.v },
    data: { label: "Hook 1", imgSrc: ICONS.hook1P2 },
  },
  {
    id: "st-p2-v2",
    type: "stVariantBoxNode",
    position: { x: P2 + VX[1], y: SY.v },
    data: { label: "Hook 2", imgSrc: ICONS.hook2P2 },
  },
  {
    id: "st-p2-v3",
    type: "stVariantBoxNode",
    position: { x: P2 + VX[2], y: SY.v },
    data: { label: "Hook 3", imgSrc: ICONS.hook3P2Win, isWinner: true },
  },
  {
    id: "st-p2-v4",
    type: "stVariantBoxNode",
    position: { x: P2 + VX[3], y: SY.v },
    data: { label: "Hook 4", imgSrc: ICONS.hook4P2 },
  },
  {
    id: "st-p2-v5",
    type: "stVariantBoxNode",
    position: { x: P2 + VX[4], y: SY.v },
    data: { label: "Hook 5", imgSrc: ICONS.hook5P2 },
  },
  {
    id: "st-p2-c1",
    type: "stConvRateNode",
    position: { x: P2 + VX[0], y: SY.c },
    data: { rate: "6.2%" },
  },
  {
    id: "st-p2-c2",
    type: "stConvRateNode",
    position: { x: P2 + VX[1], y: SY.c },
    data: { rate: "6.5%" },
  },
  {
    id: "st-p2-c3",
    type: "stConvRateNode",
    position: { x: P2 + VX[2], y: SY.c },
    data: { rate: "9.5%", isWinner: true },
  },
  {
    id: "st-p2-c4",
    type: "stConvRateNode",
    position: { x: P2 + VX[3], y: SY.c },
    data: { rate: "3.7%" },
  },
  {
    id: "st-p2-c5",
    type: "stConvRateNode",
    position: { x: P2 + VX[4], y: SY.c },
    data: { rate: "2.4%" },
  },
  {
    id: "st-p2-filter",
    type: "stGreenBoxNode",
    position: { x: P2 + 170, y: SY.green },
    data: {
      label:
        "Filter which hook gets the most attention from the right audience",
    },
  },
  {
    id: "st-p2-outcome",
    type: "stOutcomeBoxNode",
    position: { x: P2 + 170, y: SY.out },
    data: {
      label: "Converting Script with best Hook goes to Phase 3",
      imgSrc: ICONS.funnelFischeP2,
      color: "#f59e0b",
    },
  },

  // ══ PHASE 3 — Test Visuals (emerald) ══════════════════════════════════════
  {
    id: "st-p3-box",
    type: "stPhaseBoxNode",
    position: { x: P3 + 260, y: SY.box },
    data: { label: "Phase 3", color: "#10b981" },
  },
  {
    id: "st-p3-sub",
    type: "stSubtitleNode",
    position: { x: P3 + 230, y: SY.sub },
    data: { text: "Different Visuals, with Higher Quality Editing" },
  },
  {
    id: "st-p3-use",
    type: "stActionBoxNode",
    position: { x: P3 + 225, y: SY.action },
    data: {
      label: "Use Winning Script with Winning Hooks",
      imgSrc: ICONS.anDerAngelP3,
    },
  },
  {
    id: "st-p3-create",
    type: "stProcessBoxNode",
    position: { x: P3, y: SY.proc },
    data: {
      label: "Create new visually appealing videos",
      leftImgSrc: ICONS.funnelFischeP3,
      rightImgSrcs: [
        ICONS.cinemaP3,
        ICONS.cinemaP3,
        ICONS.cinemaP3,
        ICONS.cinemaP3,
        ICONS.cinemaP3,
      ],
    },
  },
  {
    id: "st-p3-badge",
    type: "stTestingBadgeNode",
    position: { x: P3 + 280, y: SY.badge },
    data: { label: "Visual Ad-Testing", color: "#10b981" },
  },
  {
    id: "st-p3-v1",
    type: "stVariantBoxNode",
    position: { x: P3 + VX[0], y: SY.v },
    data: { label: "Visual 1", imgSrc: ICONS.cinemaP3 },
  },
  {
    id: "st-p3-v2",
    type: "stVariantBoxNode",
    position: { x: P3 + VX[1], y: SY.v },
    data: { label: "Visual 2", imgSrc: ICONS.cinemaP3 },
  },
  {
    id: "st-p3-v3",
    type: "stVariantBoxNode",
    position: { x: P3 + VX[2], y: SY.v },
    data: { label: "Visual 3", imgSrc: ICONS.cinemaP3, isWinner: true },
  },
  {
    id: "st-p3-v4",
    type: "stVariantBoxNode",
    position: { x: P3 + VX[3], y: SY.v },
    data: { label: "Visual 4", imgSrc: ICONS.cinemaP3 },
  },
  {
    id: "st-p3-v5",
    type: "stVariantBoxNode",
    position: { x: P3 + VX[4], y: SY.v },
    data: { label: "Visual 5", imgSrc: ICONS.cinemaP3 },
  },
  {
    id: "st-p3-c1",
    type: "stConvRateNode",
    position: { x: P3 + VX[0], y: SY.c },
    data: { rate: "6.2%" },
  },
  {
    id: "st-p3-c2",
    type: "stConvRateNode",
    position: { x: P3 + VX[1], y: SY.c },
    data: { rate: "6.5%" },
  },
  {
    id: "st-p3-c3",
    type: "stConvRateNode",
    position: { x: P3 + VX[2], y: SY.c },
    data: { rate: "9.5%", isWinner: true },
  },
  {
    id: "st-p3-c4",
    type: "stConvRateNode",
    position: { x: P3 + VX[3], y: SY.c },
    data: { rate: "3.7%" },
  },
  {
    id: "st-p3-c5",
    type: "stConvRateNode",
    position: { x: P3 + VX[4], y: SY.c },
    data: { rate: "2.4%" },
  },
  {
    id: "st-p3-compare",
    type: "stGreenBoxNode",
    position: { x: P3 + 170, y: SY.green },
    data: {
      label: "Compare Performance: How much does quality influence the result?",
    },
  },
  {
    id: "st-p3-outcome",
    type: "stOutcomeBoxNode",
    position: { x: P3 + 170, y: SY.out },
    data: {
      label: "Outcome is Your Winning Ad",
      imgSrc: ICONS.drehbuchFischP3,
      color: "#10b981",
    },
  },
];

const ST_EDGES: Edge[] = [
  // Guide title → all 3 phase boxes
  {
    id: "st-title-p1",
    source: "st-guide-title",
    target: "st-p1-box",
    style: { stroke: "#6366f150" },
  },
  {
    id: "st-title-p2",
    source: "st-guide-title",
    target: "st-p2-box",
    style: { stroke: "#f59e0b50" },
  },
  {
    id: "st-title-p3",
    source: "st-guide-title",
    target: "st-p3-box",
    style: { stroke: "#10b98150" },
  },

  // ── Phase 1 ────────────────────────────────────────────────────────────────
  {
    id: "st-p1-box-sub",
    source: "st-p1-box",
    target: "st-p1-sub",
    style: { stroke: "#6366f1" },
  },
  {
    id: "st-p1-sub-wr",
    source: "st-p1-sub",
    target: "st-p1-write",
    style: { stroke: "#6366f1" },
  },
  {
    id: "st-p1-wr-cr",
    source: "st-p1-write",
    target: "st-p1-create",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "st-p1-cr-bd",
    source: "st-p1-create",
    target: "st-p1-badge",
    style: { stroke: "#6366f1" },
  },
  {
    id: "st-p1-bd-v1",
    source: "st-p1-badge",
    target: "st-p1-v1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-bd-v2",
    source: "st-p1-badge",
    target: "st-p1-v2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-bd-v3",
    source: "st-p1-badge",
    target: "st-p1-v3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p1-bd-v4",
    source: "st-p1-badge",
    target: "st-p1-v4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-bd-v5",
    source: "st-p1-badge",
    target: "st-p1-v5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-v1-c1",
    source: "st-p1-v1",
    target: "st-p1-c1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-v2-c2",
    source: "st-p1-v2",
    target: "st-p1-c2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-v3-c3",
    source: "st-p1-v3",
    target: "st-p1-c3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p1-v4-c4",
    source: "st-p1-v4",
    target: "st-p1-c4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-v5-c5",
    source: "st-p1-v5",
    target: "st-p1-c5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p1-c3-win",
    source: "st-p1-c3",
    target: "st-p1-winner",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p1-win-out",
    source: "st-p1-winner",
    target: "st-p1-outcome",
    style: { stroke: "#10b981" },
  },

  // ── Phase 2 ────────────────────────────────────────────────────────────────
  {
    id: "st-p2-box-sub",
    source: "st-p2-box",
    target: "st-p2-sub",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "st-p2-sub-ang",
    source: "st-p2-sub",
    target: "st-p2-angler",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "st-p2-ang-cr",
    source: "st-p2-angler",
    target: "st-p2-create",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "st-p2-cr-bd",
    source: "st-p2-create",
    target: "st-p2-badge",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "st-p2-bd-v1",
    source: "st-p2-badge",
    target: "st-p2-v1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-bd-v2",
    source: "st-p2-badge",
    target: "st-p2-v2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-bd-v3",
    source: "st-p2-badge",
    target: "st-p2-v3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p2-bd-v4",
    source: "st-p2-badge",
    target: "st-p2-v4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-bd-v5",
    source: "st-p2-badge",
    target: "st-p2-v5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-v1-c1",
    source: "st-p2-v1",
    target: "st-p2-c1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-v2-c2",
    source: "st-p2-v2",
    target: "st-p2-c2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-v3-c3",
    source: "st-p2-v3",
    target: "st-p2-c3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p2-v4-c4",
    source: "st-p2-v4",
    target: "st-p2-c4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-v5-c5",
    source: "st-p2-v5",
    target: "st-p2-c5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p2-c3-fil",
    source: "st-p2-c3",
    target: "st-p2-filter",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p2-fil-out",
    source: "st-p2-filter",
    target: "st-p2-outcome",
    style: { stroke: "#10b981" },
  },

  // ── Phase 3 ────────────────────────────────────────────────────────────────
  {
    id: "st-p3-box-sub",
    source: "st-p3-box",
    target: "st-p3-sub",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-sub-use",
    source: "st-p3-sub",
    target: "st-p3-use",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-use-cr",
    source: "st-p3-use",
    target: "st-p3-create",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-cr-bd",
    source: "st-p3-create",
    target: "st-p3-badge",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-bd-v1",
    source: "st-p3-badge",
    target: "st-p3-v1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-bd-v2",
    source: "st-p3-badge",
    target: "st-p3-v2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-bd-v3",
    source: "st-p3-badge",
    target: "st-p3-v3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-bd-v4",
    source: "st-p3-badge",
    target: "st-p3-v4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-bd-v5",
    source: "st-p3-badge",
    target: "st-p3-v5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-v1-c1",
    source: "st-p3-v1",
    target: "st-p3-c1",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-v2-c2",
    source: "st-p3-v2",
    target: "st-p3-c2",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-v3-c3",
    source: "st-p3-v3",
    target: "st-p3-c3",
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-v4-c4",
    source: "st-p3-v4",
    target: "st-p3-c4",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-v5-c5",
    source: "st-p3-v5",
    target: "st-p3-c5",
    style: { stroke: "#334155" },
  },
  {
    id: "st-p3-c3-cmp",
    source: "st-p3-c3",
    target: "st-p3-compare",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "st-p3-cmp-out",
    source: "st-p3-compare",
    target: "st-p3-outcome",
    style: { stroke: "#10b981" },
  },
];

// ══════════════════════════════════════════════════════════════
// DIAGRAM 4 — BIG SWINGS
// ══════════════════════════════════════════════════════════════

const BIG_NODES: Node[] = [
  {
    id: "bs-title",
    type: "titleNode",
    position: { x: 430, y: 0 },
    data: { label: "Big Swings" },
  },

  // ── Emotional Direction Change (left column, x 0–290) ──────────────────────
  {
    id: "bs-emo-hdr",
    type: "simpleNode",
    position: { x: 50, y: 90 },
    data: { label: "Emotional Direction Change", bold: true, color: "#ef4444" },
  },
  {
    id: "bs-emo-change",
    type: "simpleNode",
    position: { x: -165, y: 270 },
    data: { label: "Change the emotion being triggered", color: "#334155" },
  },
  // Pair row 1
  {
    id: "bs-emo-frust",
    type: "simpleNode",
    position: { x: 70, y: 185 },
    data: { label: "😤 Frustration", color: "#ef4444" },
  },
  {
    id: "bs-emo-hope",
    type: "simpleNode",
    position: { x: 185, y: 185 },
    data: { label: "Hope 🙌", color: "#10b981" },
  },
  // Pair row 2
  {
    id: "bs-emo-skep",
    type: "simpleNode",
    position: { x: 70, y: 275 },
    data: { label: "🤨 Skepticism", color: "#ef4444" },
  },
  {
    id: "bs-emo-trust",
    type: "simpleNode",
    position: { x: 185, y: 275 },
    data: { label: "Trust 🤝", color: "#10b981" },
  },
  // Pair row 3
  {
    id: "bs-emo-conf",
    type: "simpleNode",
    position: { x: 70, y: 365 },
    data: { label: "😕 Confusion", color: "#ef4444" },
  },
  {
    id: "bs-emo-clarity",
    type: "simpleNode",
    position: { x: 185, y: 365 },
    data: { label: "Clarity 🔍", color: "#10b981" },
  },

  // ── Persona Branching Ads (center column, x 330–640) ──────────────────────
  {
    id: "bs-per-hdr",
    type: "simpleNode",
    position: { x: 375, y: 90 },
    data: { label: "Persona Branching Ads", bold: true, color: "#f59e0b" },
  },
  {
    id: "bs-per-sub",
    type: "noteNode",
    position: { x: 335, y: 165 },
    data: {
      label: "same ad framework tailored for different segments",
      color: "#f59e0b",
    },
  },
  // 3 items side-by-side
  {
    id: "bs-per-persona",
    type: "simpleNode",
    position: { x: 330, y: 290 },
    data: { label: "👤 Persona", color: "#334155" },
  },
  {
    id: "bs-per-hook",
    type: "simpleNode",
    position: { x: 450, y: 290 },
    data: { label: "🪝 Hook / Angle", color: "#334155" },
  },
  {
    id: "bs-per-visual",
    type: "simpleNode",
    position: { x: 560, y: 290 },
    data: { label: "🖼️ Visual / Copy Adjustment", color: "#334155" },
  },

  // ── Script Angle Shift (right column, x 690–960) ──────────────────────────
  {
    id: "bs-ang-hdr",
    type: "simpleNode",
    position: { x: 750, y: 90 },
    data: { label: "Script Angle Shift", bold: true, color: "#8b5cf6" },
  },
  // Row 1 — top three
  {
    id: "bs-ang-reframe",
    type: "simpleNode",
    position: { x: 690, y: 190 },
    data: { label: "Reframe pain", color: "#334155" },
  },
  {
    id: "bs-ang-promise",
    type: "simpleNode",
    position: { x: 810, y: 190 },
    data: { label: "promise", color: "#334155" },
  },
  {
    id: "bs-ang-shock",
    type: "simpleNode",
    position: { x: 920, y: 190 },
    data: { label: "shock-first", color: "#334155" },
  },
  // Row 2 — bottom three
  {
    id: "bs-ang-mech",
    type: "simpleNode",
    position: { x: 690, y: 290 },
    data: { label: "mechanism", color: "#334155" },
  },
  {
    id: "bs-ang-story",
    type: "simpleNode",
    position: { x: 810, y: 290 },
    data: { label: "story-first", color: "#334155" },
  },
  {
    id: "bs-ang-cont",
    type: "simpleNode",
    position: { x: 920, y: 290 },
    data: { label: "contrarian", color: "#334155" },
  },

  // ── Format Variation (BELOW all 3 sections, centered) ─────────────────────
  {
    id: "bs-fmt-hdr",
    type: "simpleNode",
    position: { x: 420, y: 450 },
    data: { label: "Format Variation", bold: true, color: "#3b82f6" },
  },
  // Row 1
  {
    id: "bs-fmt-vsl",
    type: "simpleNode",
    position: { x: 270, y: 540 },
    data: { label: "VSL", color: "#334155" },
  },
  {
    id: "bs-fmt-green",
    type: "simpleNode",
    position: { x: 420, y: 540 },
    data: { label: "Greenscreen", color: "#334155" },
  },
  {
    id: "bs-fmt-carousel",
    type: "simpleNode",
    position: { x: 580, y: 540 },
    data: { label: "Carousel", color: "#334155" },
  },
  // Row 2
  {
    id: "bs-fmt-ugc",
    type: "simpleNode",
    position: { x: 270, y: 625 },
    data: { label: "UGC", color: "#334155" },
  },
  {
    id: "bs-fmt-ai",
    type: "simpleNode",
    position: { x: 420, y: 625 },
    data: { label: "AI Avatar", color: "#334155" },
  },
  {
    id: "bs-fmt-meme",
    type: "simpleNode",
    position: { x: 580, y: 625 },
    data: { label: "Meme / Skit", color: "#334155" },
  },
  // Row 3
  {
    id: "bs-fmt-static",
    type: "simpleNode",
    position: { x: 340, y: 710 },
    data: { label: "Static", color: "#334155" },
  },
  {
    id: "bs-fmt-reels",
    type: "simpleNode",
    position: { x: 490, y: 710 },
    data: { label: "Reels", color: "#334155" },
  },
];

const BIG_EDGES: Edge[] = [
  // Title → 3 section headers
  {
    id: "bs-t-emo",
    source: "bs-title",
    target: "bs-emo-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "bs-t-per",
    source: "bs-title",
    target: "bs-per-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "bs-t-ang",
    source: "bs-title",
    target: "bs-ang-hdr",
    style: { stroke: "#334155" },
  },
  // 3 section headers → Format Variation
  {
    id: "bs-emo-fmt",
    source: "bs-emo-hdr",
    target: "bs-fmt-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "bs-per-fmt",
    source: "bs-per-hdr",
    target: "bs-fmt-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "bs-ang-fmt",
    source: "bs-ang-hdr",
    target: "bs-fmt-hdr",
    style: { stroke: "#334155" },
  },

  // Emotional Direction Change → label → 3 source emotions → paired targets
  {
    id: "bs-emo-ch",
    source: "bs-emo-hdr",
    target: "bs-emo-change",
    style: { stroke: "#ef4444" },
  },
  {
    id: "bs-ch-fr",
    source: "bs-emo-change",
    target: "bs-emo-frust",
    animated: true,
    style: { stroke: "#ef4444" },
  },
  {
    id: "bs-ch-sk",
    source: "bs-emo-change",
    target: "bs-emo-skep",
    animated: true,
    style: { stroke: "#ef4444" },
  },
  {
    id: "bs-ch-co",
    source: "bs-emo-change",
    target: "bs-emo-conf",
    animated: true,
    style: { stroke: "#ef4444" },
  },
  {
    id: "bs-fr-hope",
    source: "bs-emo-frust",
    target: "bs-emo-hope",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "bs-sk-trust",
    source: "bs-emo-skep",
    target: "bs-emo-trust",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "bs-co-clar",
    source: "bs-emo-conf",
    target: "bs-emo-clarity",
    animated: true,
    style: { stroke: "#10b981" },
  },

  // Persona Branching Ads → note → 3 items side-by-side
  {
    id: "bs-per-sub-e",
    source: "bs-per-hdr",
    target: "bs-per-sub",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "bs-per-sub-p",
    source: "bs-per-sub",
    target: "bs-per-persona",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "bs-per-sub-h",
    source: "bs-per-sub",
    target: "bs-per-hook",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "bs-per-sub-v",
    source: "bs-per-sub",
    target: "bs-per-visual",
    animated: true,
    style: { stroke: "#f59e0b" },
  },

  // Script Angle Shift → 6 items (3×2 grid, all from header)
  {
    id: "bs-ang-rf",
    source: "bs-ang-hdr",
    target: "bs-ang-reframe",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "bs-ang-pr",
    source: "bs-ang-hdr",
    target: "bs-ang-promise",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "bs-ang-sh",
    source: "bs-ang-hdr",
    target: "bs-ang-shock",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "bs-ang-mc",
    source: "bs-ang-hdr",
    target: "bs-ang-mech",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "bs-ang-st",
    source: "bs-ang-hdr",
    target: "bs-ang-story",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "bs-ang-cn",
    source: "bs-ang-hdr",
    target: "bs-ang-cont",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },

  // Format Variation → 8 format nodes (3 rows)
  {
    id: "bs-fmt-v",
    source: "bs-fmt-hdr",
    target: "bs-fmt-vsl",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-g",
    source: "bs-fmt-hdr",
    target: "bs-fmt-green",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-c",
    source: "bs-fmt-hdr",
    target: "bs-fmt-carousel",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-u",
    source: "bs-fmt-hdr",
    target: "bs-fmt-ugc",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-a",
    source: "bs-fmt-hdr",
    target: "bs-fmt-ai",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-m",
    source: "bs-fmt-hdr",
    target: "bs-fmt-meme",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-s",
    source: "bs-fmt-hdr",
    target: "bs-fmt-static",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
  {
    id: "bs-fmt-r",
    source: "bs-fmt-hdr",
    target: "bs-fmt-reels",
    animated: true,
    style: { stroke: "#3b82f6" },
  },
];

// ══════════════════════════════════════════════════════════════
// DIAGRAM 5 — CONTROLLED SWINGS
// ══════════════════════════════════════════════════════════════

// Column X anchors
const CSX = { hook: 60, hookTypes: 310, hl: 650, mech: 980, offer: 1310 };

const CS_NODES: Node[] = [
  {
    id: "cs-title",
    type: "titleNode",
    position: { x: 650, y: 0 },
    data: { label: "Controlled Swings" },
  },

  // ══ HOOK — left sub-tree ══════════════════════════════════════════════════
  {
    id: "cs-hook-hdr",
    type: "phaseHeaderNode",
    position: { x: CSX.hook, y: 90 },
    data: { label: "Hook", color: "#6366f1" },
  },
  {
    id: "cs-hook-note",
    type: "noteNode",
    position: { x: CSX.hook, y: 155 },
    data: { label: "Almost Everything can become a Hook", color: "#6366f1" },
  },
  {
    id: "cs-hook-first3",
    type: "simpleNode",
    position: { x: CSX.hook + 15, y: 240 },
    data: { label: "Change the first 3 seconds", bold: true, color: "#6366f1" },
  },

  // visual (left) / copy (right)
  {
    id: "cs-hook-vis",
    type: "simpleNode",
    position: { x: CSX.hook - 55, y: 345 },
    data: { label: "visual", color: "#334155" },
  },
  {
    id: "cs-hook-copy",
    type: "simpleNode",
    position: { x: CSX.hook + 165, y: 345 },
    data: { label: "copy", color: "#334155" },
  },

  // visual → Captions AI (left) + Pattern Interruption (right)
  {
    id: "cs-cap-ai",
    type: "simpleNode",
    position: { x: CSX.hook - 145, y: 445 },
    data: { label: "Captions AI\nUGC Hooks", color: "#334155" },
  },
  {
    id: "cs-pattern",
    type: "simpleNode",
    position: { x: CSX.hook + 15, y: 445 },
    data: { label: "Pattern\nInterruption", color: "#334155" },
  },
  // timelines under Captions AI & Pattern Interruption
  {
    id: "cs-tl-cap",
    type: "noteNode",
    position: { x: CSX.hook - 170, y: 535 },
    data: { label: "[ AI UGC Avatar ]  →  Ad", color: "#6366f1" },
  },
  {
    id: "cs-tl-pat",
    type: "noteNode",
    position: { x: CSX.hook - 10, y: 535 },
    data: { label: "[ Zoom In & out Hook ]  →  Ad", color: "#6366f1" },
  },

  // visual → Opus Hooks / Hook Cuts (below both cap-ai & pattern)
  {
    id: "cs-opus",
    type: "simpleNode",
    position: { x: CSX.hook - 65, y: 635 },
    data: { label: "Opus Hooks\n/ Hook Cuts", color: "#334155", bold: true },
  },
  {
    id: "cs-tl-opus",
    type: "noteNode",
    position: { x: CSX.hook - 100, y: 725 },
    data: {
      label:
        "[ Highlight - Hook ]  ←  [ Highlight from the End or the middle of the Ad ]",
      color: "#6366f1",
    },
  },

  // Opus Hooks → Fast Cuts (left) + Motion Graphic (right)
  {
    id: "cs-fast",
    type: "simpleNode",
    position: { x: CSX.hook - 155, y: 825 },
    data: { label: "Fast Cuts\nFlash Hook", color: "#334155" },
  },
  {
    id: "cs-motion",
    type: "simpleNode",
    position: { x: CSX.hook + 20, y: 825 },
    data: { label: "Motion Graphic Hook", color: "#334155" },
  },
  {
    id: "cs-tl-fast",
    type: "noteNode",
    position: { x: CSX.hook - 180, y: 915 },
    data: { label: "[ Quick flashes of scenes ]  →  Ad", color: "#6366f1" },
  },
  {
    id: "cs-tl-mot",
    type: "noteNode",
    position: { x: CSX.hook - 5, y: 915 },
    data: { label: "[ Use animated text or icons ]  →  Ad", color: "#6366f1" },
  },

  // ══ HOOK — right card column (9 hook types, 150 px gap) ══════════════════
  {
    id: "cs-neg",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 90 },
    data: {
      label: "😤  Negative Hook",
      color: "#6366f1",
      items: [
        "Start with a problem",
        "Highlight pain or fear",
        "Make them feel urgency",
        '"You\'re doing this wrong..."',
      ],
    },
  },
  {
    id: "cs-que",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 250 },
    data: {
      label: "🤔  Question Hook",
      color: "#6366f1",
      items: [
        "Ask a relatable question",
        "Simple and direct",
        "Answer it right after",
        '"Have you ever...?"',
      ],
    },
  },
  {
    id: "cs-quot",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 410 },
    data: {
      label: "💬  Quotation Hook",
      color: "#6366f1",
      items: [
        "Use a powerful quote",
        "Explode its meaning",
        '"Quote + what it means"',
      ],
    },
  },
  {
    id: "cs-stat-hk",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 545 },
    data: {
      label: "📊  Statistic Hook",
      color: "#6366f1",
      items: [
        "Start with a real stat",
        "Include % or numbers",
        "Explain the takeaway",
        '"Only 0.001%..."',
      ],
    },
  },
  {
    id: "cs-anec",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 705 },
    data: {
      label: "📖  Anecdotal Hook",
      color: "#6366f1",
      items: [
        "Share a short story",
        "Can be personal or made-up",
        "Tie it to your message",
        '"In high school, I..."',
      ],
    },
  },
  {
    id: "cs-cur",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 865 },
    data: {
      label: "👁️  Curiosity Hook",
      color: "#6366f1",
      items: [
        "Say something unexpected",
        "Leave them needing more",
        '"They didn\'t want me to show you..."',
      ],
    },
  },
  {
    id: "cs-con",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 1005 },
    data: {
      label: "🔥  Controversial Hook",
      color: "#6366f1",
      items: [
        "Challenge a belief or norm",
        "Creates tension + ideas",
        "Avoid giving full context",
        '"Doctors are wrong about this..."',
      ],
    },
  },
  {
    id: "cs-pro",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 1165 },
    data: {
      label: "🤝  Promise Hook",
      color: "#6366f1",
      items: [
        "Make a bold promise",
        "Creates value instantly",
        "Best when followed by proof",
        '"Lose 5kg without changing your diet"',
      ],
    },
  },
  {
    id: "cs-res",
    type: "sectionNode",
    position: { x: CSX.hookTypes, y: 1325 },
    data: {
      label: "🏆  Result-Oriented Hook",
      color: "#6366f1",
      items: [
        "Lead with outcome",
        "Start with the end result",
        "Implies solution already exists",
        '"Here\'s how I made $10k in 30 days"',
      ],
    },
  },

  // ══ HEADLINE column ══════════════════════════════════════════════════════
  {
    id: "cs-hl-hdr",
    type: "phaseHeaderNode",
    position: { x: CSX.hl, y: 90 },
    data: { label: "Headline", color: "#f59e0b" },
  },
  {
    id: "cs-hl-note",
    type: "noteNode",
    position: { x: CSX.hl, y: 155 },
    data: { label: "Adjust length, tone, or clarity", color: "#f59e0b" },
  },
  {
    id: "cs-hl-stat",
    type: "sectionNode",
    position: { x: CSX.hl, y: 230 },
    data: {
      label: "📊 stat",
      color: "#f59e0b",
      items: [
        "Start with a striking number or %",
        "Make your claim feel real and proven",
        '"78% of people fail their diet within 30 days"',
      ],
    },
  },
  {
    id: "cs-hl-tl",
    type: "sectionNode",
    position: { x: CSX.hl, y: 370 },
    data: {
      label: "📅 timeline",
      color: "#f59e0b",
      items: [
        "Add a clear time frame to create urgency",
        '"Lose 5kg — it takes just 14 days, safely"',
      ],
    },
  },
  {
    id: "cs-hl-shock",
    type: "sectionNode",
    position: { x: CSX.hl, y: 500 },
    data: {
      label: "⚡ shocking line",
      color: "#f59e0b",
      items: [
        "Say something bold or unexpected",
        "Simple and gut-punch guidance",
        '"Doctors hate this one trick..."',
      ],
    },
  },
  {
    id: "cs-hl-ben",
    type: "sectionNode",
    position: { x: CSX.hl, y: 640 },
    data: {
      label: "🎯 Benefit-Driven",
      color: "#f59e0b",
      items: [
        "Focus on the #1 outcome",
        "Clear promise of what they gain",
        '"Cut your electric bill by 63%... instantly"',
      ],
    },
  },
  {
    id: "cs-hl-how",
    type: "sectionNode",
    position: { x: CSX.hl, y: 780 },
    data: {
      label: "📋 How-To",
      color: "#f59e0b",
      items: [
        "Step-by-step appeal",
        "Useful for educational or tutorial ads",
        '"How to whiten teeth without visiting the dentist"',
      ],
    },
  },
  {
    id: "cs-hl-fear",
    type: "sectionNode",
    position: { x: CSX.hl, y: 920 },
    data: {
      label: "⚠️ Fear-Based",
      color: "#f59e0b",
      items: [
        "Warn about a threat/problem",
        "Works well with curiosity or negative hooks",
        '"Stop doing this before it ruins your..."',
      ],
    },
  },
  {
    id: "cs-hl-list",
    type: "sectionNode",
    position: { x: CSX.hl, y: 1060 },
    data: {
      label: "📝 List",
      color: "#f59e0b",
      items: [
        "Use a number to structure expectations",
        "Creates easy-to-digest value",
        '"5 tricks to sleep like a baby (backed by science)"',
      ],
    },
  },
  {
    id: "cs-hl-que",
    type: "sectionNode",
    position: { x: CSX.hl, y: 1200 },
    data: {
      label: "❓ Question",
      color: "#f59e0b",
      items: [
        "Ask something provocative or relatable",
        "Works great with question hooks",
        '"Still paying full price for electricity?"',
      ],
    },
  },
  {
    id: "cs-hl-test",
    type: "sectionNode",
    position: { x: CSX.hl, y: 1340 },
    data: {
      label: "💬 Testimonial / Quote",
      color: "#f59e0b",
      items: [
        "Use user-generated words",
        "Feels real and authentic",
        '"I dropped 20 pounds in 30 days using THEIR method"',
      ],
    },
  },
  {
    id: "cs-hl-tab",
    type: "sectionNode",
    position: { x: CSX.hl, y: 1480 },
    data: {
      label: "🚫 Forbidden / Taboo",
      color: "#f59e0b",
      items: [
        "Say what others won't",
        "Challenges social norms or secrets",
        '"What your doctor won\'t tell you about weight loss"',
      ],
    },
  },

  // ══ MECHANISM column ═════════════════════════════════════════════════════
  {
    id: "cs-mech-hdr",
    type: "phaseHeaderNode",
    position: { x: CSX.mech, y: 90 },
    data: { label: "Mechanism", color: "#8b5cf6" },
  },
  {
    id: "cs-mech-note",
    type: "noteNode",
    position: { x: CSX.mech, y: 155 },
    data: { label: "Core Reason — Why this ad is working", color: "#8b5cf6" },
  },
  {
    id: "cs-mech-uni",
    type: "sectionNode",
    position: { x: CSX.mech, y: 230 },
    data: {
      label: "🌿 Unique Ingredient / Component",
      color: "#8b5cf6",
      items: [
        "Focus on 1 powerful element",
        "Often natural or rare",
        "Sparks curiosity + trust",
        '"Powered by Berberine — the natural sugar regulator"',
      ],
    },
  },
  {
    id: "cs-mech-upr",
    type: "sectionNode",
    position: { x: CSX.mech, y: 410 },
    data: {
      label: "⚙️ Unusual Process",
      color: "#8b5cf6",
      items: [
        "Describes a new or weird method",
        "Feels different from generic solutions",
        "Great for skincare, fitness, products",
        '"The 2-phase flash doctors ignore"',
      ],
    },
  },
  {
    id: "cs-mech-sci",
    type: "sectionNode",
    position: { x: CSX.mech, y: 590 },
    data: {
      label: "🔬 Scientific Principle",
      color: "#8b5cf6",
      items: [
        "Uses logic, biology or research",
        "Adds credibility + safety",
        "Best with studies or graphs",
        '"Activates fat-burning — proven by Harvard"',
      ],
    },
  },
  {
    id: "cs-mech-hid",
    type: "sectionNode",
    position: { x: CSX.mech, y: 775 },
    data: {
      label: "🔍 Hidden Truth / Discovery",
      color: "#8b5cf6",
      items: [
        "Secrets: suppressed or forgotten ideas",
        "Creates tension + story curiosity",
        "Great for storytelling angles",
        '"Used in WWI — hidden for 70 years"',
      ],
    },
  },
  {
    id: "cs-mech-sim",
    type: "sectionNode",
    position: { x: CSX.mech, y: 960 },
    data: {
      label: "📅 Simple Daily Action",
      color: "#8b5cf6",
      items: [
        "Easy to do, no willpower needed",
        "Adds practicality + consistency",
        "Works well with routine-based offers",
        '"Drink 1 glass before bed — that\'s it"',
      ],
    },
  },
  {
    id: "cs-mech-int",
    type: "sectionNode",
    position: { x: CSX.mech, y: 1145 },
    data: {
      label: "🔀 Internal Switch / Trigger",
      color: "#8b5cf6",
      items: [
        "Something inside the body/mind reactivates",
        "Adds mystery + mechanism",
        "Popular in biohacking, weight loss, energy niches",
        '"Reactivates your metabolism switch..."',
      ],
    },
  },

  // ══ OFFER FRAMING + CTA column ═══════════════════════════════════════════
  {
    id: "cs-offer-hdr",
    type: "phaseHeaderNode",
    position: { x: CSX.offer, y: 90 },
    data: { label: "Offer Framing + CTA", color: "#10b981" },
  },
  {
    id: "cs-offer-note",
    type: "noteNode",
    position: { x: CSX.offer, y: 155 },
    data: { label: "Call to Action", color: "#10b981" },
  },
  {
    id: "cs-offer-price",
    type: "sectionNode",
    position: { x: CSX.offer, y: 230 },
    data: {
      label: "💲 Price Reframing",
      color: "#10b981",
      items: [
        "Break the cost into smaller chunks",
        "Make the offer feel cheap vs their pain/effort",
        '"Just $1 a day — less than your coffee"',
      ],
    },
  },
  {
    id: "cs-offer-soft",
    type: "sectionNode",
    position: { x: CSX.offer, y: 400 },
    data: {
      label: "🤝 Action Softener",
      color: "#10b981",
      items: [
        "Reduce friction by changing wording",
        "Sounds less commitment + curiosity-driven",
        '"Preview your plan" instead of "Buy now"',
        '"See what\'s inside" instead of "Checkout"',
      ],
    },
  },
  {
    id: "cs-offer-stack",
    type: "sectionNode",
    position: { x: CSX.offer, y: 580 },
    data: {
      label: "📦 Stack the Value",
      color: "#10b981",
      items: [
        "Bonuses or multiple elements",
        "Makes the offer feel like a bundle deal",
        '"Your diet guide + the detox plan + shopping list — all included!"',
      ],
    },
  },
  {
    id: "cs-offer-urg",
    type: "sectionNode",
    position: { x: CSX.offer, y: 745 },
    data: {
      label: "⏰ Urgency / Scarcity CTA",
      color: "#10b981",
      items: [
        "Push action by creating time or quantity limits",
        'Best paired with timers or phrases like "while it lasts"',
        '"Only 3 spots left — claim yours now"',
        '"Offer expires in 2 hours"',
      ],
    },
  },
  {
    id: "cs-offer-out",
    type: "sectionNode",
    position: { x: CSX.offer, y: 935 },
    data: {
      label: "📈 Outcome-Based CTA",
      color: "#10b981",
      items: [
        "Lead with what they'll achieve",
        "Focus on benefit, not the action",
        '"Start your 30-day transformation"',
        '"Get your custom savings plan"',
      ],
    },
  },
  {
    id: "cs-offer-risk",
    type: "sectionNode",
    position: { x: CSX.offer, y: 1105 },
    data: {
      label: "🛡️ Risk Reversal CTA",
      color: "#10b981",
      items: [
        "Add guarantee or risk-free promise",
        "Reduces hesitation and increases trust",
        '"30-day money-back guarantee"',
        '"No questions asked"',
      ],
    },
  },
];

const CS_EDGES: Edge[] = [
  // Title → 4 column headers
  {
    id: "cs-t-hk",
    source: "cs-title",
    target: "cs-hook-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-t-hl",
    source: "cs-title",
    target: "cs-hl-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-t-mech",
    source: "cs-title",
    target: "cs-mech-hdr",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-t-offer",
    source: "cs-title",
    target: "cs-offer-hdr",
    style: { stroke: "#334155" },
  },

  // Hook header → note → first-3 → visual / copy
  {
    id: "cs-hk-note",
    source: "cs-hook-hdr",
    target: "cs-hook-note",
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-note-f3",
    source: "cs-hook-note",
    target: "cs-hook-first3",
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-f3-vis",
    source: "cs-hook-first3",
    target: "cs-hook-vis",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-f3-copy",
    source: "cs-hook-first3",
    target: "cs-hook-copy",
    style: { stroke: "#334155" },
  },

  // visual → all visual hook variants (direct connections)
  {
    id: "cs-vis-cap",
    source: "cs-hook-vis",
    target: "cs-cap-ai",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-vis-pat",
    source: "cs-hook-vis",
    target: "cs-pattern",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-vis-opus",
    source: "cs-hook-vis",
    target: "cs-opus",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-vis-fast",
    source: "cs-hook-vis",
    target: "cs-fast",
    style: { stroke: "#334155" },
  },
  {
    id: "cs-vis-mot",
    source: "cs-hook-vis",
    target: "cs-motion",
    style: { stroke: "#334155" },
  },

  // timelines under each visual variant
  {
    id: "cs-cap-tl",
    source: "cs-cap-ai",
    target: "cs-tl-cap",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-pat-tl",
    source: "cs-pattern",
    target: "cs-tl-pat",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-opus-tl",
    source: "cs-opus",
    target: "cs-tl-opus",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-fast-tl",
    source: "cs-fast",
    target: "cs-tl-fast",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-mot-tl",
    source: "cs-motion",
    target: "cs-tl-mot",
    animated: true,
    style: { stroke: "#6366f1" },
  },

  // copy → 9 hook type cards
  {
    id: "cs-hk-neg",
    source: "cs-hook-copy",
    target: "cs-neg",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-que",
    source: "cs-hook-copy",
    target: "cs-que",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-quot",
    source: "cs-hook-copy",
    target: "cs-quot",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-stat",
    source: "cs-hook-copy",
    target: "cs-stat-hk",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-anec",
    source: "cs-hook-copy",
    target: "cs-anec",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-cur",
    source: "cs-hook-copy",
    target: "cs-cur",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-con",
    source: "cs-hook-copy",
    target: "cs-con",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-pro",
    source: "cs-hook-copy",
    target: "cs-pro",
    animated: true,
    style: { stroke: "#6366f1" },
  },
  {
    id: "cs-hk-res",
    source: "cs-hook-copy",
    target: "cs-res",
    animated: true,
    style: { stroke: "#6366f1" },
  },

  // Headline header → note → 10 headline cards
  {
    id: "cs-hl-note-e",
    source: "cs-hl-hdr",
    target: "cs-hl-note",
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-stat-e",
    source: "cs-hl-note",
    target: "cs-hl-stat",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-tl-e",
    source: "cs-hl-note",
    target: "cs-hl-tl",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-shock-e",
    source: "cs-hl-note",
    target: "cs-hl-shock",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-ben-e",
    source: "cs-hl-note",
    target: "cs-hl-ben",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-how-e",
    source: "cs-hl-note",
    target: "cs-hl-how",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-fear-e",
    source: "cs-hl-note",
    target: "cs-hl-fear",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-list-e",
    source: "cs-hl-note",
    target: "cs-hl-list",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-que-e",
    source: "cs-hl-note",
    target: "cs-hl-que",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-test-e",
    source: "cs-hl-note",
    target: "cs-hl-test",
    animated: true,
    style: { stroke: "#f59e0b" },
  },
  {
    id: "cs-hl-tab-e",
    source: "cs-hl-note",
    target: "cs-hl-tab",
    animated: true,
    style: { stroke: "#f59e0b" },
  },

  // Mechanism header → note → 6 mechanism cards
  {
    id: "cs-mech-note-e",
    source: "cs-mech-hdr",
    target: "cs-mech-note",
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-uni-e",
    source: "cs-mech-note",
    target: "cs-mech-uni",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-upr-e",
    source: "cs-mech-note",
    target: "cs-mech-upr",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-sci-e",
    source: "cs-mech-note",
    target: "cs-mech-sci",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-hid-e",
    source: "cs-mech-note",
    target: "cs-mech-hid",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-sim-e",
    source: "cs-mech-note",
    target: "cs-mech-sim",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },
  {
    id: "cs-mech-int-e",
    source: "cs-mech-note",
    target: "cs-mech-int",
    animated: true,
    style: { stroke: "#8b5cf6" },
  },

  // Offer header → note → 6 CTA cards
  {
    id: "cs-offer-note-e",
    source: "cs-offer-hdr",
    target: "cs-offer-note",
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-price-e",
    source: "cs-offer-note",
    target: "cs-offer-price",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-soft-e",
    source: "cs-offer-note",
    target: "cs-offer-soft",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-stack-e",
    source: "cs-offer-note",
    target: "cs-offer-stack",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-urg-e",
    source: "cs-offer-note",
    target: "cs-offer-urg",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-out-e",
    source: "cs-offer-note",
    target: "cs-offer-out",
    animated: true,
    style: { stroke: "#10b981" },
  },
  {
    id: "cs-offer-risk-e",
    source: "cs-offer-note",
    target: "cs-offer-risk",
    animated: true,
    style: { stroke: "#10b981" },
  },
];

// ══════════════════════════════════════════════════════════════
// TAB CONFIG
// ══════════════════════════════════════════════════════════════

const TABS = [
  {
    id: "market",
    label: "Market Understanding",
    icon: Search,
    color: "#6366f1",
    sub: "",
    nodes: MU_NODES,
    edges: MU_EDGES,
  },
  {
    id: "testing",
    label: "Ad Testing Overview",
    icon: TrendingUp,
    color: "#ef4444",
    sub: "",
    nodes: AT_NODES,
    edges: AT_EDGES,
  },
  {
    id: "script",
    label: "Script Testing Guide",
    icon: FlaskConical,
    color: "#f59e0b",
    sub: "",
    nodes: ST_NODES,
    edges: ST_EDGES,
  },
  {
    id: "bigswings",
    label: "Big Swings",
    icon: Zap,
    color: "#8b5cf6",
    sub: "",
    nodes: BIG_NODES,
    edges: BIG_EDGES,
  },
  {
    id: "controlled",
    label: "Controlled Swings",
    icon: Sliders,
    color: "#10b981",
    sub: "",
    nodes: CS_NODES,
    edges: CS_EDGES,
  },
];

// ══════════════════════════════════════════════════════════════
// FLOW COMPONENT
// ══════════════════════════════════════════════════════════════

function DiagramFlow({
  nodes: initNodes,
  edges: initEdges,
}: {
  nodes: Node[];
  edges: Edge[];
}) {
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      minZoom={0.15}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1e293b" gap={20} />
      <Controls
        style={{
          background: "#1a1f2e",
          border: "1px solid #334155",
          borderRadius: 8,
        }}
      />
    </ReactFlow>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function Framework() {
  const [activeTab, setActiveTab] = useState("market");
  const tab = TABS.find((t) => t.id === activeTab)!;

  return (
    <PageTransition>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full">
            Full Methodology
          </span>
          <h1 className="text-3xl font-bold text-white mt-3">
            Ad Testing Framework
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            A structured system for building winning ads through scientific
            iteration — from market research to scaled creative assets.
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all duration-200"
                style={
                  active
                    ? {
                        borderColor: t.color,
                        background: t.color + "22",
                        color: t.color,
                      }
                    : {
                        borderColor: "#334155",
                        background: "transparent",
                        color: "#94a3b8",
                      }
                }
              >
                <Icon className="w-4 h-4" />
                {t.label}
                <span className="text-[10px] font-normal opacity-70 hidden sm:inline">
                  {t.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* Diagram */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-white/10 overflow-hidden w-full"
            style={{ height: 700, background: "#0f1117" }}
          >
            <DiagramFlow nodes={tab.nodes} edges={tab.edges} />
          </motion.div>
        </AnimatePresence>

        <NextStepBanner
          step="Phase 1"
          title="Market Understanding"
          cta="Start Phase 1"
          description="Define your customer avatar and map the pain points, angles, and identity triggers you'll test first."
          href="/market-understanding"
          icon={Users}
          color="#3b82f6"
        />
      </div>
    </PageTransition>
  );
}
