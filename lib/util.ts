import { User } from "@prisma/client";
import { getSession, GetSessionParams } from "next-auth/react";
import prisma from "./prisma";

export function serializePrisma(obj: Object): Object {
  // this is a super hacky workaround to the fact that Dates can't be returned from
  // Next.js server-side properties
  return JSON.parse(JSON.stringify(obj));
}

export async function getUser(context: GetSessionParams): Promise<User | null> {
  const session = await getSession(context);
  const email = session?.user?.email;
  return await (email && prisma.user.findFirst({ where: { email } }));
}
