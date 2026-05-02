import { Handle, Position } from '@xyflow/react';

export function ProcessNode({ data }: {
  data: { label: string; icon?: string; subline?: string; highlight?: boolean; selected?: boolean }
}) {
  return (
    <div
      className={`
        relative px-6 py-4 rounded-xl border-2 backdrop-blur-md min-w-[180px]
        cursor-pointer select-none
        transition-all duration-200
        ${data.selected
          ? 'bg-primary/15 border-primary shadow-[0_0_28px_rgba(99,102,241,0.45)] scale-[1.04]'
          : data.highlight
            ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_28px_rgba(99,102,241,0.35)] hover:scale-[1.03]'
            : 'bg-card/80 border-border shadow-xl hover:border-primary/40 hover:shadow-[0_0_18px_rgba(99,102,241,0.15)] hover:scale-[1.03]'
        }
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !border-background !w-3 !h-3" />

      <div className="flex flex-col items-center text-center gap-1">
        {data.icon && (
          <div className={`text-2xl mb-1 transition-transform duration-200 ${data.selected ? 'scale-110' : ''}`}>
            {data.icon}
          </div>
        )}
        <div className={`font-display font-bold text-sm transition-colors duration-200 ${data.selected || data.highlight ? 'text-primary' : 'text-foreground'}`}>
          {data.label}
        </div>
        {data.subline && (
          <div className="text-xs text-muted-foreground font-medium">{data.subline}</div>
        )}
        {data.selected && (
          <div className="mt-1 text-[10px] text-primary/70 font-semibold tracking-widest uppercase">Selected</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-primary !border-background !w-3 !h-3" />
    </div>
  );
}
