// src/api/client.ts
import { useAuthStore } from "../store/authStore";

const API_BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("rota_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Safely parse a response as JSON.
 * When the backend is unavailable (e.g. static hosting), API routes return HTML
 * instead of JSON. This helper detects that and throws a clear error.
 */
async function safeJson(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Servidor indisponível");
  }
  return res.json();
}

async function fetchWithRefresh(url: string, options: RequestInit): Promise<Response> {
  let res = await fetch(url, options);

  if (res.status === 401) {
    const refreshToken = localStorage.getItem("rota_refresh_token");
    if (!refreshToken) {
      useAuthStore.getState().logout();
      return res;
    }
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) throw new Error("refresh failed");
      const { accessToken } = await safeJson(refreshRes);
      useAuthStore.getState().setToken(accessToken);
      const retryOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      };
      res = await fetch(url, retryOptions);
    } catch {
      useAuthStore.getState().logout();
    }
  }
  return res;
}

export const apiClient = {
  // --- Auth ---
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Falha na autenticação");
    return data;
  },

  // --- Projects ---
  async getProjects() {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar projetos");
    const json = await safeJson(res);
    // Handle both paginated { data, total } and plain array responses
    return Array.isArray(json) ? json : (json.data || []);
  },

  async createProject(project: any) {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao criar projeto");
    return data;
  },

  async updateProject(id: string, project: any) {
    const res = await fetchWithRefresh(`${API_BASE}/projects/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar projeto");
    return data;
  },

  async deleteProject(id: string) {
    const res = await fetchWithRefresh(`${API_BASE}/projects/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao excluir projeto");
    return data;
  },

  // --- Alerts ---
  async getAlerts() {
    const res = await fetchWithRefresh(`${API_BASE}/alerts`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar alertas");
    return safeJson(res);
  },

  async readAlert(id: string) {
    const res = await fetchWithRefresh(`${API_BASE}/alerts/${id}/read`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Erro ao marcar alerta como lido");
    return safeJson(res);
  },

  async resolveAlert(id: string, resolucao: string) {
    const res = await fetchWithRefresh(`${API_BASE}/alerts/${id}/resolve`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ resolucao }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao resolver alerta");
    return data;
  },

  // --- Expenses ---
  async createExpense(expense: any) {
    const res = await fetchWithRefresh(`${API_BASE}/expenses`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao processar despesa");
    return data;
  },

  // --- Documents ---
  async getDocuments() {
    const res = await fetchWithRefresh(`${API_BASE}/documents`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar documentos");
    const json = await safeJson(res);
    // Handle both paginated { data, total } and plain array responses
    return Array.isArray(json) ? json : (json.data || []);
  },

  async uploadDocument(doc: any) {
    const res = await fetchWithRefresh(`${API_BASE}/documents`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(doc),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao salvar documento");
    return data;
  },

  async updateDocument(id: string, doc: any) {
    const res = await fetchWithRefresh(`${API_BASE}/documents/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(doc),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar documento");
    return data;
  },

  async deleteDocument(id: string) {
    const res = await fetchWithRefresh(`${API_BASE}/documents/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao excluir documento");
    return data;
  },

  // --- Audit Logs ---
  async getAuditLogs() {
    const res = await fetchWithRefresh(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar logs de auditoria");
    const json = await safeJson(res);
    // Handle both paginated { data, total } and plain array responses
    return Array.isArray(json) ? json : (json.data || []);
  },

  // --- Stats ---
  async getStats() {
    const res = await fetchWithRefresh(`${API_BASE}/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar estatísticas");
    return safeJson(res);
  },

  // --- Lessons Learned ---
  async getLessons() {
    const res = await fetchWithRefresh(`${API_BASE}/lessons`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar lições aprendidas");
    return safeJson(res);
  },

  async createLesson(lesson: { projeto: string; licao: string; categoria?: string }) {
    const res = await fetchWithRefresh(`${API_BASE}/lessons`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(lesson),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao criar lição");
    return data;
  },

  async updateLesson(id: string, lesson: { projeto?: string; licao?: string; categoria?: string }) {
    const res = await fetchWithRefresh(`${API_BASE}/lessons/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(lesson),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar lição");
    return data;
  },

  async deleteLesson(id: string) {
    const res = await fetchWithRefresh(`${API_BASE}/lessons/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao excluir lição");
    return data;
  },

  // --- CSV Exports ---
  async exportCsv(type: "pipeline" | "captacao" | "documents" | "alerts" | "audit-logs" | "lessons") {
    const res = await fetchWithRefresh(`${API_BASE}/export/${type}`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao exportar CSV");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // --- Health ---
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return safeJson(res);
  },

  // --- Setup ---
  async getSetupStatus(): Promise<{ needsSetup: boolean }> {
    const res = await fetch(`${API_BASE}/setup/status`);
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao verificar status do sistema");
    return data;
  },

  async initSetup(payload: { email: string; name: string; password: string }) {
    const res = await fetch(`${API_BASE}/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro na configuração inicial");
    return data;
  },
};
