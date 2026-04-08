/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { 
  LayoutDashboard, 
  GitBranch, 
  Library, 
  Bell, 
  Files, 
  History, 
  BarChart3, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  ArrowLeft,
  Calendar,
  FileText,
  TrendingUp,
  ShieldCheck,
  Info,
  RefreshCw,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  List,
  CalendarDays,
  FileSpreadsheet,
  FileImage,
  File
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { B, EDITAIS, PROJECTS, ALERTS } from "./mockData";
import { Project, ProjectStatus, Alert as AlertType, Edital, LessonLearned } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useAuthStore } from "./store/authStore";
import { apiClient } from "./api/client";

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  "Oportunidade":    { color: B.gray,     bg: B.grayLight,   label: "Oportunidade" },
  "Triagem":         { color: B.orange,   bg: B.orangeBg,    label: "Em Triagem" },
  "Elaboração":      { color: B.blue,     bg: B.blueBg,      label: "Em Elaboração" },
  "Revisão":         { color: B.purple,   bg: B.purpleBg,    label: "Em Revisão" },
  "Pronto":          { color: B.teal,     bg: B.tealLight,   label: "Pronto p/ Envio" },
  "Inscrito":        { color: B.tealDark, bg: "#D0EBEC",     label: "Inscrito" },
  "Diligência":      { color: B.orange,   bg: B.orangeBg,    label: "Diligência" },
  "Aprovado":        { color: B.green,    bg: B.greenBg,     label: "Aprovado" },
  "Não Aprovado":    { color: B.red,      bg: B.redBg,       label: "Não Aprovado" },
  "Captado":         { color: B.blue,     bg: B.blueBg,      label: "Captado" },
  "Formalização":    { color: B.purple,   bg: B.purpleBg,    label: "Formalização" },
  "Execução":        { color: B.purple,   bg: B.purpleBg,    label: "Em Execução" },
  "Concluído":       { color: B.charcoal, bg: "#F9FAFB",     label: "Concluído" },
};

const AREA_COLORS = ["#1A7C7E", "#E8A020", "#7C3AED", "#0369A1", "#059669", "#DC2626", "#D97706", "#374151"];

function fmt(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

// --- COMPONENTS ---

function StatusBadge({ status, size = "sm" }: { status: ProjectStatus; size?: "sm" | "md" }) {
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

function RiskBadge({ risco }: { risco: "Baixo" | "Médio" | "Alto" }) {
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

function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
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

// --- HELPERS ---

function getFileIcon(fileType?: string) {
  switch (fileType?.toUpperCase()) {
    case "PDF": return <FileText className="w-5 h-5 text-red-500" />;
    case "DOC": case "DOCX": return <FileText className="w-5 h-5 text-blue-500" />;
    case "XLS": case "XLSX": return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    case "IMG": case "PNG": case "JPG": case "JPEG": return <FileImage className="w-5 h-5 text-purple-500" />;
    default: return <File className="w-5 h-5 text-slate-400" />;
  }
}

function handleDocumentDownload(url?: string | null) {
  if (!url || !url.trim()) {
    alert("Este documento não possui link de acesso.");
    return;
  }
  try {
    const u = new URL(url, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("URL inválida para este documento.");
    }
  } catch {
    alert("URL inválida para este documento.");
  }
}

function isDocExpired(validade?: string | null): boolean {
  if (!validade) return false;
  return new Date(validade) < new Date();
}

function isDocExpiringSoon(validade?: string | null, days = 30): boolean {
  if (!validade) return false;
  const exp = new Date(validade);
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / 86400000;
  return diff > 0 && diff <= days;
}

function docStatusColor(status: string, validade?: string | null) {
  if (isDocExpired(validade)) return "bg-red-50 text-red-600";
  if (isDocExpiringSoon(validade)) return "bg-amber-50 text-amber-600";
  if (status === "Aprovado") return "bg-emerald-50 text-emerald-600";
  return "bg-amber-50 text-amber-600";
}

function docStatusLabel(status: string, validade?: string | null) {
  if (isDocExpired(validade)) return "Vencido";
  if (isDocExpiringSoon(validade)) return "A Vencer";
  return status;
}

function exportLocalCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- VIEWS ---

function DashboardView({ projects, alerts, onNav, onProject }: { projects: Project[]; alerts: AlertType[]; onNav: (v: string) => void; onProject: (p: Project) => void }) {
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
          <h3 className="text-2xl font-bold text-emerald-700 font-serif">{avgCompliance}%</h3>
          <p className="text-xs text-slate-500 mt-1">Score médio de compliance</p>
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

function PipelineView({ projects, onProject }: { projects: Project[]; onProject: (p: Project) => void }) {
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
                    <p className="text-xs text-slate-600 font-medium">{p.prazo.split("-").reverse().join("/")}</p>
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

function ProjectDetailView({ project, onBack, onUpdateProject, isDemo, onRefresh }: { project: Project; onBack: () => void; onUpdateProject?: (id: string, data: any) => Promise<void>; isDemo?: boolean; onRefresh?: () => Promise<void> }) {
  const [activeTab, setActiveTab] = useState("geral");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [formNome, setFormNome] = useState(project.nome);
  const [formEdital, setFormEdital] = useState(project.edital);
  const [formFinanciador, setFormFinanciador] = useState(project.financiador);
  const [formArea, setFormArea] = useState(project.area);
  const [formValor, setFormValor] = useState(project.valor);
  const [formStatus, setFormStatus] = useState<string>(project.status);
  const [formPrazo, setFormPrazo] = useState(project.prazo?.split("T")[0] || "");
  const [formProbabilidade, setFormProbabilidade] = useState(project.probabilidade);
  const [formRisco, setFormRisco] = useState<string>(project.risco);
  const [formAderencia, setFormAderencia] = useState(project.aderencia);
  const [formTerritorio, setFormTerritorio] = useState(project.territorio);
  const [formPublico, setFormPublico] = useState(project.publico);
  const [formCompetitividade, setFormCompetitividade] = useState(project.competitividade);
  const [formProximoPasso, setFormProximoPasso] = useState(project.proximoPasso || "");
  const [formPtScore, setFormPtScore] = useState(project.ptScore);

  const startEditing = () => {
    setFormNome(project.nome);
    setFormEdital(project.edital);
    setFormFinanciador(project.financiador);
    setFormArea(project.area);
    setFormValor(project.valor);
    setFormStatus(project.status);
    setFormPrazo(project.prazo?.split("T")[0] || "");
    setFormProbabilidade(project.probabilidade);
    setFormRisco(project.risco);
    setFormAderencia(project.aderencia);
    setFormTerritorio(project.territorio);
    setFormPublico(project.publico);
    setFormCompetitividade(project.competitividade);
    setFormProximoPasso(project.proximoPasso || "");
    setFormPtScore(project.ptScore);
    setEditing(true);
    setActiveTab("geral");
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdateProject) return;
    setSaving(true);
    try {
      await onUpdateProject(project.id, {
        nome: formNome,
        edital: formEdital,
        financiador: formFinanciador,
        area: formArea,
        valor: formValor,
        status: formStatus,
        prazo: formPrazo ? `${formPrazo}T00:00:00Z` : undefined,
        probabilidade: formProbabilidade,
        risco: formRisco,
        aderencia: formAderencia,
        territorio: formTerritorio,
        publico: formPublico,
        competitividade: formCompetitividade,
        proximoPasso: formProximoPasso,
        ptScore: formPtScore,
      });
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar projeto");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
  const labelClass = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block";
  
  const tabs = [
    { id: "geral", label: "Visão Geral", icon: Info },
    { id: "analise", label: "Análise Técnica", icon: TrendingUp },
    { id: "docs", label: "Documentação", icon: Files },
    { id: "conformidade", label: "Conformidade", icon: ShieldCheck },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
    { id: "historico", label: "Histórico", icon: History },
  ];

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Pipeline
      </button>

      {/* Header Card */}
      <Card className="border-t-4 border-t-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{project.id}</span>
              <StatusBadge status={project.status} size="md" />
              <RiskBadge risco={project.risco} />
              {onUpdateProject && !editing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-all uppercase tracking-widest"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar Projeto
                </button>
              )}
              {editing && (
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest">
                  Modo Edição
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-slate-900 font-serif mb-2">{project.nome}</h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Library className="w-4 h-4" /> {project.financiador}</span>
              <span className="flex items-center gap-1.5"><GitBranch className="w-4 h-4" /> {project.area}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Prazo: {project.prazo.split("-").reverse().join("/")}</span>
            </div>
          </div>
          <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor Solicitado</p>
            <p className="text-3xl font-bold text-slate-900 font-serif">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.valor)}</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span className="text-xs font-bold text-emerald-600">{project.probabilidade}% de chance</span>
              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${project.probabilidade}%` }} />
              </div>
            </div>
          </div>
        </div>
        
        {project.proximoPasso && (
          <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-0.5">Próximo Passo Crítico</p>
              <p className="text-sm text-amber-900 font-medium">{project.proximoPasso}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 py-4 px-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 -mb-[1px]",
              activeTab === t.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === "geral" && editing && (
            <Card title="Editar Projeto" action={
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formNome.trim()}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            }>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nome do Projeto</label>
                  <input type="text" value={formNome} onChange={e => setFormNome(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Edital / Chamamento</label>
                  <input type="text" value={formEdital} onChange={e => setFormEdital(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Financiador</label>
                  <input type="text" value={formFinanciador} onChange={e => setFormFinanciador(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Área</label>
                  <input type="text" value={formArea} onChange={e => setFormArea(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Valor (R$)</label>
                  <input type="number" value={formValor} onChange={e => setFormValor(Number(e.target.value))} min={0} step={0.01} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={inputClass}>
                    {Object.keys(STATUS_META).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Prazo</label>
                  <input type="date" value={formPrazo} onChange={e => setFormPrazo(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Probabilidade (%)</label>
                  <input type="number" value={formProbabilidade} onChange={e => setFormProbabilidade(Number(e.target.value))} min={0} max={100} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Risco</label>
                  <select value={formRisco} onChange={e => setFormRisco(e.target.value)} className={inputClass}>
                    <option value="Baixo">Baixo</option>
                    <option value="Médio">Médio</option>
                    <option value="Alto">Alto</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Aderência (1-5)</label>
                  <input type="number" value={formAderencia} onChange={e => setFormAderencia(Number(e.target.value))} min={1} max={5} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Score PTI</label>
                  <input type="number" value={formPtScore} onChange={e => setFormPtScore(Number(e.target.value))} min={0} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Território</label>
                  <input type="text" value={formTerritorio} onChange={e => setFormTerritorio(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Público-Alvo</label>
                  <input type="text" value={formPublico} onChange={e => setFormPublico(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Competitividade</label>
                  <input type="text" value={formCompetitividade} onChange={e => setFormCompetitividade(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Próximo Passo</label>
                  <input type="text" value={formProximoPasso} onChange={e => setFormProximoPasso(e.target.value)} className={inputClass} />
                </div>
                {project.observacao && (
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Observação Estratégica
                      {isDemo && <span className="ml-2 text-amber-500 normal-case tracking-normal">(somente mock)</span>}
                    </label>
                    <textarea
                      value={project.observacao}
                      readOnly
                      className={cn(inputClass, "h-24 resize-none bg-slate-50 cursor-not-allowed text-slate-500")}
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === "geral" && !editing && (
            <Card title="Informações Estratégicas">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {[
                  { label: "Edital / Chamamento", value: project.edital },
                  { label: "Público-Alvo", value: project.publico },
                  { label: "Território", value: project.territorio },
                  { label: "Responsável", value: project.responsavel },
                  { label: "Competitividade", value: project.competitividade },
                  { label: "Aderência", value: "★".repeat(project.aderencia) + "☆".repeat(5 - project.aderencia) },
                ].map(item => (
                  <div key={item.label} className="border-b border-slate-50 pb-3 last:border-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {project.observacao && (
                <div className="mt-8 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Observação Estratégica</p>
                  <p className="text-sm text-slate-700 leading-relaxed italic">"{project.observacao}"</p>
                </div>
              )}
            </Card>
          )}

          {activeTab === "analise" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Parecer Técnico Interno (PTI)">
                  <div className="space-y-4">
                    {project.ptCriterios.map(c => (
                      <div key={c.critério}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-bold text-slate-700">{c.critério}</span>
                          <span className="text-xs font-bold text-indigo-600">{c.score}/10</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              c.score >= 8 ? "bg-emerald-500" : c.score >= 6 ? "bg-indigo-500" : "bg-amber-500"
                            )}
                            style={{ width: `${c.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card title="Radar de Maturidade">
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={project.ptCriterios}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="critério" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                        <Radar 
                          name="Score" 
                          dataKey="score" 
                          stroke="#4f46e5" 
                          fill="#4f46e5" 
                          fillOpacity={0.2} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Anti-glosa Section */}
              <Card 
                title="Módulo Antiglosa & Compliance" 
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Health Score:</span>
                    <span className={cn("text-sm font-bold", (project.scoreCompliance || 0) > 80 ? "text-emerald-600" : "text-amber-600")}>
                      {project.scoreCompliance}%
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risco de Glosa</p>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>
                          {project.scoreRiscoGlosa}%
                        </span>
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", (project.scoreRiscoGlosa || 0) < 20 ? "bg-emerald-500" : "bg-red-500")} 
                            style={{ width: `${project.scoreRiscoGlosa}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Metas vs Execução</p>
                      <p className="text-xl font-bold text-slate-900">{project.metas?.filter(m => m.alcancado >= m.meta).length || 0} / {project.metas?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Despesas Validadas</p>
                      <p className="text-xl font-bold text-slate-900">
                        {fmt(project.expenses?.filter(e => e.status === "Validado").reduce((s, e) => s + e.valor, 0) || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Alertas de Auditoria Preventiva</h4>
                    {project.expenses?.filter(e => e.status === "Glosa").map(e => (
                      <div key={e.id} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-red-800">Risco de Glosa: {e.descricao}</span>
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">{fmt(e.valor)}</span>
                          </div>
                          <p className="text-xs text-red-700 leading-relaxed">{e.justificativa}</p>
                          <div className="mt-2 flex gap-2">
                            <span className="text-[10px] font-bold text-red-600 italic">Justificativa técnica necessária para regularização</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!project.expenses || project.expenses.filter(e => e.status === "Glosa").length === 0) && (
                      <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                        <ShieldCheck className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Nenhuma inconsistência crítica detectada pela auditoria preventiva.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "docs" && (
            <Card title="Checklist Documental">
              <div className="space-y-1">
                {project.docs.map((doc, idx) => {
                  const expired = isDocExpired(doc.validade);
                  const expiring = isDocExpiringSoon(doc.validade);
                  return (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0",
                      expired && "bg-red-50/50",
                      expiring && !expired && "bg-amber-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        {doc.status === "Aprovado" && !expired && !expiring ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : 
                         expired ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                         expiring ? <Clock className="w-5 h-5 text-amber-500" /> :
                         <Clock className="w-5 h-5 text-amber-500" />}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{doc.nome}</p>
                          {doc.validade && (
                            <p className={cn("text-[10px]", expired ? "text-red-500 font-bold" : expiring ? "text-amber-500 font-bold" : "text-slate-400")}>
                              Vencimento: {doc.validade.split("-").reverse().join("/")}
                              {expired && " — VENCIDO"}
                              {expiring && !expired && " — A VENCER"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", docStatusColor(doc.status, doc.validade))}>
                          {docStatusLabel(doc.status, doc.validade)}
                        </span>
                        <button 
                          onClick={() => handleDocumentDownload(doc.url)}
                          className={cn("p-2 transition-colors", doc.url ? "text-slate-400 hover:text-indigo-600" : "text-slate-200 cursor-not-allowed")}
                          title={doc.url ? "Abrir documento" : "Sem link disponível"}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === "conformidade" && (
            <div className="space-y-6">
              {/* Dashboard de Conformidade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Score</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">{project.scoreCompliance}%</span>
                    <span className="text-xs text-emerald-600 font-bold mb-1">Conforme</span>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risco de Glosa</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-bold", (project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600")}>
                      {project.scoreRiscoGlosa}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Calculado</span>
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Metas vs Execução</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {project.metas?.filter(m => m.alcancado >= m.meta).length || 0}/{project.metas?.length || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mb-1">Metas atingidas</span>
                  </div>
                </Card>
              </div>

              {/* Auditoria de Despesas */}
              <Card title="Auditoria Preventiva de Despesas" action={<button className="text-xs font-bold text-indigo-600 hover:underline">Nova Despesa</button>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Despesa</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cotações</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {project.expenses?.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-800">{exp.descricao}</p>
                            <p className="text-[10px] text-slate-400">{exp.categoria} • {exp.data}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-sm font-bold text-slate-900">{fmt(exp.valor)}</p>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              exp.status === "Validado" ? "bg-emerald-50 text-emerald-600" : 
                              exp.status === "Glosa" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                            )}>
                              {exp.status}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex -space-x-2">
                              {exp.cotacoes.map((c, i) => (
                                <div key={c.id} className={cn(
                                  "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold",
                                  c.vencedora ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                                )}>
                                  {c.fornecedor[0]}
                                </div>
                              ))}
                              {exp.cotacoes.length === 0 && <span className="text-[10px] text-slate-400 italic">Nenhuma</span>}
                            </div>
                          </td>
                          <td className="py-4 text-right">
                            <span className="text-[10px] text-slate-400 font-mono">{exp.id.slice(0, 8)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Checklist de Compliance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Checklist de Conformidade">
                  <div className="space-y-3">
                    {project.complianceChecks?.map((check) => (
                      <div key={check.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-3">
                          {check.status === "Conforme" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-xs font-medium text-slate-700">{check.item}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{check.status}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Log de Auditoria">
                  <div className="space-y-4">
                    {project.auditLogs?.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 italic text-xs">Nenhum registro de auditoria.</div>
                    ) : (
                      project.auditLogs?.map((log: any) => (
                        <div key={log.id} className="relative pl-4 border-l-2 border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            {new Date(log.data).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs font-bold text-slate-800">{log.acao}</p>
                          <p className="text-[10px] text-slate-500">
                            {log.user?.name || "Sistema"} • {log.entidade} {log.entidadeId}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "relatorios" && (
            <div className="space-y-6">
              <Card title="Central de Relatórios Institucionais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: "Relatório de Conformidade", desc: "Visão completa do status de compliance e riscos de glosa.", icon: ShieldCheck },
                    { title: "Execução Físico-Financeira", desc: "Comparativo entre metas atingidas e orçamento executado.", icon: TrendingUp },
                    { title: "Dossiê Documental", desc: "Compilado de todos os documentos validados e pendentes.", icon: Files },
                    { title: "Parecer de Auditoria", desc: "Relatório detalhado para prestação de contas final.", icon: FileText },
                  ].map((rel, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        const p = project;
                        if (rel.title === "Dossiê Documental") {
                          exportLocalCsv(`documentos-${p.id}.csv`,
                            ["Documento", "Status", "Validade"],
                            p.docs.map(d => [d.nome, docStatusLabel(d.status, d.validade), d.validade || "Permanente"])
                          );
                        } else if (rel.title === "Execução Físico-Financeira") {
                          exportLocalCsv(`execucao-${p.id}.csv`,
                            ["Meta", "Indicador", "Meta Prevista", "Alcançado", "Unidade"],
                            (p.metas || []).map(m => [m.descricao, m.indicador, String(m.meta), String(m.alcancado), m.unidade])
                          );
                        } else if (rel.title === "Relatório de Conformidade") {
                          exportLocalCsv(`conformidade-${p.id}.csv`,
                            ["Item", "Status", "Data"],
                            (p.complianceChecks || []).map(c => [c.item, c.status, c.data])
                          );
                        } else {
                          exportLocalCsv(`parecer-${p.id}.csv`,
                            ["Campo", "Valor"],
                            [["Nome", p.nome], ["Score", String(p.ptScore)], ["Compliance", String(p.scoreCompliance || "N/A")], ["Risco Glosa", String(p.scoreRiscoGlosa || "N/A")]]
                          );
                        }
                      }}
                      className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all group cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                          <rel.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-800 mb-1">{rel.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{rel.desc}</p>
                        </div>
                        <Download className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Indicadores de Desempenho do Projeto">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={project.metas}>
                      <XAxis dataKey="indicador" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="alcancado" name="Alcançado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Meta Prevista</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Execução Real</span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "historico" && (
            <div className="space-y-6">
              <Card title="Linha do Tempo Institucional">
                <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {project.historico.map((h, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center z-10">
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{h.data}</p>
                        <p className="text-sm font-bold text-slate-800">{h.acao}</p>
                        <p className="text-xs text-slate-500">Responsável: {h.autor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {project.changeLog && project.changeLog.length > 0 && (
                <Card title="Histórico de Alterações Críticas">
                  <div className="space-y-4">
                    {project.changeLog.map((log) => (
                      <div key={log.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                              {log.campo === "valor" && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                              {log.campo === "status" && <RefreshCw className="w-4 h-4 text-indigo-600" />}
                              {log.campo === "probabilidade" && <BarChart3 className="w-4 h-4 text-amber-600" />}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campo Alterado</p>
                              <p className="text-sm font-bold text-slate-800 capitalize">{log.campo}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.data}</p>
                            <p className="text-xs font-medium text-slate-600">{log.autor}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-100 mb-3">
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Anterior</p>
                            <p className="text-sm font-medium text-slate-500 line-through">
                              {log.campo === "valor" ? fmt(Number(log.valorAnterior)) : log.campo === "probabilidade" ? `${log.valorAnterior}%` : log.valorAnterior}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Novo</p>
                            <p className="text-sm font-bold text-slate-900">
                              {log.campo === "valor" ? fmt(Number(log.valorNovo)) : log.campo === "probabilidade" ? `${log.valorNovo}%` : log.valorNovo}
                            </p>
                          </div>
                        </div>

                        {log.justificativa && (
                          <div className="flex gap-2 items-start">
                            <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              &quot;{log.justificativa}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-slate-900 text-white border-none">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Resumo Executivo</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Score PTI</span>
                <span className="text-lg font-bold font-serif text-emerald-400">{project.ptScore}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Probabilidade</span>
                <span className="text-lg font-bold font-serif text-indigo-400">{project.probabilidade}%</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-xs text-slate-400">Risco</span>
                <span className={cn("text-xs font-bold uppercase", project.risco === "Baixo" ? "text-emerald-400" : project.risco === "Médio" ? "text-amber-400" : "text-red-400")}>{project.risco}</span>
              </div>
            </div>
            <button
              onClick={() => {
                const p = project;
                exportLocalCsv(`parecer-${p.id}.csv`,
                  ["Campo", "Valor"],
                  [
                    ["Nome", p.nome], ["Edital", p.edital], ["Financiador", p.financiador],
                    ["Área", p.area], ["Valor", String(p.valor)], ["Status", p.status],
                    ["Prazo", p.prazo], ["Probabilidade", `${p.probabilidade}%`],
                    ["Risco", p.risco], ["Score PTI", String(p.ptScore)],
                    ["Território", p.territorio], ["Público", p.publico],
                  ]
                );
              }}
              className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
            >
              Exportar Parecer CSV
            </button>
          </Card>

          <Card title="Informações do Projeto">
            <div className="space-y-3">
              <div className="border-b border-slate-50 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Responsável</p>
                <p className="text-sm text-slate-800 font-medium">{project.responsavel}</p>
              </div>
              <div className="border-b border-slate-50 pb-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Território</p>
                <p className="text-sm text-slate-800 font-medium">{project.territorio}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Público-Alvo</p>
                <p className="text-sm text-slate-800 font-medium">{project.publico}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EditalCard({ edital }: { edital: Edital }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{edital.categoria}</span>
          <span 
            className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
              edital.status === "Aberto" ? "bg-emerald-50 text-emerald-600" : edital.status === "Em análise" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
            )}
          >
            {edital.status}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors leading-tight">{edital.nome}</h3>
        <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"><Library className="w-3.5 h-3.5" /> {edital.financiador}</p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor Máx.</p>
            <p className="text-xs font-bold text-slate-800">{fmt(edital.valorMax)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Prazo</p>
            <p className="text-xs font-bold text-red-600">{edital.prazo.split("-").reverse().join("/")}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Aderência</span>
            <div className="flex text-amber-400">
              {"★".repeat(edital.aderencia)}{"☆".repeat(5 - edital.aderencia)}
            </div>
          </div>
          {edital.link ? (
            <button 
              onClick={() => window.open(edital.link, "_blank", "noopener,noreferrer")}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Ver Edital <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Sem link</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EditaisView() {
  const [search, setSearch] = useState("");
  const [editais, setEditais] = useState(EDITAIS); // fallback local enquanto não há endpoint
  // TODO: substituir por apiClient.getEditais() quando o endpoint existir
  // Por ora, EDITAIS de mockData é o único dado que permanece como estático
  // justificado — editais são configuração, não dado transacional

  const filtered = editais.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.financiador.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Banco de Editais</h2>
          <p className="text-slate-500 text-sm">Oportunidades mapeadas e em monitoramento</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar edital ou financiador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(e => <EditalCard key={e.id} edital={e} />)}
      </div>
    </div>
  );
}

function AlertasView({ alerts, onExportCsv }: { alerts: AlertType[]; onExportCsv: (type: string) => void }) {
  const [mode, setMode] = useState<"lista" | "calendario">("lista");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(prevYear => prevYear - 1); }
    else setCalMonth(prevMo => prevMo - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(prevYear => prevYear + 1); }
    else setCalMonth(prevMo => prevMo + 1);
  };

  const firstDayOfMonth = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const getAlertsForDay = (day: number) => {
    return alerts.filter(a => {
      if (!a.prazoDate) return false;
      const d = new Date(a.prazoDate);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === day;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Alertas e Prazos</h2>
          <p className="text-slate-500 text-sm">Monitoramento proativo de datas críticas</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setMode("calendario")}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2",
              mode === "calendario" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-slate-200 hover:bg-slate-50"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendário
          </button>
          <button 
            onClick={() => setMode("lista")}
            className={cn("px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2",
              mode === "lista" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white border border-slate-200 hover:bg-slate-50"
            )}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
          <button 
            onClick={() => onExportCsv("alerts")}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {mode === "lista" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card title="Linha do Tempo de Urgências">
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum alerta pendente no momento.</div>
                ) : (
                  alerts.sort((a, b) => (a.dias || 0) - (b.dias || 0)).map(a => (
                    <div key={a.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ background: a.bgCor || "#f1f5f9" }}>
                        <span className="text-[10px] font-bold uppercase" style={{ color: a.cor || "#64748b" }}>{a.nivel}</span>
                        <span className="text-lg font-bold font-serif" style={{ color: a.cor || "#64748b" }}>{a.dias ?? "?"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{a.titulo || a.projeto}</h4>
                        <p className="text-xs text-slate-500">{a.tipo}{a.mensagem ? ` — ${a.mensagem}` : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-800">{a.prazo || "N/A"}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Vencimento</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card title="Resumo por Nível">
              <div className="space-y-4">
                {[
                  { nivel: "N4", label: "Crítico", color: B.red, count: alerts.filter(a => a.nivel === "N4").length },
                  { nivel: "N3", label: "Urgente", color: B.orange, count: alerts.filter(a => a.nivel === "N3").length },
                  { nivel: "N2", label: "Atenção", color: B.blue, count: alerts.filter(a => a.nivel === "N2").length },
                  { nivel: "N1", label: "Informativo", color: B.gray, count: alerts.filter(a => a.nivel === "N1").length },
                ].map(n => (
                  <div key={n.nivel} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                      <span className="text-xs font-bold text-slate-600">{n.label} ({n.nivel})</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{n.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {mode === "calendario" && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 font-serif">{MONTH_NAMES[calMonth]} {calYear}</h3>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((dayName, index) => <span key={`${dayName}-${index}`} className="text-[10px] font-bold text-slate-400 py-2">{dayName}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAlerts = getAlertsForDay(day);
              const hasAlert = dayAlerts.length > 0;
              const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear();
              return (
                <div 
                  key={i} 
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center text-xs rounded-lg border relative",
                    isToday && "ring-2 ring-indigo-500",
                    hasAlert ? "bg-red-50 border-red-200 text-red-700 font-bold cursor-pointer" : "bg-white border-slate-50 text-slate-500"
                  )}
                  title={hasAlert ? dayAlerts.map(a => `${a.nivel}: ${a.titulo || a.projeto}`).join("\n") : ""}
                >
                  <span>{day}</span>
                  {hasAlert && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayAlerts.slice(0, 3).map((a, j) => (
                        <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: a.cor }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas deste mês</h4>
            {alerts.filter(a => {
              if (!a.prazoDate) return false;
              const d = new Date(a.prazoDate);
              return d.getFullYear() === calYear && d.getMonth() === calMonth;
            }).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum alerta neste mês</p>
            ) : (
              alerts.filter(a => {
                if (!a.prazoDate) return false;
                const d = new Date(a.prazoDate);
                return d.getFullYear() === calYear && d.getMonth() === calMonth;
              }).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.cor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{a.titulo || a.projeto}</p>
                    <p className="text-[10px] text-slate-500">{a.tipo} — {a.prazo}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase" style={{ color: a.cor }}>{a.nivel}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function DocumentosView({ documents, onExportCsv }: { documents: any[]; onExportCsv: (type: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Gestão Documental</h2>
          <p className="text-slate-500 text-sm">Biblioteca institucional e certidões</p>
        </div>
        <button 
          onClick={() => onExportCsv("documents")}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Documentos Institucionais e de Projetos">
            <div className="space-y-1">
              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum documento encontrado.</div>
              ) : (
                documents.map((doc, idx) => {
                  const expired = isDocExpired(doc.validade);
                  const expiring = isDocExpiringSoon(doc.validade);
                  return (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0",
                      expired && "bg-red-50/50",
                      expiring && !expired && "bg-amber-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.fileType)}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{doc.nome}</p>
                          <div className="flex items-center gap-2">
                            <p className={cn("text-[10px] uppercase font-bold", expired ? "text-red-500" : expiring ? "text-amber-500" : "text-slate-400")}>
                              Validade: {doc.validade ? new Date(doc.validade).toLocaleDateString('pt-BR') : "Permanente"}
                              {expired && " — VENCIDO"}
                              {expiring && !expired && " — A VENCER"}
                            </p>
                            {doc.fileType && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{doc.fileType}</span>
                            )}
                            {doc.project && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                Projeto: {doc.project.nome}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", docStatusColor(doc.status, doc.validade))}>
                          {docStatusLabel(doc.status, doc.validade)}
                        </span>
                        <button 
                          onClick={() => handleDocumentDownload(doc.url)}
                          className={cn("p-2 transition-colors", doc.url ? "text-slate-400 hover:text-indigo-600" : "text-slate-200 cursor-not-allowed")}
                          title={doc.url ? "Abrir documento" : "Sem link disponível"}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card title="Status de Certidões">
            <div className="space-y-4">
              {(() => {
                const expired = documents.filter(d => isDocExpired(d.validade));
                const expiring = documents.filter(d => isDocExpiringSoon(d.validade));
                const ok = documents.filter(d => !isDocExpired(d.validade) && !isDocExpiringSoon(d.validade) && d.status === "Aprovado");
                return (
                  <>
                    {ok.length > 0 && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800">Documentos Regulares</span>
                        </div>
                        <p className="text-[10px] text-emerald-700">{ok.length} documento(s) em dia.</p>
                      </div>
                    )}
                    {expiring.length > 0 && (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-amber-800">A Vencer (30 dias)</span>
                        </div>
                        <p className="text-[10px] text-amber-700">{expiring.map(d => d.nome).join(", ")}</p>
                      </div>
                    )}
                    {expired.length > 0 && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-xs font-bold text-red-800">Vencidos</span>
                        </div>
                        <p className="text-[10px] text-red-700">{expired.map(d => d.nome).join(", ")}</p>
                      </div>
                    )}
                    {expired.length === 0 && expiring.length === 0 && ok.length === 0 && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] text-slate-500">Nenhum documento com validade registrada.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MemoriaView({ stats, auditLogs, lessons, onCreateLesson, onUpdateLesson, onDeleteLesson, onExportCsv }: { 
  stats: any; auditLogs: any[]; lessons: LessonLearned[];
  onCreateLesson: (l: { projeto: string; licao: string; categoria?: string }) => Promise<void>;
  onUpdateLesson: (id: string, l: { projeto?: string; licao?: string; categoria?: string }) => Promise<void>;
  onDeleteLesson: (id: string) => Promise<void>;
  onExportCsv: (type: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formProjeto, setFormProjeto] = useState("");
  const [formLicao, setFormLicao] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [saving, setSaving] = useState(false);

  const displayStats = [
    { label: "Projetos Submetidos", value: stats?.totalProjects || 0, icon: GitBranch, color: B.blue },
    { label: "Taxa de Aprovação", value: `${(stats?.approvalRate || 0).toFixed(1)}%`, icon: TrendingUp, color: B.green },
    { label: "Total Captado (Histórico)", value: fmt(stats?.totalValue || 0), icon: ShieldCheck, color: B.teal },
    { label: "Lições Registradas", value: lessons.length, icon: History, color: B.purple },
  ];

  const startEdit = (l: LessonLearned) => {
    setEditingId(l.id);
    setFormProjeto(l.projeto);
    setFormLicao(l.licao);
    setFormCategoria(l.categoria || "");
    setShowForm(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setFormProjeto("");
    setFormLicao("");
    setFormCategoria("");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formProjeto.trim() || !formLicao.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdateLesson(editingId, { projeto: formProjeto, licao: formLicao, categoria: formCategoria || undefined });
      } else {
        await onCreateLesson({ projeto: formProjeto, licao: formLicao, categoria: formCategoria || undefined });
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Memória Organizacional</h2>
          <p className="text-slate-500 text-sm">Inteligência acumulada e histórico de impacto</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onExportCsv("lessons")}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> CSV Lições
          </button>
          <button 
            onClick={() => onExportCsv("audit-logs")}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" /> CSV Auditoria
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayStats.map(s => (
          <Card key={s.label}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-serif">{s.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Log de Auditoria Institucional">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Nenhum registro encontrado.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(log.data).toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">{log.acao}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">{log.entidade} {log.entidadeId}</p>
                  <p className="text-[10px] text-slate-500">Usuário: {log.user?.name || "Sistema"}</p>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card 
          title="Lições Aprendidas"
          action={
            <button onClick={startCreate} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nova Lição
            </button>
          }
        >
          <div className="space-y-4">
            {showForm && (
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-800 uppercase">{editingId ? "Editar Lição" : "Nova Lição"}</h4>
                <input 
                  type="text" placeholder="Projeto" value={formProjeto} onChange={e => setFormProjeto(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <textarea 
                  placeholder="Lição aprendida..." value={formLicao} onChange={e => setFormLicao(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" rows={3}
                />
                <input 
                  type="text" placeholder="Categoria (opcional)" value={formCategoria} onChange={e => setFormCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={handleSubmit} disabled={saving || !formProjeto.trim() || !formLicao.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase disabled:opacity-50 flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving ? "Salvando..." : "Salvar"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold uppercase">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {lessons.length === 0 && !showForm ? (
              <div className="p-8 text-center text-slate-400 italic text-sm">Nenhuma lição registrada.</div>
            ) : (
              lessons.map(l => (
                <div key={l.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-bold text-slate-800">{l.projeto}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(l.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                      </span>
                      <button onClick={() => startEdit(l)} className="p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => { if (confirm("Excluir esta lição?")) onDeleteLesson(l.id); }}
                        className="p-1 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">"{l.licao}"</p>
                  {l.categoria && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase mt-2 inline-block">{l.categoria}</span>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RelatoriosView({ onExportCsv }: { onExportCsv: (type: string) => void }) {
  const reports = [
    { title: "Pipeline Executivo", desc: "Visão completa de valores e probabilidades por fase.", icon: LayoutDashboard, exportType: "pipeline" },
    { title: "Relatório de Captação", desc: "Histórico de recursos captados e projeção anual.", icon: TrendingUp, exportType: "captacao" },
    { title: "Status Documental", desc: "Checklist de certidões e documentos institucionais.", icon: Files, exportType: "documents" },
    { title: "Alertas e Prazos", desc: "Listagem completa de alertas e prazos críticos.", icon: Bell, exportType: "alerts" },
    { title: "Auditoria", desc: "Log de auditoria com ações, usuários e entidades.", icon: ShieldCheck, exportType: "audit-logs" },
    { title: "Lições Aprendidas", desc: "Inteligência acumulada por projeto.", icon: History, exportType: "lessons" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Relatórios e Exportações</h2>
          <p className="text-slate-500 text-sm">Exportação de dados em CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(r => (
          <div key={r.title} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-lg flex items-center justify-center mb-4 transition-colors">
              <r.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{r.title}</h3>
            <p className="text-xs text-slate-500 mb-6">{r.desc}</p>
            <button 
              onClick={() => onExportCsv(r.exportType)}
              className="w-full py-2 bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MAIN APP ---

function LoginView() {
  const { setUser, setToken, setRefreshToken } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoPrompt, setDemoPrompt] = useState(false);
  const [loginError, setLoginError] = useState("");

  const enterDemoMode = () => {
    setToken("demo-token");
    setUser({ id: "demo", name: "Modo Demo", email: "demo@rota.local", role: "LEITURA" });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");
    try {
      const data = await apiClient.login(email, password);
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "Servidor indisponível" || msg === "Failed to fetch") {
        setDemoPrompt(true);
      } else {
        setLoginError(msg || "Credenciais inválidas");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8 bg-slate-800 text-white text-center border-b border-white/10">
          <h1 className="text-4xl font-bold tracking-tighter font-serif">ROTA</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Guia Social Intelligence</p>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Acesso Institucional</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="exemplo@guiasocial.org"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Senha</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-xs shadow-lg disabled:opacity-50"
            >
              {loading ? "Autenticando..." : "Entrar no Sistema"}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Plataforma de Inteligência para Gestão de Projetos</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {demoPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Modo demonstração"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <h3 className="text-lg font-bold text-slate-900">Servidor Indisponível</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Não foi possível conectar ao servidor. Deseja entrar em <strong>modo demonstração</strong> com dados de exemplo (somente leitura)?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDemoPrompt(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={enterDemoMode}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
                  autoFocus
                >
                  Entrar Demo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const { user, token, logout } = useAuthStore();
  const [view, setView] = useState("dashboard");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [lessons, setLessons] = useState<LessonLearned[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, aData, sData, lData, dData, lessonsData] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getAlerts(),
        apiClient.getStats(),
        apiClient.getAuditLogs(),
        apiClient.getDocuments(),
        apiClient.getLessons()
      ]);
      setProjects(pData);
      setStats(sData);
      setAuditLogs(lData);
      setDocuments(dData);
      setLessons(lessonsData);
      setIsDemo(false);

      const mappedAlerts: AlertType[] = aData.map((a: any) => {
        const prazoDate = a.prazo || null;
        const dias = prazoDate
          ? Math.max(0, Math.ceil((new Date(prazoDate).getTime() - Date.now()) / 86400000))
          : 0;
        return {
          id: a.id,
          nivel: a.nivel,
          tipo: a.tipo,
          projeto: a.project?.nome || "Geral",
          prazo: prazoDate ? new Date(prazoDate).toLocaleDateString('pt-BR') : (a.createdAt ? new Date(a.createdAt).toLocaleDateString('pt-BR') : "N/A"),
          dias,
          cor: a.nivel === "N4" ? B.red : a.nivel === "N3" ? B.orange : a.nivel === "N2" ? B.blue : B.gray,
          bgCor: a.nivel === "N4" ? B.redBg : a.nivel === "N3" ? B.orangeBg : a.nivel === "N2" ? B.blueBg : B.grayLight,
          titulo: a.titulo,
          mensagem: a.mensagem,
          prazoDate: prazoDate
        };
      });
      setAlerts(mappedAlerts);
    } catch (err: any) {
      console.warn("API indisponível, usando dados de demonstração.", err);
      setProjects(PROJECTS);
      setAlerts(ALERTS);
      setDocuments(PROJECTS.flatMap(p => p.docs));
      setStats({ totalProjects: PROJECTS.length, approvedProjects: PROJECTS.filter(p => p.status === "Aprovado").length, totalValue: PROJECTS.reduce((s, p) => s + p.valor, 0), approvalRate: (PROJECTS.filter(p => p.status === "Aprovado").length / PROJECTS.length) * 100 });
      setAuditLogs([]);
      setLessons([]);
      setIsDemo(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, fetchData]);

  if (!token) return <LoginView />;

  const handleExportCsv = async (type: string) => {
    if (isDemo) {
      // Export from local data in demo mode
      if (type === "pipeline") {
        exportLocalCsv("pipeline.csv",
          ["ID", "Nome", "Edital", "Financiador", "Área", "Valor", "Status", "Prazo", "Probabilidade", "Risco", "Responsável"],
          projects.map(p => [p.id, p.nome, p.edital, p.financiador, p.area, String(p.valor), p.status, p.prazo, String(p.probabilidade), p.risco, p.responsavel])
        );
      } else if (type === "documents") {
        exportLocalCsv("documentos.csv",
          ["Nome", "Projeto", "Status", "Validade"],
          documents.map((d: any) => [d.nome, d.project?.nome || "", d.status, d.validade || "Permanente"])
        );
      } else if (type === "alerts") {
        exportLocalCsv("alertas.csv",
          ["Nível", "Tipo", "Projeto", "Prazo", "Dias"],
          alerts.map(a => [a.nivel, a.tipo, a.projeto, a.prazo, String(a.dias)])
        );
      } else if (type === "captacao") {
        const captados = projects.filter(p => ["Aprovado", "Captado", "Execução", "Formalização"].includes(p.status));
        exportLocalCsv("captacao.csv",
          ["ID", "Nome", "Financiador", "Valor", "Status", "Prazo"],
          captados.map(p => [p.id, p.nome, p.financiador, String(p.valor), p.status, p.prazo])
        );
      } else if (type === "audit-logs") {
        exportLocalCsv("auditoria.csv",
          ["Data", "Ação", "Entidade"],
          auditLogs.map(l => [l.data, l.acao, l.entidade])
        );
      } else if (type === "lessons") {
        exportLocalCsv("licoes.csv",
          ["Projeto", "Lição"],
          lessons.map(l => [l.projeto, l.licao])
        );
      }
    } else {
      try {
        await apiClient.exportCsv(type as any);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro ao exportar");
      }
    }
  };

  const handleCreateLesson = async (l: { projeto: string; licao: string; categoria?: string }) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.createLesson(l);
    const updated = await apiClient.getLessons();
    setLessons(updated);
  };

  const handleUpdateLesson = async (id: string, l: { projeto?: string; licao?: string; categoria?: string }) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.updateLesson(id, l);
    const updated = await apiClient.getLessons();
    setLessons(updated);
  };

  const handleDeleteLesson = async (id: string) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.deleteLesson(id);
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateProject = async (id: string, data: any) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    const updated = await apiClient.updateProject(id, data);
    await fetchData();
    if (updated) setSelectedProject(updated);
  };

  const alertCount = alerts.length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pipeline", label: "Pipeline", icon: GitBranch },
    { id: "editais", label: "Editais", icon: Library },
    { id: "alertas", label: "Alertas", icon: Bell, badge: alertCount },
    { id: "documentos", label: "Documentos", icon: Files },
    { id: "memoria", label: "Memória", icon: History },
    { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  ];

  const handleProjectSelect = (p: Project) => {
    setSelectedProject(p);
    setView("projeto");
  };

  const handleBack = () => {
    setSelectedProject(null);
    setView("pipeline");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-50">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-3xl font-bold tracking-tighter font-serif text-white">ROTA</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Guia Social Intelligence</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSelectedProject(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all uppercase tracking-widest relative",
                view === item.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs">
                {user?.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{user?.name || "Usuário"}</p>
                <p className="text-[10px] text-slate-500 uppercase">{user?.role || "Perfil"}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="Sair"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
              {view === "projeto" ? "Detalhes do Projeto" : navItems.find(n => n.id === view)?.label}
            </h2>
            {loading && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
            {isDemo && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded uppercase">Demo</span>}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase tracking-widest transition-colors disabled:opacity-50"
              title="Atualizar dados do servidor"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              Atualizar
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('pt-BR')}
            </div>
            <button 
              onClick={() => setView("alertas")}
              className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {alertCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* View Container */}
        <div className="p-8 max-w-7xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view + (selectedProject?.id || "")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === "dashboard" && <DashboardView projects={projects} alerts={alerts} onNav={setView} onProject={handleProjectSelect} />}
              {view === "pipeline" && <PipelineView projects={projects} onProject={handleProjectSelect} />}
              {view === "editais" && <EditaisView />}
              {view === "alertas" && <AlertasView alerts={alerts} onExportCsv={handleExportCsv} />}
              {view === "documentos" && <DocumentosView documents={documents} onExportCsv={handleExportCsv} />}
              {view === "memoria" && <MemoriaView stats={stats} auditLogs={auditLogs} lessons={lessons} onCreateLesson={handleCreateLesson} onUpdateLesson={handleUpdateLesson} onDeleteLesson={handleDeleteLesson} onExportCsv={handleExportCsv} />}
              {view === "relatorios" && <RelatoriosView onExportCsv={handleExportCsv} />}
              {view === "projeto" && selectedProject && <ProjectDetailView project={selectedProject} onBack={handleBack} onUpdateProject={handleUpdateProject} isDemo={isDemo} onRefresh={fetchData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
