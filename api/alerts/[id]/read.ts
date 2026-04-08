import { prisma } from "../../_lib/prisma.js";
import { authenticate } from "../../_lib/auth.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "PATCH") return res.status(405).end();

  const user = authenticate(req, res);
  if (!user) return;

  try {
    const alert = await prisma.alert.update({
      where: { id: req.query.id },
      data: { lido: true, lidoEm: new Date(), lidoPor: user.id },
    });
    res.json(alert);
  } catch {
    res.status(404).json({ error: "Alerta não encontrado" });
  }
}
