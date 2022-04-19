import React from "react";
import { GetServerSidePropsContext } from "next";
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
  ActionIcon,
  Group,
} from "@mantine/core";
import Router from "next/router";

import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "tabler-icons-react";
import HeaderAuth from "../../components/HeaderAuth";
import { getUser } from "../../lib/util";

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
}

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
      <Problem problem={selectedProblem} />
    </AppShell>
  );
};

export default Competition;
