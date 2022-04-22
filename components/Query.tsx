import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Popover,
  Progress,
  Stack,
  Sx,
  Table,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
} from "@mantine/core";
import { Prism } from "@mantine/prism";
import React from "react";
import useSWR from "swr";
import { Trash } from "tabler-icons-react";
import { AnswerState, QueryStore } from "../lib/QueryStore";

function SubmitButton({ answerState, error = null, onSubmit }) {
  const buttonStyle: Sx = {
    borderRadius: 4,
    flexGrow: 1,
    height: 36,
    textAlign: "center",
    cursor: "default",
  };
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
          {error ? (
            error
          ) : (
            <>
              <Text weight={500}>Are you sure?</Text>
              <Text>
                Incorrect submissions will add a 5 minute time penalty.
              </Text>
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
            </>
          )}
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
            ...buttonStyle,
            backgroundColor: theme.colors.green[6],
            color: "white",
          })}
        >
          <Text>You got it! 🎉</Text>
        </UnstyledButton>
      );

    case AnswerState.Incorrect:
      return (
        <UnstyledButton
          sx={(theme) => ({
            ...buttonStyle,
            backgroundColor: theme.colors.orange[8],
            color: "white",
          })}
        >
          <Text>Sorry, wrong answer — try again</Text>
        </UnstyledButton>
      );
    case AnswerState.Error:
      return (
        <UnstyledButton
          sx={(theme) => ({
            ...buttonStyle,
            border: `1px solid ${theme.colors.orange[8]}`,
          })}
        >
          <Text>We hit an error validating this :(</Text>
        </UnstyledButton>
      );
  }
}

function Cell({ value }) {
  const theme = useMantineTheme();
  if (value == null) {
    return (
      <code
        style={{
          borderRadius: 4,
          background: theme.colors.gray[1],
          padding: 2,
        }}
      >
        null
      </code>
    );
  }
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(value)
  ) {
    // NOTE: AWS/Vercel use UTC timezones so this is OK
    let date = new Date(value).toLocaleString("en-US", { timeZone: "UTC" });
    let title = "timestamp";
    if (date.includes("12:00:00 AM")) {
      date = date.replace(", 12:00:00 AM", "");
      title = "date";
    }
    return (
      <Tooltip label={title}>
        <span
          style={{
            borderRadius: 4,
            background: theme.colors.blue[1],
            padding: 2,
            whiteSpace: "nowrap",
          }}
        >
          {date}
        </span>
      </Tooltip>
    );
  }
  return value;
}

export function Query({
  query,
  onComplete,
  onDelete,
  onSubmit,
}: {
  query: QueryStore;
  onComplete: () => void;
  onDelete: () => void;
  onSubmit: (result: boolean) => void;
}) {
  const queryStr = query.query;
  const [showResult, setShowResult] = React.useState(!query._hideResult);
  const swr = useSWR(showResult ? `${query.problemId}:${query.id}` : null, () =>
    query.getResults().finally(onComplete)
  );

  const [answerState, setAnswerState] = React.useState<AnswerState | null>(
    null
  );

  async function verify() {
    setAnswerState(AnswerState.Waiting);
    const result = await query.verify();
    setAnswerState(result);
    return result;
  }

  React.useEffect(() => {
    if (query._answerState) {
      // NOTE: this will re-use the cached result
      verify();
    }
  }, []);

  const { data, error } = swr;
  let content = null;
  if (!showResult) {
    content = (
      <Stack>
        <Button variant="outline" onClick={() => setShowResult(true)} fullWidth>
          Show result
        </Button>
        <SubmitButton answerState={answerState} onSubmit={() => {}} />
      </Stack>
    );
  } else if (data == null) {
    content = <Progress value={100} animate mt="xs" />;
  } else if (error != null || data.error != null) {
    content = (
      <Stack>
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
    const { rows, columns, solutionColumns, count } = swr.data;
    if (rows.length === 0 || columns.length === 0) {
      content = (
        <Stack>
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
      const solutionSchema = JSON.stringify(Array.from(solutionColumns).sort());
      const submitDisabled =
        JSON.stringify(Array.from(columns).sort()) !== solutionSchema;
      content = (
        <Stack>
          <div style={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table horizontalSpacing={8} verticalSpacing={2} striped>
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
                    {row.map((val, j) => (
                      <td key={j}>
                        <Cell value={val} />
                      </td>
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
            <SubmitButton
              answerState={answerState}
              error={
                submitDisabled
                  ? `Incorrect schema! Expected these columns: ${solutionSchema}`
                  : null
              }
              onSubmit={() => {
                verify().then((state) => {
                  if (state !== AnswerState.Error) {
                    onSubmit(state === AnswerState.Correct);
                  }
                });
              }}
            />
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
      <Card.Section mb="xs">
        <Prism
          language="sql"
          noCopy
          colorScheme="dark"
          scrollAreaComponent="div"
        >
          {queryStr}
        </Prism>
      </Card.Section>
      {content}
    </Card>
  );
}
