import {
  ActionIcon,
  AppShell,
  Box,
  Group,
  Header,
  Navbar,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Competition, Problem } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import Router from "next/router";
import React from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight } from "tabler-icons-react";
import HeaderAuth from "../../components/HeaderAuth";
import prisma from "../../lib/prisma";
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

  const problems = await prisma.problem.findMany({
    where: {
      competition: {
        id: competition.id,
      },
    },
    orderBy: [{ points: "asc" }, { id: "asc" }],
  });
  return {
    props: { competition: serializePrisma(competition), problems },
  };
}

const Competition: React.FC<{
  competition: Competition;
  problems: Problem[];
}> = ({ competition, problems }) => {
  const theme = useMantineTheme();
  const [showNavbar, setShowNavbar] = React.useState(true);
  const [selectedProblem, setProblem] = React.useState<Problem | null>(null);

  React.useEffect(() => {
    function handleHashChange() {
      setProblem(
        problems.find(
          (problem) => problem.id === window.location.hash.substring(1)
        )
      );
    }
    handleHashChange();
    Router.events.on("hashChangeComplete", handleHashChange);
    return () => Router.events.off("hashChangeComplete", handleHashChange);
  }, []);

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
              >
                <Text weight={500} mb="xs">
                  {competition.name}
                </Text>
              </UnstyledButton>
              {problems.map((problem) => (
                <UnstyledButton
                  key={problem.id}
                  onClick={() => Router.push(`#${problem.id}`)}
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
                    weight={selectedProblem?.id === problem.id ? 600 : null}
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
      {selectedProblem ? (
        <Problem problem={selectedProblem} />
      ) : (
        <Box pl="md">
          <ReactMarkdown children={competition.content} />
        </Box>
      )}
    </AppShell>
  );
};

export default Competition;
