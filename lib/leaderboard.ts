import { User } from "@prisma/client";
import prisma from "./prisma";
import {
  INCORRECT_PENALTY_SECS,
  LeaderboardResponse,
  LeaderboardRow,
  MAX_TIME_SECS,
} from "./types";

export async function getLeaderboard(
  user: User,
  competitionId: string,
  selfOnly: boolean
): Promise<LeaderboardResponse> {
  const userFilter = selfOnly ? { userId: user.id } : {};
  const [participants, opens, submissions, codexPrompts] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
      },
      where: selfOnly
        ? { id: user.id }
        : {
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
    prisma.codexPrompt.findMany({
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
    }),
  ]);
  const users: Map<string, LeaderboardRow> = new Map();
  for (const user of participants) {
    users.set(user.id, {
      userImage: user.image,
      userName: user.name,
      problemState: {},
      totalPoints: 0,
      totalTimeSecs: 0,
      codexAssists: 0,
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
      codexAssists: 0,
    };
  }
  for (const submission of submissions) {
    const user = users.get(submission.userId);
    if (user == null) {
      continue;
    }
    const problemState = user.problemState[submission.problemId];
    const submissionTime = Math.min(
      MAX_TIME_SECS,
      (submission.createdAt.getTime() - problemState.openTimestamp) / 1000
    );
    if (submission.correct) {
      if (problemState.status !== "solved") {
        // note: we ordered by correct, so all failures have been processed
        problemState.status = "solved";
        problemState.solveTimeSecs = submissionTime;
        user.totalPoints += submission.problem.points;
        user.totalTimeSecs +=
          problemState.solveTimeSecs +
          problemState.attempts * INCORRECT_PENALTY_SECS;
      }
    } else {
      problemState.status = "attempted";
      problemState.attempts += 1;
    }
  }
  for (const prompt of codexPrompts) {
    const user = users.get(prompt.userId);
    if (user == null) {
      continue;
    }
    user.codexAssists += 1;
    const problemState = user.problemState[prompt.problemId];
    if (problemState != null) {
      problemState.codexAssists += 1;
    }
  }
  // points descending, time ascending
  const ranking = Array.from(users.values()).sort((x, y) => {
    return (
      y.totalPoints - x.totalPoints ||
      x.totalTimeSecs - y.totalTimeSecs ||
      x.codexAssists - y.codexAssists ||
      x.userName.localeCompare(y.userName)
    );
  });
  return { ranking };
}
