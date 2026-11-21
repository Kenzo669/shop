import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { readInvite } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = readInvite(token);
  if (!inv) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4 text-center">
        <div>
          <p className="text-lg font-semibold">Invitation invalide ou expirée</p>
          <p className="text-sm text-gray-500">Demandez un nouveau lien à la personne qui vous a invité.</p>
          <Link href="/login" className="mt-3 inline-block text-sm underline">
            Se connecter
          </Link>
        </div>
      </main>
    );
  }
  return <AuthForm mode="join" token={token} orgName={inv.org_name} />;
}
