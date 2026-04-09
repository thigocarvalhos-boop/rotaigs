/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Project } from "../types";
import { Card } from "../components/ui/Card";
import { StatusBadge, RiskBadge } from "../components/ui/Badges";
import { cn, fmt, STATUS_META } from "../utils/format";

export default function PipelineView({ projects, onProject }: { projects: Project[]; onProject: (p: Project) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.financiador.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "Todos" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Pipeline de Projetos</h2>
          <p className="text-slate-500 text-sm">Gerenciamento completo do ciclo de vida</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar projeto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Todos">Todos os Status</option>
            {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Projeto</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Financiador</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Valor</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Status</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Prob.</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Risco</th>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr 
                  key={p.id} 
                  onClick={() => onProject(p)}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-indigo-50/50 border-b border-slate-100 last:border-0",
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  )}
                >
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-900">{p.nome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.id}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-slate-600">{p.financiador}</p>
                    <p className="text-[10px] text-slate-400">{p.area}</p>
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-sm font-bold text-slate-800">{fmt(p.valor)}</p>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            p.probabilidade >= 70 ? "bg-emerald-500" : p.probabilidade >= 50 ? "bg-indigo-500" : "bg-amber-500"
                          )}
                          style={{ width: `${p.probabilidade}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.probabilidade}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <RiskBadge risco={p.risco} />
                  </td>
                  <td className="py-4 px-6">
                    <p className="text-xs text-slate-600 font-medium">{new Date(p.prazo).toLocaleDateString("pt-BR")}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
