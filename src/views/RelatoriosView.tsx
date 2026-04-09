/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, TrendingUp, Files, Bell, ShieldCheck, History, Download } from "lucide-react";

export default function RelatoriosView({ onExportCsv }: { onExportCsv: (type: string) => void }) {
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
