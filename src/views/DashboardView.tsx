/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Project, Alert as AlertType } from "../types";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/Badges";
import { fmt, STATUS_META, AREA_COLORS } from "../utils/format";

export default function DashboardView({ projects, alerts, onNav, onProject }: { projects: Project[]; alerts: AlertType[]; onNav: (v: string) => void; onProject: (p: Project) => void }) {
  const activeProjects = projects.filter(p => !["Concluído", "Arquivado", "Não Aprovado"].includes(p.status));
  const totalPipeline = activeProjects.reduce((s, p) => s + p.valor, 0);
  const aprovados = projects.filter(p => p.status === "Aprovado").reduce((s, p) => s + p.valor, 0);
  const captados = projects.filter(p => ["Captado", "Execução"].includes(p.status)).reduce((s, p) => s + p.valor, 0);
  const probMedia = activeProjects.length > 0 ? Math.round(activeProjects.reduce((s, p, _, a) => s + p.probabilidade / a.length, 0)) : 0;
  const withCompliance = projects.filter(p => p.scoreCompliance !== undefined);
  const avgCompliance = withCompliance.length > 0 ? Math.round(withCompliance.reduce((s, p) => s + (p.scoreCompliance || 0), 0) / withCompliance.length) : 0;
  
  const pipelineByPhase = [
    { fase: "Triagem", count: projects.filter(p => p.status === "Triagem").length, valor: projects.filter(p => p.status === "Triagem").reduce((s, p) => s + p.valor, 0) },
    { fase: "Elaboração", count: projects.filter(p => p.status === "Elaboração").length, valor: projects.filter(p => p.status === "Elaboração").reduce((s, p) => s + p.valor, 0) },
    { fase: "Revisão", count: projects.filter(p => p.status === "Revisão").length, valor: projects.filter(p => p.status === "Revisão").reduce((s, p) => s + p.valor, 0) },
    { fase: "Inscrito", count: projects.filter(p => p.status === "Inscrito").length, valor: projects.filter(p => p.status === "Inscrito").reduce((s, p) => s + p.valor, 0) },
    { fase: "Aprovado", count: projects.filter(p => p.status === "Aprovado").length, valor: projects.filter(p => p.status === "Aprovado").reduce((s, p) => s + p.valor, 0) },
    { fase: "Execução", count: projects.filter(p => p.status === "Execução").length, valor: projects.filter(p => p.status === "Execução").reduce((s, p) => s + p.valor, 0) },
  ];

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => {
      counts[p.area] = (counts[p.area] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const topChance = [...projects].filter(p => !["Concluído", "Não Aprovado", "Arquivado"].includes(p.status)).sort((a, b) => b.probabilidade - a.probabilidade).slice(0, 3);
  const urgentAlerts = alerts.filter(a => a.nivel === "N4" || a.nivel === "N3").slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Painel de Inteligência</h2>
          <p className="text-slate-500 text-sm">Visão executiva do pipeline institucional</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            {urgentAlerts.length} Alertas Críticos
          </span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total no Pipeline</p>
          <h3 className="text-2xl font-bold text-slate-900 font-serif">{fmt(totalPipeline)}</h3>
          <p className="text-xs text-slate-500 mt-1">{activeProjects.length} projetos ativos</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-600">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aprovados (A Captar)</p>
          <h3 className="text-2xl font-bold text-emerald-700 font-serif">{fmt(aprovados)}</h3>
          <p className="text-xs text-slate-500 mt-1">Aguardando formalização</p>
        </Card>
        <Card className="border-l-4 border-l-indigo-600">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Em Execução</p>
          <h3 className="text-2xl font-bold text-indigo-700 font-serif">{fmt(captados)}</h3>
          <p className="text-xs text-slate-500 mt-1">Recursos comprometidos</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Probabilidade Média</p>
          <h3 className="text-2xl font-bold text-amber-700 font-serif">{probMedia}%</h3>
          <p className="text-xs text-slate-500 mt-1">Média ponderada do pipeline</p>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conformidade Média</p>
          <h3 className="text-2xl font-bold text-emerald-700 font-serif">{withCompliance.length > 0 ? `${avgCompliance}%` : "N/D"}</h3>
          <p className="text-xs text-slate-500 mt-1">{withCompliance.length > 0 ? "Score médio de compliance" : "Disponível em modo demonstração"}</p>
        </Card>
      </div>

      {/* Funnel Row */}
      <Card title="Pipeline por Fase">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineByPhase.map(ph => {
            const m = STATUS_META[ph.fase] || STATUS_META["Inscrito"];
            return (
              <div 
                key={ph.fase} 
                onClick={() => onNav("pipeline")}
                className="p-4 rounded-lg cursor-pointer transition-all hover:translate-y-[-2px] border border-transparent hover:border-slate-200"
                style={{ background: m.bg }}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: m.color }}>{ph.fase}</p>
                <h4 className="text-xl font-bold text-slate-900 font-serif">{ph.count}</h4>
                <p className="text-[10px] text-slate-500 font-medium">{fmt(ph.valor)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <Card title="Alertas Críticos" className="lg:col-span-1">
          <div className="space-y-4">
            {urgentAlerts.map(a => (
              <div key={a.id} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0">
                <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{a.projeto}</p>
                  <p className="text-[10px] text-slate-500">{a.tipo}{a.doc ? ` — ${a.doc}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: a.cor }}>{a.dias}d</p>
                  <p className="text-[9px] text-slate-400 uppercase">Prazo</p>
                </div>
              </div>
            ))}
            <button 
              onClick={() => onNav("alertas")}
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Ver todos os alertas
            </button>
          </div>
        </Card>

        {/* Charts */}
        <Card title="Áreas Temáticas" className="lg:col-span-1">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={areaData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={75} 
                  dataKey="value" 
                  paddingAngle={4}
                >
                  {areaData.map((_, i) => <Cell key={i} fill={AREA_COLORS[i % AREA_COLORS.length]} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {areaData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: AREA_COLORS[i % AREA_COLORS.length] }} />
                <span className="text-[10px] text-slate-600 truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Probability */}
        <Card title="Maior Probabilidade" className="lg:col-span-1">
          <div className="space-y-4">
            {topChance.map(p => (
              <div 
                key={p.id} 
                onClick={() => onProject(p)}
                className="group cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{p.nome}</h4>
                  <span className="text-sm font-bold text-emerald-600 font-serif">{p.probabilidade}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-500">{p.financiador}</p>
                  <p className="text-[10px] font-bold text-slate-700">{fmt(p.valor)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
