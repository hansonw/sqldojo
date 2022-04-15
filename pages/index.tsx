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
} from "@mantine/core";

export const getServerSideProps: GetStaticProps = async () => {
  const competitions = (await prisma.competition.findMany({})).map((c) => ({
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
  const theme = useMantineTheme();
  const secondaryColor =
    theme.colorScheme === "dark" ? theme.colors.dark[1] : theme.colors.gray[7];

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
      // footer={
      //   <Footer height={60} p="md">
      //     Application footer
      //   </Footer>
      // }
      header={
        <Header height={70} p="md">
          <div
            style={{ display: "flex", alignItems: "center", height: "100%" }}
          >
            <Title>SQL Dojo</Title>
          </div>
        </Header>
      }
    >
      <Stack>
        {props.competitions.map((competition) => (
          <a
            key={competition.id}
            href={`/c/${competition.id}`}
            style={{ textDecoration: "none" }}
          >
            <Card shadow="sm" p="lg">
              <Text weight={500}>{competition.name}</Text>
              <Text
                size="sm"
                style={{ color: secondaryColor, lineHeight: 1.5 }}
              >
                Active now!
              </Text>
            </Card>
          </a>
        ))}
      </Stack>
    </AppShell>
  );
};

export default Competitions;
