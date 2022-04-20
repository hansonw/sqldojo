import prisma from "../../../../lib/prisma";
import { getUser } from "../../../../lib/util";

export default async function handler(req, res) {
  const user = await getUser({ req });
  if (!user || req.method !== "POST" || !req.query.id) {
    res.status(400).json({});
    return;
  }
  try {
    const result = await prisma.problemOpen.upsert({
      where: {
        problemId_userId: {
          problemId: req.query.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        problemId: req.query.id,
        userId: user.id,
      },
    });
    res.status(200).json(result);
  } catch (e) {
    console.error("[open] Error: ", e);
    res.status(400).json({ error: String(e) });
  }
}
