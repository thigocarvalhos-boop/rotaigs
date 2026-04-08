import { prisma } from "../../_lib/prisma.js";
import { authenticate } from "../../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "PATCH") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  const { resolucao } = req.body || {};
  if (!resolucao?.trim()) {
    return res.status(400).json({ error: "Campo 'resolucao' é obrigatório para encerrar o alerta" });
  }

  try {
    const alert = await prisma.alert.update({
      where: { id: req.query.id },
      data: { status: "RESOLVIDO", resolucao, lido: true, lidoEm: new Date(), lidoPor: user.id },
    });
    res.json(alert);
  } catch {
    res.status(404).json({ error: "Alerta não encontrado" });
  }
}
