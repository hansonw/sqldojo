import {
  AppShell,
  Button,
  Card,
  Center,
  Group,
  Header,
  Stack,
  Text,
  Title,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Competition as CompetitionModel, User } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { getSession, signIn } from "next-auth/react";
import Router from "next/router";
import React from "react";
import HeaderAuth from "../components/HeaderAuth";
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
      {user ? (
        <Stack>
          {competitions.map((competition) => {
            let status: string;
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
                disabled={!enabled && !user.isAdmin}
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

export default Competitions;
