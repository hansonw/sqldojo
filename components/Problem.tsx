import React from "react";
import ReactMarkdown from "react-markdown";
import { Problem as ProblemModel } from "@prisma/client";
import ResizePanel from "react-resize-panel";
import { useRef } from "react";
import remarkGfm from "remark-gfm";
import {
  Title,
  Stack,
  Textarea,
  Group,
  Button,
  Text,
  Alert,
  Card,
  Progress,
  Table,
  Box,
  ActionIcon,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Prism } from "@mantine/prism";
import { Check, X, Trash, Terminal } from "tabler-icons-react";
import useSWR from "swr/immutable";

const _queries = new Map();

const Problem: React.FC<{ problem: ProblemModel }> = ({ problem }) => {
  const queryViewport = useRef<HTMLDivElement>();
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  const [_, setUpdateCounter] = React.useState(0);
  const scrollToBottom = React.useCallback(() => {
    // After React update..
    setTimeout(() => {
      queryViewport.current.scrollTo(0, queryViewport.current.scrollHeight);
    }, 0);
  }, [queryViewport]);
  const onSubmit = React.useCallback(
    (e: any) => {
      if (!_queries.has(problem.id)) {
        _queries.set(problem.id, []);
      }
      _queries.get(problem.id).push(form.values.query);
      setUpdateCounter((c) => c + 1);
      scrollToBottom();
      e.preventDefault();
    },
    [form, scrollToBottom]
  );
  const queries = _queries.get(problem.id);
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 2,
        flexFlow: "row nowrap",
        height: "calc(100vh - var(--mantine-header-height))",
      }}
    >
      <div style={{ flexGrow: 1, overflow: "scroll", padding: 12 }}>
        <Title>{problem.name}</Title>
        <Text>
          <ReactMarkdown
            children={problem.description}
            remarkPlugins={[remarkGfm]}
          />
        </Text>
      </div>
      <ResizePanel direction="w">
        <Box
          sx={(theme) => ({
            flexGrow: 1,
            minWidth: 400,
            background: "white",
            display: "flex",
            flexDirection: "column",
            borderLeft: `1px solid ${theme.colors.gray[3]}`,
          })}
        >
          <Box
            sx={(theme) => ({
              borderBottom: `1px solid ${theme.colors.gray[3]}`,
            })}
            p="sm"
          >
            <Title order={3}>
              <Terminal style={{ verticalAlign: "middle", marginRight: 8 }} />
              Query Console
            </Title>
          </Box>
          <div style={{ flexGrow: 1, overflowY: "scroll" }} ref={queryViewport}>
            {!queries?.length ? (
              <Text m="sm">Enter a query below to get started!</Text>
            ) : (
              queries.map((query, i) => (
                <div style={{ marginBottom: 8, maxWidth: "100%" }} key={i}>
                  <Query
                    database={problem.dbName}
                    query={query}
                    onComplete={scrollToBottom}
                    onDelete={() => {
                      _queries.get(problem.id).splice(i, 1);
                      setUpdateCounter((c) => c + 1);
                    }}
                  />
                </div>
              ))
            )}
          </div>
          <Box
            sx={(theme) => ({ borderTop: `1px solid ${theme.colors.gray[3]}` })}
            p="sm"
          >
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
          </Box>
        </Box>
      </ResizePanel>
    </div>
  );
};

enum AnswerState {
  Waiting,
  Correct,
  Incorrect,
}

function getButton(state: AnswerState | null, onSubmit) {
  switch (state) {
    case null:
      return (
        <Button type="submit" onClick={onSubmit} style={{ flexGrow: 1 }}>
          Submit Answer
        </Button>
      );
    case AnswerState.Waiting:
      return (
        <Button type="submit" disabled style={{ flexGrow: 1 }}>
          Checking...
        </Button>
      );
    case AnswerState.Correct:
      return (
        <UnstyledButton
          sx={(theme) => ({
            borderRadius: 4,
            backgroundColor: theme.colors.green[6],
            flexGrow: 1,
            color: "white",
            height: 36,
            textAlign: "center",
          })}
        >
          <Text>You got it! 🎉</Text>
        </UnstyledButton>
      );

    case AnswerState.Incorrect:
      return (
        <UnstyledButton
          sx={(theme) => ({
            borderRadius: 4,
            backgroundColor: theme.colors.orange[8],
            flexGrow: 1,
            color: "white",
            height: 36,
            textAlign: "center",
          })}
        >
          <Text>Sorry, wrong answer — try again</Text>
        </UnstyledButton>
      );
  }
}

function Query({ query, database, onComplete, onDelete }) {
  const swr = useSWR(`${database}:${query}`, () =>
    fetch(`/api/query?database=${database}`, {
      body: query,
      method: "POST",
    })
      .then((response) => response.json())
      .finally(onComplete)
  );

  const [answerState, setAnswerState] = React.useState(null);

  function onSubmit() {
    if (answerState != null) {
      return;
    }
    setAnswerState(AnswerState.Waiting);
    fetch(`/api/verify?database=${database}`, {
      body: query,
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.correct) {
          setAnswerState(AnswerState.Correct);
        } else {
          setAnswerState(AnswerState.Incorrect);
        }
      });
  }

  const rows = swr.data?.rows?.map((row, i) => (
    <tr key={i}>
      {Object.values(row).map((value, j) => (
        <td key={j}>{value}</td>
      ))}
    </tr>
  ));
  const error = swr.error || swr.data?.error;

  let content = null;
  if (rows != null) {
    if (rows.length === 0 || !swr.data?.columns?.length) {
      content = (
        <Stack pt="xs">
          <Alert title="Empty result" color="yellow">
            Your query came back empty.
          </Alert>
          <Button
            leftIcon={<Trash />}
            onClick={onDelete}
            variant="outline"
            color="red"
          >
            Delete
          </Button>
        </Stack>
      );
    } else {
      content = (
        <Stack pt="xs">
          <div style={{ maxWidth: "100%", overflowX: "scroll" }}>
            <Table horizontalSpacing={2} verticalSpacing={2} striped>
              <thead>
                <tr>
                  {swr.data?.columns.map((key, i) => (
                    <th key={i}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </Table>
          </div>
          {swr.data!.count > rows.length && (
            <Alert title="Truncated result" color="yellow">
              Only showing {rows.length} rows out of {swr.data!.count} total.
            </Alert>
          )}
          <Group>
            {getButton(answerState, onSubmit)}
            {answerState == null && (
              <ActionIcon
                variant="outline"
                color="red"
                onClick={onDelete}
                size={36}
              >
                <Trash />
              </ActionIcon>
            )}
          </Group>
        </Stack>
      );
    }
  } else if (error) {
    content = (
      <Stack pt="xs">
        <Alert title="Error" color="red">
          {error}
        </Alert>
        <Button
          leftIcon={<Trash />}
          onClick={onDelete}
          variant="outline"
          color="red"
        >
          Delete
        </Button>
      </Stack>
    );
  } else {
    content = <Progress value={100} animate mt="xs" />;
  }

  return (
    <Card shadow="sm" p="sm" m="sm" style={{ maxWidth: "100%" }} withBorder>
      <Prism language="sql" noCopy colorScheme="dark" scrollAreaComponent="div">
        {query}
      </Prism>
      {content}
    </Card>
  );
}

export default Problem;
