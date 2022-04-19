export const INCORRECT_PENALTY_SECS = 300;

export type LeaderboardProblemState = {
  status: "open" | "attempted" | "solved";
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
