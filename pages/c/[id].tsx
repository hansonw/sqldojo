import React from "react";
import { GetServerSideProps } from "next";
import prisma from "../../lib/prisma";
import { Competition, Problem } from "@prisma/client";
import {
  AppShell,
  Header,
  Text,
  useMantineTheme,
  Title,
  Navbar,
  UnstyledButton,
  Burger,
} from "@mantine/core";
import Router from "next/router";

import dynamic from "next/dynamic";

const Problem = dynamic(() => import("../../components/Problem"), {
  ssr: false,
});

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const competition = await prisma.competition.findUnique({
    where: {
      id: params.id as string,
    },
  });
  const problems = await prisma.problem.findMany({
    where: {
      competition: {
        id: competition.id,
      },
    },
    orderBy: [{ points: "asc" }, { id: "asc" }],
  });
  return {
    props: { name: competition.name, problems },
  };
};

const Competition: React.FC<{ name: string; problems: Problem[] }> = ({
  name,
  problems,
}) => {
  const theme = useMantineTheme();
  const [showNavbar, setShowNavbar] = React.useState(true);
  const [selectedProblem, setProblem] = React.useState(problems[0]);
  return (
    <AppShell
      styles={{
        main: {
          background:
            theme.colorScheme === "dark"
              ? theme.colors.dark[8]
              : theme.colors.gray[0],
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      padding={0}
      fixed
      navbar={
        showNavbar && (
          <Navbar
            p="md"
            hiddenBreakpoint="sm"
            hidden // NOTE: only actually hides on hiddenBreakpoint
            width={{ sm: 300, lg: 300 }}
          >
            <Text weight={500} mb="xs">
              {name}
            </Text>
            {problems.map((problem) => (
              <UnstyledButton
                key={problem.id}
                onClick={() => setProblem(problem)}
                sx={(theme) => ({
                  display: "block",
                  width: "100%",
                  padding: theme.spacing.xs,
                  borderRadius: theme.radius.sm,
                  color:
                    theme.colorScheme === "dark"
                      ? theme.colors.dark[0]
                      : theme.black,

                  "&:hover": {
                    backgroundColor:
                      theme.colorScheme === "dark"
                        ? theme.colors.dark[6]
                        : theme.colors.gray[0],
                  },
                })}
              >
                <Text
                  size="sm"
                  weight={selectedProblem.id === problem.id ? 600 : null}
                >
                  [{problem.difficulty}] {problem.name}
                </Text>
              </UnstyledButton>
            ))}
          </Navbar>
        )
      }
      header={
        <Header height={70} p="md">
          <div
            style={{ display: "flex", alignItems: "center", height: "100%" }}
          >
            <UnstyledButton onClick={() => Router.push("/")} mr="lg">
              <Title>SQL Dojo</Title>
            </UnstyledButton>
            <UnstyledButton
              onClick={() => setShowNavbar(!showNavbar)}
              title="Toggle nav bar"
            >
              <Text>Problems</Text>
            </UnstyledButton>
          </div>
        </Header>
      }
    >
      <Problem problem={selectedProblem} />
    </AppShell>
  );
};

export default Competition;
