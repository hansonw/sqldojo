import {
  Avatar,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  Transition,
} from "@mantine/core";
import { Prism } from "@mantine/prism";
import { Competition, Problem, User } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";
import Head from "next/head";
import useSWR from "swr";
import { Check, FileDescription, Point, X } from "tabler-icons-react";
import { Countdown } from "../../../components/Countdown";
import { getLeaderboard } from "../../../lib/leaderboard";
import prisma from "../../../lib/prisma";
import type { LeaderboardResponse } from "../../../lib/types";
import { getUser, serializePrisma } from "../../../lib/util";

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
  const [competition, problems, initialLeaderboard] = await Promise.all([
    prisma.competition.findUnique({
      where: {
        id: competitionId,
      },
    }),
    prisma.problem.findMany({
      where: { competitionId },
      orderBy: [{ points: "asc" }, { id: "asc" }],
    }),
    getLeaderboard(user, competitionId, false),
  ]);
  return {
    props: {
      user: serializePrisma(user),
      competition: serializePrisma(competition),
      problems,
      initialLeaderboard,
    },
  };
}

export default function Leaderboard({
  user,
  competition,
  problems,
  initialLeaderboard,
}: {
  user: User;
  competition: Competition;
  problems: Problem[];
  initialLeaderboard: LeaderboardResponse;
}) {
  const leaderboard = useSWR<LeaderboardResponse>(
    `/api/c/${competition.id}/leaderboard`,
    (key) => fetch(key).then((r) => r.json()),
    {
      fallbackData: initialLeaderboard,
      revalidateOnMount: false,
      refreshInterval: 3000,
    }
  );
  return (
    <>
      <Box
        p="lg"
        style={{
          height: `calc(${user.isAdmin ? 60 : 100}vh)`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        <Head>
          <title>SQL Dojo - Leaderboard</title>
        </Head>
        <Center>
          <Title>{competition.name} Leaderboard</Title>
        </Center>
        <Center mb="md">
          <Text size="sm">
            <Countdown endDate={new Date(competition.endDate)} />
          </Text>
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
              <th>Time (min)</th>
              <th>Codex #</th>
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
                        <Tooltip
                          label={`Solved in ${
                            Math.round((state.solveTimeSecs / 60) * 10) / 10
                          } mins`}
                        >
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
                      <Tooltip
                        label="Penalties"
                        style={{ position: "absolute", top: -12, right: -8 }}
                      >
                        <Badge size="xs" style={{ padding: "0 4px" }}>
                          {state.attempts}
                        </Badge>
                      </Tooltip>
                    );
                  }
                  let codex = null;
                  if (state?.codexAssists) {
                    codex = (
                      <Tooltip
                        label={`Used OpenAI Codex (${state.codexAssists} prompts)`}
                        style={{ position: "absolute", bottom: 0, right: -8 }}
                      >
                        <Badge size="xs" style={{ padding: "0 4px" }}>
                          ★
                        </Badge>
                      </Tooltip>
                    );
                  }
                  return (
                    <td key={j}>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        {icon}
                        {attempts}
                        {codex}
                      </div>
                    </td>
                  );
                })}
                <td>{row.totalPoints}</td>
                <td>{Math.round(row.totalTimeSecs / 60)}</td>
                <td>{row.codexAssists}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Box>
      {user.isAdmin && (
        <Box
          p="lg"
          sx={(theme) => ({
            borderTop: `1px solid ${theme.colors.gray[3]}`,
            height: "calc(40vh)",
            overflowY: "auto",
          })}
        >
          <Title order={4}>Live Feed</Title>
          {leaderboard.data?.feed?.map((row, i) => (
            <Transition mounted transition="pop">
              {(styles) => (
                <Card
                  key={row.timestamp}
                  shadow="sm"
                  mt="sm"
                  mb="sm"
                  sx={(theme) => ({
                    ...styles,
                    border: `1px solid ${theme.colors.gray[3]}`,
                  })}
                >
                  <Card.Section p="sm">
                    <Group position="apart">
                      <Group spacing="xs">
                        <Avatar src={row.userImage} size="xs" radius="xl">
                          {row.userName}
                        </Avatar>
                        <Text size="sm">
                          {row.userName}{" "}
                          <b style={{ color: row.descriptionColor }}>
                            {row.description}
                          </b>{" "}
                          for {row.problemName}
                        </Text>
                      </Group>
                      <Text size="sm" color="dimmed">
                        {new Date(row.timestamp).toLocaleString()}
                      </Text>
                    </Group>
                  </Card.Section>
                  <Card.Section>
                    <Prism
                      language={"sql"}
                      noCopy
                      colorScheme="dark"
                      style={{
                        filter: "blur(0.2em)",
                      }}
                    >
                      {row.query.replaceAll("\n", "\t")}
                    </Prism>
                  </Card.Section>
                </Card>
              )}
            </Transition>
          ))}
        </Box>
      )}
    </>
  );
}
