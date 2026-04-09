/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Library, ChevronRight, Search } from "lucide-react";
import { Edital } from "../types";
import { EDITAIS } from "../mockData";
import { cn, fmt } from "../utils/format";

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

export default function EditaisView() {
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
