"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export const usd = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 })} $`;

export function usePoll<T>(url: string, ms: number): [T | null, () => void] {
  const [data, setData] = useState<T | null>(null);
  const load = useCallback(() => {
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, [url]);
  useEffect(() => {
    load();
    const t = setInterval(load, ms);
    return () => clearInterval(t);
  }, [load, ms]);
  return [data, load];
}

/** Confie directement une tâche à un agent. Renvoie l'id de la tâche, ou lève l'erreur du serveur. */
export async function askAgent(agentId: string, instruction: string): Promise<number> {
  const r = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, instruction }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Erreur");
  return d.id as number;
}

export async function postJson(url: string, body: unknown, method = "POST") {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? "Erreur");
  return d;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "warn" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-700" : "";
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${wide ? "max-w-3xl" : "max-w-xl"} overflow-y-auto rounded-xl bg-white p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700" aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AskButton({
  agentId,
  instruction,
  label,
  onAsked,
  className,
}: {
  agentId: string;
  instruction: string;
  label: string;
  onAsked: (taskId: number, agentId: string) => void;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            onAsked(await askAgent(agentId, instruction), agentId);
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e));
          }
          setBusy(false);
        }}
        className={
          className ??
          "rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        }
      >
        {busy ? "…" : label}
      </button>
      {err && <span className="mt-1 text-xs text-red-600">{err}</span>}
    </span>
  );
}
