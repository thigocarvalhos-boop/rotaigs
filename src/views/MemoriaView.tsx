/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { GitBranch, TrendingUp, ShieldCheck, History, Plus, Pencil, Trash2, Save, Download } from "lucide-react";
import { LessonLearned } from "../types";
import { B } from "../mockData";
import { Card } from "../components/ui/Card";
import { fmt } from "../utils/format";

export default function MemoriaView({ stats, auditLogs, lessons, onCreateLesson, onUpdateLesson, onDeleteLesson, onExportCsv }: { 
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
