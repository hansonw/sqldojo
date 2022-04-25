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
  const [participants, opens, queries, submissions, codexPrompts] =
    await Promise.all([
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
      prisma.problemQuery.findMany({
        where: {
          problem: {
            competitionId,
          },
          ...userFilter,
        },
        include: {
          problem: {
            select: {
              name: true,
            },
          },
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
              name: true,
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
              name: true,
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
  let feed = user.isAdmin ? [] : null;
  for (const submission of submissions) {
    const user = users.get(submission.userId);
    if (user == null) {
      continue;
    }
    const problemState = user.problemState[submission.problemId];
    if (problemState == null) {
      // note: this should not happen!!
      continue;
    }
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
    feed?.push({
      userName: user.userName,
      userImage: user.userImage,
      problemName: submission.problem.name,
      description: `submitted a ${
        submission.correct ? "correct" : "incorrect"
      } answer`,
      descriptionColor: submission.correct ? "green" : "red",
      query: submission.query,
      timestamp: submission.createdAt.getTime(),
    });
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
    feed?.push({
      userName: user.userName,
      userImage: user.userImage,
      problemName: prompt.problem.name,
      description: `used OpenAI Codex to get a prompt`,
      descriptionColor: "blue",
      query: prompt.answer,
      timestamp: prompt.createdAt.getTime(),
    });
  }
  for (const query of queries) {
    const user = users.get(query.userId);
    if (user == null) {
      continue;
    }
    feed?.push({
      userName: user.userName,
      userImage: user.userImage,
      problemName: query.problem.name,
      description: `ran a query`,
      descriptionColor: null,
      query: query.query,
      timestamp: query.createdAt.getTime(),
    });
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
  feed?.sort((x, y) => y.timestamp - x.timestamp);
  return { ranking, feed: feed?.slice(0, 25) ?? [] };
}
