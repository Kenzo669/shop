import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const s = await currentSession();
  if (!s) redirect("/login");
  return <Dashboard me={{ name: s.user.name, email: s.user.email, role: s.role }} orgName={s.orgName} />;
}
