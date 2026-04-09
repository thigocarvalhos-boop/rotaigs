/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Project } from "../types";
import { Card } from "../components/ui/Card";
import { getFileIcon } from "../components/ui/FileIcon";
import { cn, isDocExpired, isDocExpiringSoon, docStatusColor, docStatusLabel, handleDocumentDownload } from "../utils/format";

export default function DocumentosView({ documents, projects, onCreateDocument, onUpdateDocument, onDeleteDocument, onExportCsv }: {
  documents: any[];
  projects: Project[];
  onCreateDocument: (doc: { projectId: string; nome: string; url?: string; fileType?: string; validade?: string; status?: string }) => Promise<void>;
  onUpdateDocument: (id: string, doc: { nome?: string; url?: string; fileType?: string; validade?: string; status?: string }) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onExportCsv: (type: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formFileType, setFormFileType] = useState("");
  const [formValidade, setFormValidade] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formStatus, setFormStatus] = useState("Pendente");
  const [saving, setSaving] = useState(false);

  const fileTypeOptions = ["PDF", "DOC", "DOCX", "XLS", "XLSX", "IMG", "OTHER"];
  const statusOptions = ["Pendente", "Aprovado", "Em Revisão", "Em Análise"];

  const startCreate = () => {
    setEditingId(null);
    setFormNome("");
    setFormUrl("");
    setFormFileType("");
    setFormValidade("");
    setFormProjectId(projects.length > 0 ? projects[0].id : "");
    setFormStatus("Pendente");
    setShowForm(true);
  };

  const startEdit = (doc: any) => {
    setEditingId(doc.id);
    setFormNome(doc.nome || "");
    setFormUrl(doc.url || "");
    setFormFileType(doc.fileType || "");
    setFormValidade(doc.validade ? doc.validade.slice(0, 10) : "");
    setFormStatus(doc.status || "Pendente");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formNome.trim()) return;
    if (!editingId && !formProjectId) return;
    setSaving(true);
    try {
      if (editingId) {
        await onUpdateDocument(editingId, {
          nome: formNome,
          url: formUrl || undefined,
          fileType: formFileType || undefined,
          validade: formValidade || undefined,
          status: formStatus,
        });
      } else {
        await onCreateDocument({
          projectId: formProjectId,
          nome: formNome,
          url: formUrl || undefined,
          fileType: formFileType || undefined,
          validade: formValidade || undefined,
          status: formStatus,
        });
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar documento");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none";
  const labelClass = "text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1 block";
  const selectClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Gestão Documental</h2>
          <p className="text-slate-500 text-sm">Biblioteca institucional e certidões</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Documento
          </button>
          <button 
            onClick={() => onExportCsv("documents")}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {showForm && (
        <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
          <h4 className="text-xs font-bold text-indigo-800 uppercase">{editingId ? "Editar Documento" : "Novo Documento"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nome *</label>
              <input type="text" placeholder="Nome do documento" value={formNome} onChange={e => setFormNome(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>URL do documento</label>
              <input type="url" placeholder="https://..." value={formUrl} onChange={e => setFormUrl(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tipo de arquivo</label>
              <select value={formFileType} onChange={e => setFormFileType(e.target.value)} className={selectClass}>
                <option value="">Selecione...</option>
                {fileTypeOptions.map(ft => <option key={ft} value={ft}>{ft}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Data de validade</label>
              <input type="date" value={formValidade} onChange={e => setFormValidade(e.target.value)} className={inputClass} />
            </div>
            {!editingId && (
              <div>
                <label className={labelClass}>Projeto *</label>
                <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} className={selectClass}>
                  <option value="">Selecione...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelClass}>Status</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={selectClass}>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving || !formNome.trim() || (!editingId && !formProjectId)}
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
                    <div key={doc.id || idx} className={cn(
                      "flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group",
                      expired && "bg-red-50/50",
                      expiring && !expired && "bg-amber-50/50"
                    )}>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.fileType)}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{doc.nome}</p>
                          <div className="flex items-center gap-2 flex-wrap">
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
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase", docStatusColor(doc.status, doc.validade))}>
                          {docStatusLabel(doc.status, doc.validade)}
                        </span>
                        <button
                          onClick={() => startEdit(doc)}
                          className="p-1.5 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Editar documento"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm("Excluir este documento?")) onDeleteDocument(doc.id); }}
                          className="p-1.5 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
