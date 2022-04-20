export const INCORRECT_PENALTY_SECS = 300;

export type LeaderboardProblemStatus = "open" | "attempted" | "solved";

export type LeaderboardProblemState = {
  status: LeaderboardProblemStatus;
  openTimestamp: number;
  attempts: number;
  solveTimeSecs: number;
};

export type LeaderboardRow = {
  userImage: string;
  userName: string;
  problemState: { [problemId: string]: LeaderboardProblemState };
  totalPoints: number;
  totalTimeSecs: number;
};

export type LeaderboardResponse = {
  ranking: LeaderboardRow[];
};
