import {
  Box,
  Button,
  Group,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Problem as ProblemModel } from "@prisma/client";
import { highlight, languages } from "prismjs/components/prism-core";
import "prismjs/components/prism-sql";
import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import ResizePanel from "react-resize-panel";
import CodeEditor from "react-simple-code-editor";
import remarkGfm from "remark-gfm";
import useSWR from "swr/immutable";
import { Terminal } from "tabler-icons-react";
import { QueryStore } from "../lib/QueryStore";
import { LeaderboardProblemStatus } from "../lib/types";
import { Query } from "./Query";

const Problem: React.FC<{
  problem: ProblemModel;
  status: LeaderboardProblemStatus | null;
  queryStore: Immutable.Map<string, Immutable.List<QueryStore>>;
  onQuery: (query: string) => void;
  onValidate: (result: boolean) => void;
  onDelete: (id: string) => void;
}> = ({ problem, status, queryStore, onQuery, onValidate, onDelete }) => {
  const theme = useMantineTheme();
  const _ = useSWR(`/api/problem/${problem.id}/open`, (path) =>
    fetch(path, { method: "POST" })
  );
  const queryViewport = useRef<HTMLDivElement>();
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  const scrollToBottom = React.useCallback(() => {
    // After React update..
    setTimeout(() => {
      queryViewport.current.scrollTo(0, queryViewport.current.scrollHeight);
    }, 0);
  }, [queryViewport]);
  const onSubmit = React.useCallback(
    (e: any) => {
      onQuery(form.values.query);
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
            {!queries?.size ? (
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
                    onDelete={() => onDelete(query.id)}
                    onSubmit={onValidate}
                  />
                </div>
              ))
            )}
          </div>
          {status !== "solved" && (
            <Box
              sx={(theme) => ({
                borderTop: `1px solid ${theme.colors.gray[3]}`,
              })}
              p="sm"
            >
              <form onSubmit={onSubmit}>
                <CodeEditor
                  value={form.values.query}
                  onValueChange={(value) => form.setFieldValue("query", value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.metaKey) {
                      onSubmit(e);
                    }
                  }}
                  highlight={(code) => highlight(code, languages.sql)}
                  padding={4}
                  className="code-editor"
                  style={{
                    border: `1px solid ${theme.colors.gray[4]}`,
                    borderRadius: 4,
                  }}
                />
                <Group position="right" mt="md">
                  <Button type="submit">Execute</Button>
                </Group>
              </form>
            </Box>
          )}
        </Box>
      </ResizePanel>
    </div>
  );
};

export default Problem;
