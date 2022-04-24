import { closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { PostgreSQL, sql } from "@codemirror/lang-sql";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  indentService,
  syntaxHighlighting,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
} from "@codemirror/view";
import {
  Box,
  Button,
  Group,
  Modal,
  Text,
  Title,
  useMantineTheme,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useColorScheme } from "@mantine/hooks";
import { Problem as ProblemModel } from "@prisma/client";
import CodeMirror from "@uiw/react-codemirror";
import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import ResizePanel from "react-resize-panel";
import remarkGfm from "remark-gfm";
import useSWR from "swr/immutable";
import { Terminal } from "tabler-icons-react";
import { QueryStore } from "../lib/QueryStore";
import { LeaderboardProblemStatus } from "../lib/types";
import CodexModal from "./CodexModal";
import { Query } from "./Query";

const Problem: React.FC<{
  problem: ProblemModel;
  status: LeaderboardProblemStatus | null;
  queryStore: Immutable.Map<string, Immutable.List<QueryStore>>;
  onQuery: (query: string) => void;
  onValidate: (result: boolean) => void;
  onDelete: (id: string) => void;
}> = ({ problem, status, queryStore, onQuery, onValidate, onDelete }) => {
  const _ = useSWR(`/api/problem/${problem.id}/open`, (path) =>
    fetch(path, { method: "POST" })
  );
  const queryViewport = useRef<HTMLDivElement>();
  function scrollToBottom() {
    // After React update..
    setTimeout(() => {
      queryViewport.current?.scrollTo(0, queryViewport.current.scrollHeight);
    }, 0);
  }
  function onSubmit(query: string) {
    onQuery(query);
    scrollToBottom();
  }
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
            <QueryEditor onSubmit={onSubmit} problem={problem} />
          )}
        </Box>
      </ResizePanel>
    </div>
  );
};

function QueryEditor({ onSubmit, problem }) {
  const theme = useMantineTheme();
  const preferredColorScheme = useColorScheme();
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  const [showCodex, setShowCodex] = React.useState(false);
  function onFormSubmit(e: any) {
    onSubmit(form.values.query);
    e.preventDefault();
  }
  return (
    <Box
      sx={(theme) => ({
        borderTop: `1px solid ${theme.colors.gray[3]}`,
      })}
      p="sm"
    >
      <form onSubmit={onFormSubmit}>
        <CodeMirror
          value={form.values.query}
          onChange={(value) => form.setFieldValue("query", value)}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" && e.metaKey) {
              onFormSubmit(e);
            }
          }}
          extensions={[
            sql({ dialect: PostgreSQL }),
            history(),
            drawSelection(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            bracketMatching(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            indentService.of((context, pos) => {
              if (!pos) return 0;
              // dumbest auto-indent: continue previous line's indent
              return context.lineIndent(pos - 1);
            }),
            keymap.of([
              ...closeBracketsKeymap,
              ...defaultKeymap.filter((x) => x.key !== "Mod-Enter"),
              ...searchKeymap,
              ...historyKeymap,
            ]),
            EditorView.theme({
              "&": {
                padding: "4px",
                borderRadius: "4px",
              },
              ".cm-content": {
                fontFamily:
                  "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace",
              },
            }),
          ]}
          maxHeight="200px"
          basicSetup={false}
          theme={preferredColorScheme}
          style={{
            fontSize: 14,
          }}
        />
        <Group position="apart" mt="md">
          <Button variant="light" onClick={() => setShowCodex(true)}>
            Ask OpenAI Codex
          </Button>
          <Button type="submit">Execute</Button>
        </Group>
      </form>
      <Modal
        opened={showCodex}
        onClose={() => setShowCodex(false)}
        title={<Title order={3}>Ask OpenAI Codex</Title>}
        size="full"
      >
        <CodexModal problem={problem} />
      </Modal>
    </Box>
  );
}

export default Problem;
