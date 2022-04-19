import React from "react";
import { GetStaticProps } from "next";
import prisma from "../lib/prisma";
import { Competition as CompetitionModel } from "@prisma/client";
import {
  AppShell,
  Header,
  Text,
  useMantineTheme,
  Title,
  Stack,
  Card,
  UnstyledButton,
  Button,
  Container,
  Loader,
  Group,
} from "@mantine/core";
import Router from "next/router";
import { useSession, signIn } from "next-auth/react";
import HeaderAuth from "../components/HeaderAuth";

export const getServerSideProps: GetStaticProps = async () => {
  const competitions = (
    await prisma.competition.findMany({
      orderBy: {
        startDate: "desc",
      },
    })
  ).map((c) => ({
    ...c,
    startDate: String(c.startDate),
    endDate: String(c.endDate),
  }));
  return { props: { competitions } };
};

type Props = {
  competitions: CompetitionModel[];
};

const Competitions: React.FC<Props> = (props) => {
  const { data: session, status: sessionStatus } = useSession();
  const theme = useMantineTheme();
  const secondaryColor =
    theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.gray[7];
  const now = new Date();

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
      fixed
      header={
        <Header height={70} p="md">
          <Group position="apart">
            <div
              style={{ display: "flex", alignItems: "center", height: "100%" }}
            >
              <Title>SQL Dojo</Title>
            </div>
            <HeaderAuth />
          </Group>
        </Header>
      }
    >
      {session ? (
        <Stack>
          {props.competitions.map((competition) => {
            let status;
            let enabled = true;
            if (new Date(competition.endDate) < now) {
              status =
                "Competition is over! You can still participate asynchronously.";
            } else {
              const startDate = new Date(competition.startDate);
              if (startDate < now) {
                status = "Active now!";
              } else {
                status = "Contest starts at " + startDate.toLocaleString();
                enabled = false;
              }
            }
            return (
              <UnstyledButton
                key={competition.id}
                disabled={false}
                onClick={() => Router.push(`/c/${competition.id}`)}
                style={{
                  opacity: enabled ? 1 : 0.5,
                }}
              >
                <Card shadow="sm" p="lg">
                  <Text weight={500}>{competition.name}</Text>
                  <Text
                    size="sm"
                    style={{ color: secondaryColor, lineHeight: 1.5 }}
                  >
                    {status}
                  </Text>
                </Card>
              </UnstyledButton>
            );
          })}
        </Stack>
      ) : sessionStatus === "loading" ? (
        <Container>
          <Loader />
        </Container>
      ) : (
        <Container>
          <Card shadow="sm" style={{ textAlign: "center" }}>
            <Text mb={12}>Welcome! Sign in to get started.</Text>
            <Button type="submit" onClick={() => signIn("auth0")}>
              Sign in
            </Button>
          </Card>
        </Container>
      )}
    </AppShell>
  );
};

export default Competitions;
