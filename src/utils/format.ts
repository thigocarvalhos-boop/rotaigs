import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { B } from "../mockData";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmt(v: number) {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v}`;
}

export function isDocExpired(validade?: string | null): boolean {
  if (!validade) return false;
  return new Date(validade) < new Date();
}

export function isDocExpiringSoon(validade?: string | null, days = 30): boolean {
  if (!validade) return false;
  const exp = new Date(validade);
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / 86400000;
  return diff > 0 && diff <= days;
}

export function docStatusColor(status: string, validade?: string | null) {
  if (isDocExpired(validade)) return "bg-red-50 text-red-600";
  if (isDocExpiringSoon(validade)) return "bg-amber-50 text-amber-600";
  if (status === "Aprovado") return "bg-emerald-50 text-emerald-600";
  return "bg-amber-50 text-amber-600";
}

export function docStatusLabel(status: string, validade?: string | null) {
  if (isDocExpired(validade)) return "Vencido";
  if (isDocExpiringSoon(validade)) return "A Vencer";
  return status;
}

export function exportLocalCsv(filename: string, headers: string[], rows: string[][]) {
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

export function handleDocumentDownload(url?: string | null) {
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

export const AREA_COLORS = ["#1A7C7E", "#E8A020", "#7C3AED", "#0369A1", "#059669", "#DC2626", "#D97706", "#374151"];

export const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
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
