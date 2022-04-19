import { Avatar, Group, Menu, UnstyledButton } from "@mantine/core";
import { signOut, useSession } from "next-auth/react";
import React from "react";
import { Logout } from "tabler-icons-react";

export default function HeaderAuth() {
  const { data: session } = useSession();
  if (!session) {
    return null;
  }
  return (
    <Menu
      control={
        <UnstyledButton>
          <Group spacing="xs">
            {session.user.name}
            <Avatar src={session.user.image} radius="xl">
              {session.user.name}
            </Avatar>
          </Group>
        </UnstyledButton>
      }
    >
      <Menu.Label>Signed in as {session.user.email}</Menu.Label>
      <Menu.Item
        icon={<Logout />}
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Log out
      </Menu.Item>
    </Menu>
  );
}
