import React from "react";
import { GetServerSideProps } from "next";
import ReactMarkdown from "react-markdown";
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
  Aside,
  Textarea,
  Group,
  Button,
  Stack,
  Card,
  ScrollArea,
  Progress,
  Table,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";

import remarkGfm from "remark-gfm";
import Router from "next/router";
import { Prism } from "@mantine/prism";
import useSWR from "swr";

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
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  function onSubmit(e) {
    setQueries(queries.concat([form.values.query]));
    e.preventDefault();
  }
  const [problem, setProblem] = React.useState(problems[0]);
  const [queries, setQueries] = React.useState([]);
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
      navbar={
        <Navbar p="md" hiddenBreakpoint="sm" width={{ sm: 200, lg: 300 }}>
          <Text weight={500}>{name}</Text>
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
              <Text size="sm">
                [{problem.difficulty}] {problem.name}
              </Text>
            </UnstyledButton>
          ))}
        </Navbar>
      }
      header={
        <Header height={70} p="md">
          <div
            style={{ display: "flex", alignItems: "center", height: "100%" }}
          >
            <UnstyledButton onClick={() => Router.push("/")}>
              <Title>SQL Dojo</Title>
            </UnstyledButton>
          </div>
        </Header>
      }
      aside={
        <Aside p="md" hiddenBreakpoint="sm" width={{ sm: 400, lg: 400 }}>
          <Aside.Section>
            <Title order={3}>Query Console</Title>
          </Aside.Section>
          <Aside.Section grow component={ScrollArea} mx="-xs" px="xs">
            {queries.length === 0 ? (
              <Text>Enter a query below to get started</Text>
            ) : (
              <Stack>
                {queries.map((query, i) => (
                  <Query key={i} database={problem.dbName} query={query} />
                ))}
              </Stack>
            )}
          </Aside.Section>
          <Aside.Section>
            <form onSubmit={onSubmit}>
              <Textarea
                label="Type in a PostgreSQL SELECT query"
                placeholder="Query"
                autosize
                minRows={2}
                maxRows={10}
                styles={{ input: { fontFamily: "Menlo, monospace" } }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) {
                    onSubmit(e);
                  }
                }}
                {...form.getInputProps("query")}
              />
              <Group position="right" mt="md">
                <Button type="submit">Execute</Button>
              </Group>
            </form>
          </Aside.Section>
        </Aside>
      }
    >
      <Title>{problem.name}</Title>
      <Text>
        <ReactMarkdown
          children={problem.description}
          remarkPlugins={[remarkGfm]}
        />
      </Text>
    </AppShell>
  );
};

function Query({ query, database }) {
  const swr = useSWR(query, () =>
    fetch(`/api/query?database=${database}`, {
      body: query,
      method: "POST",
    }).then((response) => response.json())
  );

  const rows = swr.data?.rows?.map((row, i) => (
    <tr key={i}>
      {Object.values(row).map((value, j) => (
        <td key={j}>{value}</td>
      ))}
    </tr>
  ));

  return (
    <Card shadow="sm" p="sm" style={{ maxWidth: 400 }}>
      <Prism language="sql" noCopy colorScheme="dark">
        {query}
      </Prism>
      {rows != null ? (
        rows.length === 0 || !swr.data?.columns?.length ? (
          <Alert title="Empty result" color="yellow">
            Your query came back empty.
          </Alert>
        ) : (
          <Stack>
            <Table>
              <thead>
                <tr>
                  {swr.data?.columns.map((key, i) => (
                    <th key={i}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
            <Button type="submit">Final Answer?</Button>
          </Stack>
        )
      ) : swr.error ? (
        <Alert title="Error" color="red">
          {swr.error}
        </Alert>
      ) : (
        <Progress value={100} animate mt="xs" />
      )}
    </Card>
  );
}

export default Competition;
