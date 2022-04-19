import { User } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";
import prisma from "./prisma";

export function serializePrisma(obj: Object): Object {
  // this is a super hacky workaround to the fact that Dates can't be returned from
  // Next.js server-side properties
  return JSON.parse(JSON.stringify(obj));
}

export function getUser(
  context: GetServerSidePropsContext
): Promise<User | null> {
  return getSession(context).then((session) => {
    const email = session?.user?.email;
    return email && prisma.user.findFirst({ where: { email } });
  });
}
