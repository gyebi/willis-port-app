
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/get-session-user";
import AgentEntryForm from "./AgentEntryForm";


import "./agent-entry.css";


export default async function AgentEntryPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (user.role !== "AGENT") {
    redirect("/");
  }

  return <AgentEntryForm userName={user.displayName ?? user.email} />;
}
