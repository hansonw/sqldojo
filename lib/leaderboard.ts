import { User } from "@prisma/client";
import prisma from "./prisma";
import {
  INCORRECT_PENALTY_SECS,
  LeaderboardResponse,
  LeaderboardRow,
} from "./types";

export async function getLeaderboard(
  user: User,
  competitionId: string,
  selfOnly: boolean
): Promise<LeaderboardResponse> {
  const userFilter = selfOnly ? { userId: user.id } : {};
  const [participants, opens, submissions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
      },
      where: {
        problemOpens: {
          some: {
            problem: {
              competitionId,
            },
          },
        },
      },
    }),
    prisma.problemOpen.findMany({
      where: {
        problem: {
          competitionId,
        },
        ...userFilter,
      },
    }),
    prisma.problemSubmission.findMany({
      where: {
        problem: {
          competitionId,
        },
        ...userFilter,
      },
      include: {
        problem: {
          select: {
            points: true,
          },
        },
      },
      orderBy: {
        correct: "asc",
      },
    }),
  ]);
  const users: Map<string, LeaderboardRow> = new Map();
  if (!participants.find((p) => p.id === user.id)) {
    participants.push(user);
  }
  for (const user of participants) {
    users.set(user.id, {
      userImage: user.image,
      userName: user.name,
      problemState: {},
      totalPoints: 0,
      totalTimeSecs: 0,
    });
  }
  for (const open of opens) {
    const user = users.get(open.userId);
    if (user == null) {
      continue;
    }
    user.problemState[open.problemId] = {
      status: "open",
      openTimestamp: open.createdAt.getTime(),
      attempts: 0,
      solveTimeSecs: 0,
    };
  }
  for (const submission of submissions) {
    const user = users.get(submission.userId);
    if (user == null) {
      continue;
    }
    const problemState = user.problemState[submission.problemId];
    problemState.attempts += 1;
    const submissionTime =
      (submission.createdAt.getTime() - problemState.openTimestamp) / 1000;
    if (submission.correct) {
      if (problemState.status !== "solved") {
        // note: we ordered by correct, so all failures have been processed
        problemState.status = "solved";
        problemState.solveTimeSecs = submissionTime;
        user.totalPoints += submission.problem.points;
        user.totalTimeSecs +=
          problemState.solveTimeSecs +
          (problemState.attempts - 1) * INCORRECT_PENALTY_SECS;
      }
    } else {
      problemState.status = "attempted";
    }
  }
  // points descending, time ascending
  const ranking = Array.from(users.values()).sort((x, y) => {
    const c = y.totalPoints - x.totalPoints;
    if (c != 0) return c;
    return x.totalTimeSecs - y.totalTimeSecs;
  });
  return { ranking };
}
