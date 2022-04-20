import { Container, Table, Title } from "@mantine/core";
import { Problem } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import useSWR from "swr";
import { getLeaderboard } from "../../../lib/leaderboard";
import prisma from "../../../lib/prisma";
import type { LeaderboardResponse } from "../../../lib/types";
import { getUser } from "../../../lib/util";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getUser(context);
  if (!user) {
    return {
      redirect: {
        destination: "/",
      },
    };
  }
  const competitionId = context.params.id as string;
  const [problems, initialLeaderboard] = await Promise.all([
    prisma.problem.findMany({
      where: { competitionId },
      orderBy: [{ points: "asc" }, { id: "asc" }],
    }),
    getLeaderboard(user, competitionId, false),
  ]);
  return {
    props: {
      competitionId,
      problems,
      initialLeaderboard,
    },
  };
}

export default function Leaderboard({
  competitionId,
  problems,
  initialLeaderboard,
}: {
  competitionId: string;
  problems: Problem[];
  initialLeaderboard: LeaderboardResponse;
}) {
  const leaderboard = useSWR<LeaderboardResponse>(
    `/api/c/${competitionId}/leaderboard`,
    (key) => fetch(key).then((r) => r.json()),
    { fallbackData: initialLeaderboard, revalidateOnMount: false }
  );
  return (
    <Container>
      <Title>Leaderboard</Title>
      <Table horizontalSpacing={2} verticalSpacing={2}>
        <thead>
          <tr>
            <th>User</th>
            {problems.map((p, i) => (
              <th key={i}>{p.name}</th>
            ))}
            <th>Points</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.data?.ranking?.map((row, i) => (
            <tr key={i}>
              <td>{row.userName}</td>
              {problems.map((p, j) => (
                <td key={j}>{row.problemState[p.id]?.status}</td>
              ))}
              <td>{row.totalPoints}</td>
              <td>{row.totalTimeSecs}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
