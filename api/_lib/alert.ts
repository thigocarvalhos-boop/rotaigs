import { prisma } from "./prisma.js";

export const alertService = {
  async create({
    projectId,
    titulo,
    mensagem,
    nivel,
    tipo,
  }: {
    projectId?: string;
    titulo: string;
    mensagem: string;
    nivel: string;
    tipo: string;
  }) {
    return prisma.alert.create({
      data: { projectId, titulo, mensagem, nivel, tipo, status: "PENDENTE" },
    });
  },
};
