import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface AppDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** "sm" = compact table/inline size; "md" = standard form size (default) */
  size?: "sm" | "md";
  /** When set, the trigger renders with a color-tinted style (like a FieldSelect) */
  color?: string;
  /** When true, the popover opens immediately on mount */
  defaultOpen?: boolean;
}

export function AppDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  disabled,
  size = "md",
  color,
  defaultOpen = false,
}: AppDropdownProps) {
  const [open, setOpen] = useState(defaultOpen);

  const hasValue  = Boolean(value);
  const isColored = Boolean(color);

  /* ── trigger classes ─────────────────────────────────────────── */
  const baseTrigger =
    "w-full flex items-center justify-between gap-1.5 rounded-md border transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeTrigger =
    size === "sm"
      ? "px-2 py-1.5 text-xs h-8"
      : "px-3 h-[38px] text-sm";

  // Color-tinted variant (competitor intelligence FieldSelect style)
  const coloredTrigger = isColored
    ? ""
    : "bg-background/60 border-white/10 text-foreground hover:bg-background/80 " +
      "focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] " +
      (open ? "border-primary/40 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" : "");

  /* ── trigger inline styles for colored variant ───────────────── */
  const triggerStyle: React.CSSProperties = isColored
    ? {
        background:  hasValue ? `${color}10` : "rgba(255,255,255,0.03)",
        borderColor: hasValue ? `${color}40` : open ? `${color}40` : "rgba(255,255,255,0.1)",
        color:       hasValue ? color        : "rgba(255,255,255,0.4)",
        boxShadow:   open ? `0 0 0 3px ${color}20` : undefined,
      }
    : {};

  /* ── chevron color ───────────────────────────────────────────── */
  const chevronColor: React.CSSProperties = isColored
    ? { color: hasValue ? `${color}90` : "rgba(255,255,255,0.25)" }
    : {};

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          style={triggerStyle}
          className={cn(baseTrigger, sizeTrigger, coloredTrigger, className)}
        >
          <span className={cn("truncate text-left leading-none", !hasValue && !isColored && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown
            className={cn("shrink-0 opacity-60", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")}
            style={chevronColor}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 bg-[#0f1117] border-white/10 shadow-2xl"
        style={{ width: "var(--radix-popover-trigger-width)", minWidth: "160px" }}
        align="start"
        sideOffset={4}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <Command className="bg-transparent">
          <div className="border-b border-white/8">
            <CommandInput
              placeholder="Search…"
              className="h-8 text-xs bg-transparent placeholder:text-muted-foreground/50"
            />
          </div>
          <CommandList className="max-h-[220px] overflow-y-auto">
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No results.
            </CommandEmpty>
            <CommandGroup className="p-1">
              {(options ?? []).map(opt => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => { onChange(opt); setOpen(false); }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 cursor-pointer",
                    size === "sm" ? "py-1.5 text-xs" : "py-2 text-sm",
                    "text-foreground/80",
                    "data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary",
                    "hover:bg-white/5 hover:text-foreground",
                    opt === value && "text-primary",
                  )}
                >
                  <Check
                    className={cn(
                      "shrink-0 text-primary",
                      size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5",
                      opt === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
