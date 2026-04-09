/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List, Download } from "lucide-react";
import { Alert as AlertType } from "../types";
import { B } from "../mockData";
import { Card } from "../components/ui/Card";
import { cn } from "../utils/format";

export default function AlertasView({ alerts, onExportCsv }: { alerts: AlertType[]; onExportCsv: (type: string) => void }) {
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
