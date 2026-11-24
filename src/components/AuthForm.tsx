"use client";

import Link from "next/link";
import { useState } from "react";
import { SECTORS } from "@/lib/sector-info";

type Mode = "login" | "signup" | "join";

export default function AuthForm({ mode, token, orgName }: { mode: Mode; token?: string; orgName?: string }) {
  const [f, setF] = useState({ name: "", email: "", password: "", orgName: "", sector: "general" });
  const [hasAccount, setHasAccount] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const askName = mode === "signup" || (mode === "join" && !hasAccount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const url = mode === "login" ? "/api/auth/login" : mode === "signup" ? "/api/auth/signup" : "/api/auth/join";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, token }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) window.location.href = "/";
    else {
      setErr(d.error ?? "Erreur");
      setBusy(false);
    }
  };

  const title =
    mode === "login" ? "Connexion" : mode === "signup" ? "Créer votre bureau" : `Rejoindre ${orgName ?? "l'équipe"}`;

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-100 via-sky-50 to-violet-50 p-4 text-gray-900">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">🏢</div>
          <div className="text-xl font-bold">Bureau IA</div>
          <div className="text-sm text-gray-500">Votre équipe d&apos;agents IA, au travail.</div>
        </div>
        <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-lg font-semibold">{title}</h1>
          {mode === "join" && (
            <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
              <button type="button" onClick={() => setHasAccount(false)} className={`flex-1 rounded-md py-1 ${!hasAccount ? "bg-white shadow-sm" : ""}`}>
                Nouveau compte
              </button>
              <button type="button" onClick={() => setHasAccount(true)} className={`flex-1 rounded-md py-1 ${hasAccount ? "bg-white shadow-sm" : ""}`}>
                J&apos;ai déjà un compte
              </button>
            </div>
          )}
          {askName && (
            <Field label="Votre nom" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" />
          )}
          {mode === "signup" && (
            <Field label="Nom de votre entreprise" value={f.orgName} onChange={(v) => setF({ ...f, orgName: v })} autoComplete="organization" />
          )}
          {mode === "signup" && (
            <label className="block text-sm">
              <span className="text-gray-600">Votre métier</span>
              <select
                value={f.sector}
                onChange={(e) => setF({ ...f, sector: e.target.value })}
                className="mt-1 w-full rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-slate-300"
              >
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-gray-400">Active les outils et les conseils adaptés à votre activité.</span>
            </label>
          )}
          <Field label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} autoComplete="email" />
          <Field
            label="Mot de passe"
            type="password"
            value={f.password}
            onChange={(v) => setF({ ...f, password: v })}
            autoComplete={mode === "login" || hasAccount ? "current-password" : "new-password"}
            hint={askName ? "10 caractères minimum" : undefined}
          />
          {err && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-slate-900 py-2.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
            {busy ? "…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon bureau" : "Rejoindre"}
          </button>
          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? (
              <>
                Pas encore de compte ? <Link className="font-medium text-slate-900 underline" href="/inscription">Créer un bureau</Link>
              </>
            ) : mode === "signup" ? (
              <>
                Déjà inscrit ? <Link className="font-medium text-slate-900 underline" href="/login">Se connecter</Link>
              </>
            ) : null}
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-600">{label}</span>
      <input
        required
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-slate-300"
      />
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  );
}
