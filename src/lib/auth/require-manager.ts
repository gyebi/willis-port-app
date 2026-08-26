import { redirect } from "next/navigation";

import { getSessionUser, type SessionAppUser } from "./get-session-user";

export async function requireManagerUser(): Promise<SessionAppUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role === "AGENT") {
    redirect("/agent/entry");
  }

  return user;
}
