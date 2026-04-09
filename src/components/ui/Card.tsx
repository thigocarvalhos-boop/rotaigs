import type React from "react";
import { cn } from "../../utils/format";

export function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          {title && <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
