/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { 
  LayoutDashboard, 
  GitBranch, 
  Library, 
  Bell, 
  Files, 
  History, 
  BarChart3, 
  AlertCircle,
  ExternalLink,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { B, PROJECTS, ALERTS } from "./mockData";
import { Project, Alert as AlertType, LessonLearned } from "./types";
import { useAuthStore } from "./store/authStore";
import { apiClient } from "./api/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { cn, exportLocalCsv } from "./utils/format";

const DashboardView = lazy(() => import("./views/DashboardView"));
const PipelineView = lazy(() => import("./views/PipelineView"));
const ProjectDetailView = lazy(() => import("./views/ProjectDetailView"));
const EditaisView = lazy(() => import("./views/EditaisView"));
const AlertasView = lazy(() => import("./views/AlertasView"));
const DocumentosView = lazy(() => import("./views/DocumentosView"));
const MemoriaView = lazy(() => import("./views/MemoriaView"));
const RelatoriosView = lazy(() => import("./views/RelatoriosView"));
const LoginView = lazy(() => import("./views/LoginView"));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center gap-3 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Carregando...</span>
      </div>
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
      // Use allSettled so that permission errors (403) on restricted endpoints
      // (e.g. /api/stats, /api/audit-logs) don't collapse the entire fetch into demo mode.
      const [pRes, aRes, sRes, lRes, dRes, lessonsRes] = await Promise.allSettled([
        apiClient.getProjects(),
        apiClient.getAlerts(),
        apiClient.getStats(),
        apiClient.getAuditLogs(),
        apiClient.getDocuments(),
        apiClient.getLessons()
      ]);

      // Projects is the primary indicator of server availability.
      // If it fails with a network/server error, fall back to demo mode.
      if (pRes.status === "rejected") {
        const msg = pRes.reason instanceof Error ? pRes.reason.message : "";
        const isNetworkError = msg === "Servidor indisponível" || msg === "Failed to fetch";
        if (isNetworkError) {
          console.warn("API indisponível, usando dados de demonstração.", pRes.reason);
          setProjects(PROJECTS);
          setAlerts(ALERTS);
          setDocuments(PROJECTS.flatMap(p => p.docs));
          setStats({ totalProjects: PROJECTS.length, approvedProjects: PROJECTS.filter(p => p.status === "Aprovado").length, totalValue: PROJECTS.reduce((s, p) => s + p.valor, 0), approvalRate: (PROJECTS.filter(p => p.status === "Aprovado").length / PROJECTS.length) * 100 });
          setAuditLogs([]);
          setLessons([]);
          setIsDemo(true);
          return;
        }
        // Non-network error (e.g. 500): show error but don't enter demo
        setError("Erro ao carregar projetos. Tente novamente.");
        setIsDemo(false);
        return;
      }

      // Server is reachable — use real data, degrade gracefully per endpoint.
      setIsDemo(false);
      setProjects(pRes.value);
      setStats(sRes.status === "fulfilled" ? sRes.value : null);
      setAuditLogs(lRes.status === "fulfilled" ? lRes.value : []);
      setDocuments(dRes.status === "fulfilled" ? dRes.value : []);
      setLessons(lessonsRes.status === "fulfilled" ? lessonsRes.value : []);

      const rawAlerts = aRes.status === "fulfilled" ? aRes.value : [];
      const mappedAlerts: AlertType[] = rawAlerts.map((a: any) => {
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

  if (!token) return <Suspense fallback={<ViewFallback />}><LoginView /></Suspense>;

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

  const handleCreateDocument = async (doc: { projectId: string; nome: string; url?: string; fileType?: string; validade?: string; status?: string }) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.uploadDocument(doc);
    const updated = await apiClient.getDocuments();
    setDocuments(updated);
  };

  const handleUpdateDocument = async (id: string, doc: { nome?: string; url?: string; fileType?: string; validade?: string; status?: string }) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.updateDocument(id, doc);
    const updated = await apiClient.getDocuments();
    setDocuments(updated);
  };

  const handleDeleteDocument = async (id: string) => {
    if (isDemo) { alert("Operação indisponível no modo demonstração."); return; }
    await apiClient.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
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
              <Suspense fallback={<ViewFallback />}>
                {view === "dashboard" && <ErrorBoundary><DashboardView projects={projects} alerts={alerts} onNav={setView} onProject={handleProjectSelect} /></ErrorBoundary>}
                {view === "pipeline" && <ErrorBoundary><PipelineView projects={projects} onProject={handleProjectSelect} /></ErrorBoundary>}
                {view === "editais" && <ErrorBoundary><EditaisView /></ErrorBoundary>}
                {view === "alertas" && <ErrorBoundary><AlertasView alerts={alerts} onExportCsv={handleExportCsv} /></ErrorBoundary>}
                {view === "documentos" && <ErrorBoundary><DocumentosView documents={documents} projects={projects} onCreateDocument={handleCreateDocument} onUpdateDocument={handleUpdateDocument} onDeleteDocument={handleDeleteDocument} onExportCsv={handleExportCsv} /></ErrorBoundary>}
                {view === "memoria" && <ErrorBoundary><MemoriaView stats={stats} auditLogs={auditLogs} lessons={lessons} onCreateLesson={handleCreateLesson} onUpdateLesson={handleUpdateLesson} onDeleteLesson={handleDeleteLesson} onExportCsv={handleExportCsv} /></ErrorBoundary>}
                {view === "relatorios" && <ErrorBoundary><RelatoriosView onExportCsv={handleExportCsv} /></ErrorBoundary>}
                {view === "projeto" && selectedProject && <ErrorBoundary><ProjectDetailView project={selectedProject} onBack={handleBack} onUpdateProject={handleUpdateProject} isDemo={isDemo} onRefresh={fetchData} /></ErrorBoundary>}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
