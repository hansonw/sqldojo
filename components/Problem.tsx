import { Box, Button, Group, Text, Textarea, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { Problem as ProblemModel } from "@prisma/client";
import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import ResizePanel from "react-resize-panel";
import remarkGfm from "remark-gfm";
import useSWR from "swr/immutable";
import { Terminal } from "tabler-icons-react";
import { QueryStore } from "../lib/QueryStore";
import { Query } from "./Query";

const Problem: React.FC<{
  problem: ProblemModel;
  queryStore: Map<string, QueryStore[]>;
  onValidate: (result: boolean) => void;
}> = ({ problem, queryStore, onValidate }) => {
  const _ = useSWR(`/api/problem/${problem.id}/open`, (path) =>
    fetch(path, { method: "POST" })
  );
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
      if (!queryStore.has(problem.id)) {
        queryStore.set(problem.id, []);
      }
      queryStore
        .get(problem.id)
        .push(new QueryStore(String(nextId), form.values.query, problem.id));
      setNextId((c) => c + 1);
      scrollToBottom();
      e.preventDefault();
    },
    [form, scrollToBottom]
  );
  const queries = queryStore.get(problem.id);
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 2,
        flexFlow: "row nowrap",
        height: "calc(100vh - var(--mantine-header-height))",
      }}
    >
      <div style={{ flexGrow: 1, overflow: "auto", padding: 12 }}>
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
            <Title order={4}>
              <Terminal style={{ verticalAlign: "middle", marginRight: 8 }} />
              Query Console
            </Title>
          </Box>
          <div style={{ flexGrow: 1, overflowY: "auto" }} ref={queryViewport}>
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
                      queryStore.get(problem.id).splice(i, 1);
                      setNextId((c) => c + 1);
                    }}
                    onSubmit={onValidate}
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

export default Problem;
