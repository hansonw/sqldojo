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
  ScrollArea,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Prism } from "@mantine/prism";
import { Check, X } from "tabler-icons-react";
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
        maxHeight: "calc(100vh - var(--mantine-header-height))",
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
            <Title order={3}>Query Console</Title>
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

function getButtonText(state: AnswerState | null) {
  switch (state) {
    case null:
      return "Submit Answer";
    case AnswerState.Waiting:
      return "Checking...";
    case AnswerState.Correct:
      return "You got it! 🎉";
    case AnswerState.Incorrect:
      return "Bummer, try again?";
  }
}

function Query({ query, database, onComplete }) {
  const swr = useSWR(query, () =>
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
        <Alert title="Empty result" color="yellow">
          Your query came back empty.
        </Alert>
      );
    } else {
      content = (
        <Stack pt="xs">
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
          {swr.data!.count > rows.length && (
            <Alert title="Truncated result" color="yellow">
              Only showing {rows.length} rows out of {swr.data!.count} total.
            </Alert>
          )}
          <Button
            type="submit"
            variant="gradient"
            gradient={
              answerState === AnswerState.Correct
                ? { from: "teal", to: "lime" }
                : answerState === AnswerState.Incorrect
                ? { from: "orange", to: "red" }
                : { from: "indigo", to: "cyan" }
            }
            leftIcon={
              answerState === AnswerState.Correct ? (
                <Check />
              ) : answerState === AnswerState.Incorrect ? (
                <X />
              ) : null
            }
            onClick={onSubmit}
            disabled={answerState === AnswerState.Waiting}
          >
            {getButtonText(answerState)}
          </Button>
        </Stack>
      );
    }
  } else if (error) {
    content = (
      <Alert title="Error" color="red">
        {error}
      </Alert>
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
