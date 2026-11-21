import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { currentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await currentSession()) redirect("/");
  return <AuthForm mode="signup" />;
}
