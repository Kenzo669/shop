"use client";

import { Component, type ReactNode } from "react";
import { AGENTS } from "@/lib/agents";

/** Si la 3D ne peut pas s'afficher (carte graphique absente ou bloquée), on montre l'équipe en 2D au lieu de planter. */
export class OfficeBoundary extends Component<
  { children: ReactNode; working: string[]; selected: string; onSelect: (id: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const { working, selected, onSelect } = this.props;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-slate-500">
          Le bureau en 3D ne peut pas s&apos;afficher sur cet ordinateur (accélération graphique indisponible). Vos agents
          travaillent normalement :
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={`flex w-32 flex-col items-center gap-1 rounded-xl border p-3 text-sm transition hover:shadow ${
                selected === a.id ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full font-bold text-white" style={{ background: a.color }}>
                {a.name[0]}
              </span>
              <span className="font-semibold">{a.name}</span>
              <span className={`text-xs ${working.includes(a.id) ? "text-amber-600" : "text-slate-400"}`}>
                {working.includes(a.id) ? "au travail" : "disponible"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
}
