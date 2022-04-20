import {
  Avatar,
  Badge,
  Box,
  Center,
  Table,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { Problem } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import useSWR from "swr";
import { Check, Point, X } from "tabler-icons-react";
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
    {
      fallbackData: initialLeaderboard,
      revalidateOnMount: false,
      refreshInterval: 3000,
    }
  );
  return (
    <Box
      p="lg"
      style={{
        height: "calc(100vh)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Center mb="md">
        <Title>Leaderboard</Title>
      </Center>
      <Table horizontalSpacing={2} verticalSpacing={2}>
        <style jsx>{`
          th:not(:first-child) {
            text-align: center;
          }
          td:not(:first-child) {
            text-align: center;
          }
        `}</style>
        <thead>
          <tr>
            <th>User</th>
            {problems.map((p, i) => (
              <th key={i}>{p.name}</th>
            ))}
            <th>Points</th>
            <th>Time (m)</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.data?.ranking?.map((row, i) => (
            <tr key={i}>
              <td>
                <Center inline>
                  <Avatar src={row.userImage} size="sm" radius="xl" m="xs" />{" "}
                  {row.userName}
                </Center>
              </td>
              {problems.map((p, j) => {
                let icon = null;
                const state = row.problemState[p.id];
                switch (state?.status) {
                  case "open":
                    icon = (
                      <Tooltip label="Opened">
                        <ThemeIcon color="blue" radius={16}>
                          <Point />
                        </ThemeIcon>
                      </Tooltip>
                    );
                    break;
                  case "attempted":
                    icon = (
                      <Tooltip label="Attempted">
                        <ThemeIcon color="red" radius={16}>
                          <X />
                        </ThemeIcon>
                      </Tooltip>
                    );
                    break;
                  case "solved":
                    icon = (
                      <Tooltip label="Solved">
                        <ThemeIcon color="green" radius={16}>
                          <Check />
                        </ThemeIcon>
                      </Tooltip>
                    );
                    break;
                }
                let attempts = null;
                if (state?.attempts) {
                  attempts = (
                    <Tooltip label="Penalties" style={{ position: "absolute" }}>
                      <Badge size="xs">{state.attempts}</Badge>
                    </Tooltip>
                  );
                }
                return (
                  <td key={j}>
                    {icon}
                    {attempts}
                  </td>
                );
              })}
              <td>{row.totalPoints}</td>
              <td>{Math.round(row.totalTimeSecs / 60)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Box>
  );
}
