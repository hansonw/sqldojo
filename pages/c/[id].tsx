import {
  ActionIcon,
  Anchor,
  AppShell,
  Badge,
  Box,
  Group,
  Header,
  Navbar,
  Text,
  ThemeIcon,
  Timeline,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Competition, Problem, ProblemSubmission } from "@prisma/client";
import Immutable from "immutable";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import Router from "next/router";
import React from "react";
import ReactMarkdown from "react-markdown";
import useSWR from "swr";
import { Check, ChevronLeft, ChevronRight, Point, X } from "tabler-icons-react";
import HeaderAuth from "../../components/HeaderAuth";
import { LiveTimer } from "../../components/LiveTimer";
import { getLeaderboard } from "../../lib/leaderboard";
import prisma from "../../lib/prisma";
import { QueryStore } from "../../lib/QueryStore";
import type { LeaderboardResponse } from "../../lib/types";
import { getUser, serializePrisma } from "../../lib/util";

const Problem = dynamic(() => import("../../components/Problem"), {
  ssr: false,
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const user = await getUser(context);
  if (!user) {
    return {
      redirect: {
        destination: "/",
      },
    };
  }

  const competition = await prisma.competition.findUnique({
    where: {
      id: context.params.id as string,
    },
  });
  if (competition.startDate > new Date() && !user.isAdmin) {
    return {
      redirect: {
        destination: "/",
      },
    };
  }

  const problemFilter = {
    competitionId: competition.id,
  };
  const [problems, submissions, initialLeaderboard] = await Promise.all([
    prisma.problem.findMany({
      where: problemFilter,
      orderBy: [{ points: "asc" }, { id: "asc" }],
    }),
    prisma.problemSubmission.findMany({
      where: {
        problem: problemFilter,
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getLeaderboard(user, competition.id, true),
  ]);
  return {
    props: {
      competition: serializePrisma(competition),
      problems,
      submissions: serializePrisma(submissions),
      initialLeaderboard,
    },
  };
}

const Competition: React.FC<{
  competition: Competition;
  problems: Problem[];
  submissions: ProblemSubmission[];
  initialLeaderboard: LeaderboardResponse;
}> = ({ competition, problems, submissions, initialLeaderboard }) => {
  const theme = useMantineTheme();
  const [showNavbar, setShowNavbar] = React.useState(true);
  const [selectedProblem, setProblem] = React.useState<Problem | null>(null);
  const [localOpenProblems, setLocalOpenProblems] = React.useState(
    Immutable.Map<string, number>()
  );
  const selfLeaderboard = useSWR<LeaderboardResponse>(
    `/api/c/${competition.id}/leaderboard?self=1`,
    (key) => fetch(key).then((r) => r.json()),
    { fallbackData: initialLeaderboard, revalidateOnMount: false }
  );
  const selfLeaderboardRow = selfLeaderboard.data?.ranking?.[0];

  function optimisticOpen(problemId: string) {
    if (!localOpenProblems.has(problemId)) {
      setLocalOpenProblems((set) => set.set(problemId, Date.now()));
    }
  }

  function optimisticScore(problemId: string, correct: boolean) {
    if (selfLeaderboardRow == null) {
      selfLeaderboard.mutate();
    } else {
      const existingState = selfLeaderboardRow.problemState[problemId];
      const openTimestamp =
        existingState?.openTimestamp ?? localOpenProblems.get(problemId) ?? 0;
      const submissionTime = (Date.now() - openTimestamp) / 1000;
      selfLeaderboardRow.problemState[problemId] = {
        openTimestamp,
        ...existingState,
        attempts: (existingState?.attempts ?? 0) + (correct ? 0 : 1),
        solveTimeSecs: correct ? submissionTime : 0,
        status: correct ? "solved" : "attempted",
      };
      const problem = problems.find((p) => p.id === problemId);
      selfLeaderboardRow.totalPoints += problem?.points ?? 0;
      const newData = { ...selfLeaderboard.data };
      selfLeaderboard.mutate(newData, { optimisticData: newData });
    }
  }

  React.useEffect(() => {
    function handleHashChange() {
      const problem = problems.find(
        (problem) => problem.id === window.location.hash.substring(1)
      );
      if (problem != null) {
        optimisticOpen(problem.id);
      }
      setProblem(problem);
    }
    handleHashChange();
    Router.events.on("hashChangeComplete", handleHashChange);
    return () => Router.events.off("hashChangeComplete", handleHashChange);
  }, []);

  const [queryStore, setQueryStore] = React.useState(() => {
    let map = Immutable.Map<string, Immutable.List<QueryStore>>();
    for (const submission of submissions) {
      map = map.set(
        submission.problemId,
        (map.get(submission.problemId) ?? Immutable.List<QueryStore>()).push(
          QueryStore.fromSubmission(submission)
        )
      );
    }
    return map;
  });

  return (
    <AppShell
      styles={{
        main: {
          background:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
          overflow: "hidden",
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      padding={0}
      fixed
      navbar={
        <Navbar
          p="md"
          hiddenBreakpoint="sm"
          hidden // NOTE: only actually hides on hiddenBreakpoint
          width={{ sm: showNavbar ? 300 : 32, lg: showNavbar ? 300 : 32 }}
          style={{ overflowY: "auto" }}
        >
          <ActionIcon
            style={{ position: "absolute", right: 0, top: "50%", zIndex: 99 }}
            onClick={() => setShowNavbar(!showNavbar)}
          >
            {showNavbar ? <ChevronLeft /> : <ChevronRight />}
          </ActionIcon>
          {showNavbar && (
            <>
              <UnstyledButton
                onClick={() => Router.push("#")}
                title={competition.name}
                sx={{
                  "&:hover": {
                    backgroundColor: theme.colors.gray[1],
                  },
                }}
                mb="md"
              >
                <Text weight={500}>{competition.name}</Text>
              </UnstyledButton>
              <Timeline
                bulletSize={24}
                lineWidth={2}
                styles={{
                  item: {
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: theme.colors.gray[1],
                    },
                  },
                }}
              >
                {problems.map((problem) => {
                  let bullet = null;
                  let statusText = null;
                  const isSelected = problem.id === selectedProblem?.id;
                  const problemState =
                    selfLeaderboardRow?.problemState?.[problem.id];
                  const timer = isSelected && (
                    <>
                      (
                      <LiveTimer
                        start={
                          problemState?.openTimestamp ??
                          localOpenProblems.get(problem.id) ??
                          0
                        }
                      />
                      )
                    </>
                  );
                  if (problemState?.status === "solved") {
                    bullet = (
                      <ThemeIcon color="green">
                        <Check />
                      </ThemeIcon>
                    );
                    statusText = (
                      <>
                        Solved!
                        {problemState?.attempts
                          ? ` (${problemState.attempts}x penalty)`
                          : null}
                      </>
                    );
                  } else if (problemState?.status === "attempted") {
                    bullet = (
                      <ThemeIcon color="red">
                        <X />
                      </ThemeIcon>
                    );
                    statusText = (
                      <>
                        {problemState.attempts} attempts {timer}
                      </>
                    );
                  } else if (
                    problemState?.status === "open" ||
                    localOpenProblems.has(problem.id)
                  ) {
                    bullet = (
                      <ThemeIcon color="blue" radius={16}>
                        <Point />
                      </ThemeIcon>
                    );
                    statusText = <>Timer started {timer}</>;
                  } else {
                    statusText = (
                      <Text size="xs" color="dimmed">
                        Unopened
                      </Text>
                    );
                  }
                  return (
                    <Timeline.Item
                      key={problem.id}
                      bullet={bullet}
                      color="green"
                      title={
                        <span
                          style={{
                            fontWeight: isSelected ? "bold" : null,
                          }}
                        >
                          {problem.name}
                        </span>
                      }
                      onClick={() => Router.push(`#${problem.id}`)}
                      style={{
                        backgroundColor: isSelected
                          ? theme.colors.gray[1]
                          : null,
                      }}
                    >
                      <Text size="xs" weight={isSelected ? 600 : null}>
                        {statusText}
                      </Text>
                      <Text
                        color="dimmed"
                        size="xs"
                        weight={isSelected ? 600 : null}
                      >
                        {problem.points} points
                      </Text>
                    </Timeline.Item>
                  );
                })}
              </Timeline>
            </>
          )}
        </Navbar>
      }
      header={
        <Header height={70} p="md">
          <Group position="apart">
            <Group>
              <UnstyledButton onClick={() => Router.push("/")} mr="lg">
                <Title>SQL Dojo</Title>
              </UnstyledButton>
              <Anchor href={`/c/${competition.id}/leaderboard`} target="_blank">
                <Text>Leaderboard</Text>
              </Anchor>
              <Badge
                variant="gradient"
                gradient={{ from: "indigo", to: "cyan" }}
              >
                Your points: {selfLeaderboardRow?.totalPoints ?? 0}
              </Badge>
            </Group>
            <HeaderAuth />
          </Group>
        </Header>
      }
    >
      {selectedProblem ? (
        <Problem
          problem={selectedProblem}
          status={
            selfLeaderboardRow?.problemState?.[selectedProblem.id]?.status
          }
          queryStore={queryStore}
          onQuery={(query) => {
            const q = new QueryStore(
              String(Math.random()),
              query,
              selectedProblem.id
            );
            setQueryStore((s) =>
              s.set(
                selectedProblem.id,
                (s.get(selectedProblem.id) ?? Immutable.List()).push(q)
              )
            );
          }}
          onValidate={(correct) => {
            optimisticScore(selectedProblem.id, correct);
          }}
          onDelete={(queryId) => {
            setQueryStore((s) =>
              s.set(
                selectedProblem.id,
                (s.get(selectedProblem.id) ?? Immutable.List()).filter(
                  (q) => q.id !== queryId
                )
              )
            );
          }}
        />
      ) : (
        <Box pl="md">
          <ReactMarkdown children={competition.content} />
        </Box>
      )}
    </AppShell>
  );
};

export default Competition;
