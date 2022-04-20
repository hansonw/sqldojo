import type { NextApiRequest, NextApiResponse } from "next";
import { getLeaderboard } from "../../../../lib/leaderboard";
import { LeaderboardResponse } from "../../../../lib/types";
import { getUser } from "../../../../lib/util";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse>
) {
  const user = await getUser({ req });
  if (!user || req.method !== "GET") {
    res.status(400).end();
    return;
  }
  try {
    if (!req.query.self) {
      res.setHeader("Cache-Control", "public, s-maxage=5");
    }
    res
      .status(200)
      .json(
        await getLeaderboard(
          user,
          req.query.id as string,
          Boolean(req.query.self)
        )
      );
  } catch (e) {
    console.error("[leaderboard] Error: ", e);
    res.status(400).end();
  }
}
