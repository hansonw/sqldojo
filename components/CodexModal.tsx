import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Prism } from "@mantine/prism";
import type { Problem } from "@prisma/client";
import React from "react";

export default function CodexModal({ problem }: { problem: Problem }) {
  const form = useForm({
    initialValues: {
      prompt: problem.codexPrompt ?? "",
    },
  });
  const [loading, setLoading] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState(
    "-- Ask a prompt to get a SQL query suggestion!"
  );

  function onSubmit(e: React.FormEvent) {
    setLoading(true);
    fetch(`/api/problem/${problem.id}/codex`, {
      method: "POST",
      body: form.values.prompt,
    })
      .then((res) => res.json())
      .then((data) => {
        setSuggestion(data.answer || "No suggestion available :(");
      })
      .catch((err) => {
        setSuggestion("Error fetching suggestion: " + String(err));
      })
      .finally(() => setLoading(false));
    e.preventDefault();
  }

  return (
    <Group grow align="baseline" spacing="xl">
      <Box>
        <Text mb="md" size="sm">
          Ask Codex for assistance! Describe what you need your query to do in
          plain English and get a SQL suggestion on the right.
        </Text>
        <Text mb="md" size="sm">
          We've filled in a default prompt for you to tell Codex about the
          expected inputs/outputs/table schemas — you need to tell Codex about
          the tables you want it to use, but you might need to be a bit clever
          about how you ask your question to get a working answer. Good luck!
        </Text>
        <form onSubmit={onSubmit}>
          <Textarea
            {...form.getInputProps("prompt")}
            autosize
            minRows={12}
            maxRows={12}
            styles={{
              input: {
                fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
              },
            }}
          />
          <Group position="right" mt="md">
            <Button type="submit" disabled={loading}>
              Ask Codex
            </Button>
          </Group>
        </form>
      </Box>
      <Box style={{ position: "relative" }}>
        <LoadingOverlay visible={loading} />
        <Title order={3} mb="md">
          Codex Suggestion
        </Title>
        <Prism language={"sql"} colorScheme="dark">
          {suggestion}
        </Prism>
      </Box>
    </Group>
  );
}
