// src/api/client.ts
import { Project, Alert, Document } from "../types";
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
      // Retry original request with new token
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
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Falha na autenticação");
    // Servidor retorna accessToken + refreshToken
    return data;
  },

  async getProjects(): Promise<Project[]> {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar projetos");
    return safeJson(res);
  },

  async createProject(project: Partial<Project>) {
    const res = await fetchWithRefresh(`${API_BASE}/projects`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Erro ao criar projeto");
    return data;
  },

  async getAlerts(): Promise<Alert[]> {
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

  async getAuditLogs() {
    const res = await fetchWithRefresh(`${API_BASE}/audit-logs`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar logs de auditoria");
    return safeJson(res);
  },

  async getDocuments() {
    const res = await fetchWithRefresh(`${API_BASE}/documents`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar documentos");
    return safeJson(res);
  },

  async getStats() {
    const res = await fetchWithRefresh(`${API_BASE}/stats`, { headers: getHeaders() });
    if (!res.ok) throw new Error("Erro ao buscar estatísticas");
    return safeJson(res);
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return safeJson(res);
  },
};
