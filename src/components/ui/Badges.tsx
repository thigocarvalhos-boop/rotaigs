import { cn, STATUS_META } from "../../utils/format";
import { B } from "../../mockData";
import type { ProjectStatus } from "../../types";

export function StatusBadge({ status, size = "sm" }: { status: ProjectStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status] || { color: B.gray, bg: B.grayLight, label: status };
  return (
    <span 
      className={cn(
        "font-bold rounded border uppercase tracking-wider inline-block",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-3 py-1"
      )}
      style={{ background: m.bg, color: m.color, borderColor: `${m.color}22` }}
    >
      {m.label}
    </span>
  );
}

export function RiskBadge({ risco }: { risco: "Baixo" | "Médio" | "Alto" }) {
  const cfg = {
    "Baixo": { c: B.green, bg: B.greenBg },
    "Médio": { c: B.orange, bg: B.orangeBg },
    "Alto":  { c: B.red, bg: B.redBg },
  }[risco];
  return (
    <span 
      className="font-bold text-[10px] px-2 py-0.5 rounded border uppercase"
      style={{ background: cfg.bg, color: cfg.c, borderColor: `${cfg.c}22` }}
    >
      {risco}
    </span>
  );
}
