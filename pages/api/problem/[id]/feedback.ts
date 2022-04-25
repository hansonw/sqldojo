import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { getUser } from "../../../../lib/util";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Object>
) {
  const user = await getUser({ req });
  if (!user || req.method !== "POST" || req.query.liked == null) {
    res.status(400).json({});
    return;
  }

  try {
    await prisma.problemFeedback.create({
      data: {
        problemId: req.query.id as string,
        userId: user.id,
        liked: req.query.liked === "true",
      },
    });
    res.status(200).json({});
  } catch (err) {
    console.error("[feedback]", err);
    res.status(500).json({});
  }
}
