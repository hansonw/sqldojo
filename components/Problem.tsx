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
  Popover,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Prism } from "@mantine/prism";
import { Trash, Terminal } from "tabler-icons-react";
import useSWR from "swr/immutable";

enum AnswerState {
  Waiting,
  Correct,
  Incorrect,
}

type QueryResult =
  | { rows: undefined; columns: undefined; count: undefined; error: string }
  | { rows: any[]; columns: string[]; count: number; error: undefined };

class QueryStore {
  id: number;
  query: string;
  database: string;

  _resultCache: Promise<QueryResult> | null;
  _answerState: AnswerState | null;

  constructor(id: number, query: string, database: string) {
    this.id = id;
    this.query = query;
    this.database = database;
  }

  getResults(): Promise<QueryResult> {
    if (this._resultCache != null) {
      return this._resultCache;
    }
    this._resultCache = fetch(`/api/query?database=${this.database}`, {
      body: this.query,
      method: "POST",
    }).then((res) => res.json());
    return this._resultCache;
  }

  async verify(): Promise<AnswerState> {
    return fetch(`/api/verify?database=${this.database}`, {
      body: this.query,
      method: "POST",
    })
      .then((response) => response.json())
      .catch((err) => ({ error: String(err) }))
      .then((data) => {
        if (data.error) {
          console.error(data.error);
        }
        return (this._answerState = data.correct
          ? AnswerState.Correct
          : AnswerState.Incorrect);
      });
  }
}

const _queries = new Map<string, QueryStore[]>();

const Problem: React.FC<{ problem: ProblemModel }> = ({ problem }) => {
  const queryViewport = useRef<HTMLDivElement>();
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  const [nextId, setNextId] = React.useState(1);
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
      _queries
        .get(problem.id)
        .push(new QueryStore(nextId, form.values.query, problem.dbName));
      setNextId((c) => c + 1);
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
                <div
                  style={{ marginBottom: 8, maxWidth: "100%" }}
                  key={query.id}
                >
                  <Query
                    query={query}
                    onComplete={scrollToBottom}
                    onDelete={() => {
                      _queries.get(problem.id).splice(i, 1);
                      setNextId((c) => c + 1);
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

function SubmitButton({ answerState, onSubmit }) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  switch (answerState) {
    case null:
    case undefined:
      return (
        <Popover
          opened={showConfirm}
          onClose={() => setShowConfirm(false)}
          target={
            <Button
              type="submit"
              onClick={() => setShowConfirm(true)}
              style={{ width: "100%" }}
            >
              Submit Answer
            </Button>
          }
          styles={{
            root: { flexGrow: 1 },
          }}
          width={260}
          position="top"
        >
          <Text weight={500}>Are you sure?</Text>
          <Text>Incorrect submissions will add a 5 minute time penalty.</Text>
          <Group mt="sm">
            <Button type="submit" onClick={onSubmit}>
              Submit
            </Button>
            <Button
              type="reset"
              variant="outline"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </Button>
          </Group>
        </Popover>
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

function Query({
  query,
  onComplete,
  onDelete,
}: {
  query: QueryStore;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const queryStr = query.query;
  const swr = useSWR(String(query.id), () =>
    query.getResults().finally(onComplete)
  );

  const [answerState, setAnswerState] = React.useState(query._answerState);

  function onSubmit() {
    if (answerState != null) {
      return;
    }
    setAnswerState(AnswerState.Waiting);
    query.verify().then(setAnswerState);
  }

  const { data, error } = swr;
  let content = null;
  if (data == null) {
    content = <Progress value={100} animate mt="xs" />;
  } else if (error != null || data.error != null) {
    content = (
      <Stack pt="xs">
        <Alert title="Error" color="red">
          {error || data.error}
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
    const { rows, columns, count } = swr.data;
    if (rows.length === 0 || columns.length === 0) {
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
                  {columns.map((key, i) => (
                    <th key={i}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((value, j) => (
                      <td key={j}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {count > rows.length && (
            <Alert title="Truncated result" color="yellow">
              Only showing {rows.length} rows out of {count} total.
            </Alert>
          )}
          <Group>
            <SubmitButton answerState={answerState} onSubmit={onSubmit} />
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
  }

  return (
    <Card shadow="sm" p="sm" m="sm" style={{ maxWidth: "100%" }} withBorder>
      <Prism language="sql" noCopy colorScheme="dark" scrollAreaComponent="div">
        {queryStr}
      </Prism>
      {content}
    </Card>
  );
}

export default Problem;
