"use client";

import { useEffect, useRef, useState } from "react";
import { SECTOR_BY_ID, type SectorId } from "@/lib/sector-info";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[]; error?: boolean };

/** Rendu Markdown minimal et sûr (pas de HTML injecté) : gras, listes, titres courts, liens. */
function Rich({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    out.push(
      <Tag key={out.length} className={`my-1.5 space-y-0.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) out.push(<p key={out.length} className="mt-2 font-semibold">{inline(h[1])}</p>);
    else if (line.trim() === "") out.push(<div key={out.length} className="h-2" />);
    else out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="text-sm leading-relaxed">{out}</div>;
}

function inline(s: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else
      parts.push(
        <a key={m.index} href={m[3]} target="_blank" rel="noreferrer noopener" className="underline decoration-slate-300 underline-offset-2">
          {m[2]}
        </a>,
      );
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts;
}

export default function Assistant({ sector }: { sector: SectorId }) {
  const info = SECTOR_BY_ID[sector] ?? SECTOR_BY_ID.general;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conv, setConv] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [cost, setCost] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        if (d.conversationId) setConv(d.conversationId);
        setMsgs((d.messages ?? []).map((m: Msg) => ({ role: m.role, content: m.content })));
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    setCost(null);
    setMsgs((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "", tools: [] }]);
    const patchLast = (f: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), f(all[all.length - 1])]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, conversationId: conv }),
      });
      if (!r.ok || !r.body) {
        const d = await r.json().catch(() => ({}));
        patchLast((m) => ({ ...m, content: d.error ?? "Erreur", error: true }));
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.replace(/^data: /, "");
          if (!line) continue;
          const e = JSON.parse(line);
          if (e.type === "text") patchLast((m) => ({ ...m, content: m.content + e.delta }));
          else if (e.type === "tool") patchLast((m) => ({ ...m, tools: [...(m.tools ?? []), e.label] }));
          else if (e.type === "error") patchLast((m) => ({ ...m, content: (m.content ? m.content + "\n\n" : "") + e.message, error: !m.content }));
          else if (e.type === "done") {
            setConv(e.conversationId);
            setCost(e.cost);
          }
        }
      }
    } catch {
      patchLast((m) => ({ ...m, content: m.content || "Connexion interrompue.", error: !m.content }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 py-3 pl-3 pr-5 text-sm font-semibold text-white shadow-xl shadow-fuchsia-500/30 transition hover:scale-[1.03]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-base">✦</span>
          Assistant
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-40px))] sm:w-[420px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-black/10">
          <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-amber-500 px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-lg">{info.emoji}</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-semibold">{info.assistant.title}</div>
              <div className="truncate text-xs text-white/80">Connaît vos chiffres · cherche sur le web · agit avec votre accord</div>
            </div>
            <button
              title="Nouvelle conversation"
              onClick={() => {
                setConv(null);
                setMsgs([]);
                setCost(null);
              }}
              className="rounded-lg px-2 py-1 text-sm hover:bg-white/15"
            >
              ＋
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm hover:bg-white/15" aria-label="Fermer">
              ✕
            </button>
          </div>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {msgs.length === 0 && (
              <div>
                <p className="text-sm text-slate-600">{info.assistant.desc}</p>
                <div className="mt-3 space-y-2">
                  {info.assistant.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-700 shadow-sm transition hover:border-fuchsia-300 hover:shadow"
                    >
                      ✨ {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-10 rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-sm text-white">
                  {m.content}
                </div>
              ) : (
                <div key={i} className="mr-6">
                  {(m.tools ?? []).length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {[...new Set(m.tools)].map((t) => (
                        <span key={t} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm ring-1 ${
                      m.error ? "bg-red-50 text-red-700 ring-red-100" : "bg-white text-slate-800 ring-slate-200"
                    }`}
                  >
                    {m.content ? (
                      <Rich text={m.content} />
                    ) : (
                      <span className="inline-flex gap-1 py-1">
                        {[0, 1, 2].map((d) => (
                          <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 0.15}s` }} />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
            {cost !== null && !busy && (
              <div className="text-center text-[10px] text-slate-400">Coût de cette réponse : {cost.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} $</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-slate-100 bg-white p-3 sm:rounded-b-2xl"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Posez votre question…"
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fuchsia-200"
            />
            <button
              disabled={busy || !input.trim()}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "…" : "Envoyer"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
