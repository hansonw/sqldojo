import type { NextApiRequest, NextApiResponse } from "next";
import LRU from "lru-cache";
import { getLeaderboard } from "../../../../lib/leaderboard";
import { LeaderboardResponse } from "../../../../lib/types";
import { getUser } from "../../../../lib/util";

const _cache = new LRU({ max: 10, ttl: 3000 });

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
    const id = req.query.id as string;
    let result = null;
    if (!req.query.self) {
      result = _cache.get(id);
      if (result == null) {
        result = getLeaderboard(user, id, false);
        _cache.set(id, result);
      }
    } else {
      result = getLeaderboard(user, id, true);
    }
    res.status(200).json(await result);
  } catch (e) {
    console.error("[leaderboard] Error: ", e);
    res.status(400).end();
  }
}
