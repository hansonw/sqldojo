import React from "react";
import ReactMarkdown from "react-markdown";
import { Problem as ProblemModel } from "@prisma/client";
import ResizePanel from "react-resize-panel";
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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Prism } from "@mantine/prism";
import useSWR from "swr";

const Problem: React.FC<{ problem: ProblemModel }> = ({ problem }) => {
  const form = useForm({
    initialValues: {
      query: "SELECT",
    },
  });
  const [queries, setQueries] = React.useState([]);
  function onSubmit(e: any) {
    setQueries(queries.concat([form.values.query]));
    e.preventDefault();
  }
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 3,
        flexFlow: "row nowrap",
        maxHeight: "calc(100vh - 70px)",
      }}
    >
      <div style={{ flexGrow: 2, overflow: "scroll" }}>
        <Title>{problem.name}</Title>
        <Text>
          <ReactMarkdown
            children={problem.description}
            remarkPlugins={[remarkGfm]}
          />
        </Text>
      </div>
      <ResizePanel direction="w">
        <div style={{ flexGrow: 1, minWidth: 300, background: "white" }}>
          <Title order={3}>Query Console</Title>
          {queries.length === 0 ? (
            <Text>Enter a query below to get started</Text>
          ) : (
            <Stack>
              {queries.map((query, i) => (
                <Query key={i} database={problem.dbName} query={query} />
              ))}
            </Stack>
          )}
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
        </div>
      </ResizePanel>
    </div>
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
    <Card shadow="sm" p="sm" style={{ maxWidth: 400 }}>
      <Prism language="sql" noCopy colorScheme="dark">
        {query}
      </Prism>
      {content}
    </Card>
  );
}

export default Problem;
