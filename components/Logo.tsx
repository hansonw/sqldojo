import { Text, UnstyledButton } from "@mantine/core";
import Router from "next/router";

export function Logo() {
  return (
    <UnstyledButton onClick={() => Router.push("/")} mr="lg">
      <Text
        component="span"
        align="center"
        variant="gradient"
        gradient={{ from: "indigo", to: "cyan", deg: 45 }}
        size="xl"
        weight={700}
      >
        SQL Dojo
      </Text>
    </UnstyledButton>
  );
}
