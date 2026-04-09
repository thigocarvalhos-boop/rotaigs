/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  ArrowLeft, Calendar, Library, GitBranch, Clock, AlertCircle, CheckCircle2,
  Download, Info, TrendingUp, Files, ShieldCheck, BarChart3, History,
  Pencil, Save, X, FileText, RefreshCw, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Project } from "../types";
import { Card } from "../components/ui/Card";
import { StatusBadge, RiskBadge } from "../components/ui/Badges";
import {
  cn, fmt, exportLocalCsv, handleDocumentDownload,
  isDocExpired, isDocExpiringSoon, docStatusColor, docStatusLabel, STATUS_META
} from "../utils/format";

export default function ProjectDetailView({ project, onBack, onUpdateProject, isDemo, onRefresh }: { project: Project; onBack: () => void; onUpdateProject?: (id: string, data: any) => Promise<void>; isDemo?: boolean; onRefresh?: () => Promise<void> }) {
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
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Prazo: {new Date(project.prazo).toLocaleDateString("pt-BR")}</span>
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
                  { label: "Responsável", value: typeof project.responsavel === "object" ? (project.responsavel as any)?.name || "" : project.responsavel },
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
              {project.ptCriterios && project.ptCriterios.length > 0 ? (
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
              ) : (
                <Card title="Parecer Técnico Interno (PTI)">
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Critérios PTI não disponíveis para este projeto.</p>
                    <p className="text-[10px] text-slate-300 mt-1">Dados de análise técnica disponíveis apenas em modo demonstração.</p>
                  </div>
                </Card>
              )}

              {/* Anti-glosa Section */}
              <Card 
                title="Módulo Antiglosa & Compliance" 
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Health Score:</span>
                    <span className={cn("text-sm font-bold", project.scoreCompliance != null ? ((project.scoreCompliance || 0) > 80 ? "text-emerald-600" : "text-amber-600") : "text-slate-400")}>
                      {project.scoreCompliance != null ? `${project.scoreCompliance}%` : "N/D"}
                    </span>
                  </div>
                }
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Risco de Glosa</p>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xl font-bold", project.scoreRiscoGlosa != null ? ((project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600") : "text-slate-400")}>
                          {project.scoreRiscoGlosa != null ? `${project.scoreRiscoGlosa}%` : "N/D"}
                        </span>
                        {project.scoreRiscoGlosa != null && (
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", (project.scoreRiscoGlosa || 0) < 20 ? "bg-emerald-500" : "bg-red-500")} 
                            style={{ width: `${project.scoreRiscoGlosa}%` }} 
                          />
                        </div>
                        )}
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
                    <span className={cn("text-3xl font-bold", project.scoreCompliance != null ? "text-slate-900" : "text-slate-300")}>{project.scoreCompliance != null ? `${project.scoreCompliance}%` : "N/D"}</span>
                    {project.scoreCompliance != null && <span className="text-xs text-emerald-600 font-bold mb-1">Conforme</span>}
                  </div>
                </Card>
                <Card className="bg-slate-50 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Risco de Glosa</p>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-3xl font-bold", project.scoreRiscoGlosa != null ? ((project.scoreRiscoGlosa || 0) < 20 ? "text-emerald-600" : "text-red-600") : "text-slate-300")}>
                      {project.scoreRiscoGlosa != null ? `${project.scoreRiscoGlosa}%` : "N/D"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium mb-1">{project.scoreRiscoGlosa != null ? "Calculado" : "Somente demonstração"}</span>
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
              <Card title="Auditoria Preventiva de Despesas">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Despesa</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cotações</th>
                        <th className="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">ID</th>
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
                {project.historico && project.historico.length > 0 ? (
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
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
                    <History className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Histórico não disponível para este projeto.</p>
                    <p className="text-[10px] text-slate-300 mt-1">Dados de histórico disponíveis apenas em modo demonstração.</p>
                  </div>
                )}
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
                <p className="text-sm text-slate-800 font-medium">{typeof project.responsavel === "object" ? (project.responsavel as any)?.name || "" : project.responsavel}</p>
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
