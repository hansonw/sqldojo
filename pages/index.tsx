import {
  AppShell,
  Button,
  Card,
  Center,
  Group,
  Header,
  Stack,
  Text,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Competition as CompetitionModel, User } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import Head from "next/head";
import Router from "next/router";
import React, { useEffect } from "react";
import HeaderAuth from "../components/HeaderAuth";
import { Logo } from "../components/Logo";
import { useTimeUntil } from "../components/useTimeUntil";
import prisma from "../lib/prisma";
import { getUser, serializePrisma } from "../lib/util";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const [user, competitions] = await Promise.all([
    getUser(context),
    prisma.competition.findMany({
      orderBy: {
        startDate: "desc",
      },
    }),
  ]);
  return { props: serializePrisma({ competitions, user }) };
}

type Props = {
  competitions: CompetitionModel[];
  user: User;
};

const Competitions: React.FC<Props> = ({ competitions, user }) => {
  return (
    <AppShell
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      fixed
      header={
        <Header height={70} p="md">
          <Group position="apart">
            <Logo />
            <HeaderAuth />
          </Group>
        </Header>
      }
    >
      <Head>
        <title>SQL Dojo</title>
      </Head>
      {user ? (
        <Stack>
          {competitions.map((competition) => (
            <Competition
              competition={competition}
              user={user}
              key={competition.id}
            />
          ))}
        </Stack>
      ) : (
        <Center>
          <Card shadow="sm" style={{ textAlign: "center" }}>
            <Text mb={12}>Welcome! Sign in to get started.</Text>
            <Button type="submit" onClick={() => signIn("auth0")}>
              Sign in
            </Button>
          </Card>
        </Center>
      )}
    </AppShell>
  );
};

function Competition({
  competition,
  user,
}: {
  competition: CompetitionModel;
  user: User;
}) {
  const startDate = new Date(competition.startDate);
  const endDate = new Date(competition.endDate);
  const now = useTimeUntil(startDate.getTime());
  let status: string;
  let enabled = true;
  if (now >= endDate.getTime()) {
    status = "Competition is over! But feel free to check out the problems.";
  } else {
    if (now >= startDate.getTime()) {
      status = "Active now! Click here to enter.";
    } else {
      status = "Contest starts at " + startDate.toLocaleString();
      const remainingSecs = (startDate.getTime() - now) / 1000;
      if (remainingSecs < 60 * 60 * 24) {
        // get hours, minutes, seconds remaining
        status += ` (in ${Math.floor(
          remainingSecs / 60 / 60
        )} hours, ${Math.floor(
          (remainingSecs / 60) % 60
        )} minutes, ${Math.floor(remainingSecs % 60)} seconds)`;
      }
      enabled = false;
    }
  }
  return (
    <UnstyledButton
      key={competition.id}
      disabled={!enabled && !user.isAdmin}
      onClick={() => Router.push(`/c/${competition.id}`)}
      style={{
        opacity: enabled ? 1 : 0.7,
        transition: "all 0.5s ease",
      }}
    >
      <Card
        shadow="sm"
        p="lg"
        sx={(theme) => ({
          background: enabled
            ? theme.fn.linearGradient(
                45,
                theme.colors.indigo[1],
                theme.colors.cyan[1]
              )
            : null,
          transition: "all 0.5s ease",
        })}
      >
        <Text weight={500}>{competition.name}</Text>
        <Text size="sm" color="dimmed" style={{ lineHeight: 1.5 }}>
          {status}
        </Text>
      </Card>
    </UnstyledButton>
  );
}

export default Competitions;
