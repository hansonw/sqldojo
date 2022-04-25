export const INCORRECT_PENALTY_SECS = 300;
export const MAX_TIME_SECS = 3600;

export type LeaderboardProblemStatus = "open" | "attempted" | "solved";

export type LeaderboardProblemState = {
  status: LeaderboardProblemStatus;
  openTimestamp: number;
  attempts: number;
  solveTimeSecs: number;
  codexAssists: number;
};

export type LeaderboardRow = {
  userImage: string;
  userName: string;
  problemState: { [problemId: string]: LeaderboardProblemState };
  totalPoints: number;
  totalTimeSecs: number;
  codexAssists: number;
};

export type LeaderboardFeedItem = {
  userName: string;
  userImage: string;
  problemName: string;
  description: string;
  descriptionColor: string | null;
  query: string;
  timestamp: number;
};

export type LeaderboardResponse = {
  ranking: LeaderboardRow[];
  feed: LeaderboardFeedItem[];
};
