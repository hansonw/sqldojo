import {
  ActionIcon,
  AppShell,
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
  const [problems, submissions] = await Promise.all([
    prisma.problem.findMany({
      where: problemFilter,
      orderBy: [{ points: "asc" }, { id: "asc" }],
    }),
    prisma.problemSubmission.findMany({
      where: {
        problem: problemFilter,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);
  return {
    props: {
      competition: serializePrisma(competition),
      problems,
      submissions: serializePrisma(submissions),
    },
  };
}

const Competition: React.FC<{
  competition: Competition;
  problems: Problem[];
  submissions: ProblemSubmission[];
}> = ({ competition, problems, submissions }) => {
  const theme = useMantineTheme();
  const [showNavbar, setShowNavbar] = React.useState(true);
  const [selectedProblem, setProblem] = React.useState<Problem | null>(null);
  const [localOpenProblems, setLocalOpenProblems] = React.useState(
    Immutable.Map<string, number>()
  );
  const selfLeaderboard = useSWR<LeaderboardResponse>(
    `/api/c/${competition.id}/leaderboard?self=1`,
    (key) => fetch(key).then((r) => r.json())
  );
  const selfLeaderboardRow = selfLeaderboard.data?.ranking?.[0];

  function optimisticOpen(problemId: string) {
    setLocalOpenProblems((set) => set.set(problemId, Date.now()));
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
        attempts: (existingState?.attempts ?? 0) + 1,
        solveTimeSecs: correct ? submissionTime : 0,
        status: correct ? "solved" : "attempted",
      };
      selfLeaderboard.mutate(selfLeaderboard.data, {
        optimisticData: selfLeaderboard.data,
      });
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

  const queryStore = React.useMemo(() => {
    const map = new Map();
    for (const submission of submissions) {
      let queries = map.get(submission.problemId);
      if (!queries) {
        queries = [];
        map.set(submission.problemId, queries);
      }
      queries.push(QueryStore.fromSubmission(submission));
    }
    return map;
  }, [submissions]);

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
        >
          <ActionIcon
            style={{ position: "absolute", right: 0, top: "50%" }}
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
                  const problemState =
                    selfLeaderboardRow?.problemState?.[problem.id];
                  if (problemState?.status === "solved") {
                    bullet = (
                      <ThemeIcon color="green">
                        <Check />
                      </ThemeIcon>
                    );
                  } else if (problemState?.status === "attempted") {
                    bullet = (
                      <ThemeIcon color="red">
                        <X />
                      </ThemeIcon>
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
                  }
                  return (
                    <Timeline.Item
                      key={problem.id}
                      bullet={bullet}
                      color="green"
                      title={
                        <span
                          style={{
                            fontWeight:
                              problem.id === selectedProblem?.id
                                ? "bold"
                                : null,
                          }}
                        >
                          {problem.name}
                        </span>
                      }
                      onClick={() => Router.push(`#${problem.id}`)}
                    >
                      <Text
                        color="dimmed"
                        size="xs"
                        weight={selectedProblem?.id === problem.id ? 600 : null}
                      >
                        {problem.points} points
                        {problemState?.attempts > 1
                          ? ` (${problemState.attempts} attempts)`
                          : null}
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
            <UnstyledButton onClick={() => Router.push("/")} mr="lg">
              <Title>SQL Dojo</Title>
            </UnstyledButton>
            <HeaderAuth />
          </Group>
        </Header>
      }
    >
      {selectedProblem ? (
        <Problem
          problem={selectedProblem}
          queryStore={queryStore}
          onValidate={(correct) => {
            optimisticScore(selectedProblem.id, correct);
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
