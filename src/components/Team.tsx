"use client";

import { useState } from "react";
import { AskButton, postJson, usePoll } from "./shared";

type Employee = { id: number; name: string; role: string | null; weekly_hours: number; notes: string | null };
type Shift = { id: number; employee_id: number; date: string; start: string; end: string; label: string | null };
type Leave = { id: number; employee_id: number; start_date: string; end_date: string; type: string };
type Week = {
  from: string;
  to: string;
  employees: Employee[];
  shifts: Shift[];
  leaves: Leave[];
  hours: Record<number, number>;
  alerts: { employee: string; level: "erreur" | "info"; message: string }[];
};

const addDays = (date: string, n: number) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const dayLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export default function Team({ onAsked }: { onAsked: (taskId: number, agentId: string) => void }) {
  const [week, setWeek] = useState(() => new Date().toISOString().slice(0, 10));
  const [d, reload] = usePoll<Week>(`/api/team?week=${week}`, 5000);
  const [adding, setAdding] = useState<null | "employee" | "leave">(null);
  if (!d) return <p className="text-sm text-gray-500">Chargement…</p>;

  const days = Array.from({ length: 7 }, (_, i) => addDays(d.from, i));
  const act = async (body: unknown) => {
    await postJson("/api/team", body);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setWeek(addDays(d.from, -7))} aria-label="Semaine précédente">
          ←
        </button>
        <div className="font-semibold">
          Semaine du {dayLabel(d.from)} au {dayLabel(d.to)}
        </div>
        <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setWeek(addDays(d.from, 7))} aria-label="Semaine suivante">
          →
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setAdding(adding === "employee" ? null : "employee")}>
            + Employé
          </button>
          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
            disabled={!d.employees.length}
            onClick={() => setAdding(adding === "leave" ? null : "leave")}
          >
            + Absence
          </button>
          {d.employees.length > 0 && (
            <>
              <AskButton
                agentId="rh"
                label="✨ Inès fait le planning"
                instruction={`Fais le planning de la semaine du ${d.from} (replace_week) en respectant les contrats, les absences et les contraintes notées sur les fiches des employés. Corrige toutes les alertes.`}
                onAsked={onAsked}
              />
              {d.shifts.length > 0 && (
                <AskButton
                  agentId="rh"
                  label="Préparer l'envoi aux employés"
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  instruction={`Prépare en brouillon un mail par employé avec son planning de la semaine du ${d.from} (jours, horaires, total d'heures). Pour les employés sans adresse email, laisse le destinataire vide.`}
                  onAsked={onAsked}
                />
              )}
            </>
          )}
        </div>
      </div>

      {adding === "employee" && <EmployeeForm onDone={() => { setAdding(null); reload(); }} />}
      {adding === "leave" && <LeaveForm employees={d.employees} onDone={() => { setAdding(null); reload(); }} />}

      {d.employees.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">
          Ajoutez vos employés (nom, poste, heures du contrat, disponibilités), puis laissez Inès construire le planning.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[860px] table-fixed text-sm">
            <thead className="bg-slate-50 text-xs text-gray-500">
              <tr>
                <th className="w-44 p-2 text-left">Employé</th>
                {days.map((day) => (
                  <th key={day} className="p-2 text-left capitalize">
                    {dayLabel(day)}
                  </th>
                ))}
                <th className="w-24 p-2 text-right">Heures</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.employees.map((e) => {
                const h = d.hours[e.id] ?? 0;
                return (
                  <tr key={e.id} className="align-top">
                    <td className="p-2">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-gray-500">{e.role ?? "—"}</div>
                      {e.notes && <div className="mt-0.5 text-[11px] italic text-gray-400">{e.notes}</div>}
                    </td>
                    {days.map((day) => {
                      const leave = d.leaves.find((l) => l.employee_id === e.id && l.start_date <= day && l.end_date >= day);
                      const shifts = d.shifts.filter((s) => s.employee_id === e.id && s.date === day);
                      return (
                        <td key={day} className={`p-1 ${leave ? "bg-[repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9_6px,#fff_6px,#fff_12px)]" : ""}`}>
                          {leave && <div className="mb-1 text-[11px] text-gray-500">🌴 {leave.type}</div>}
                          {shifts.map((s) => (
                            <button
                              key={s.id}
                              title="Cliquer pour supprimer ce créneau"
                              onClick={() => confirm(`Supprimer le créneau ${s.start}-${s.end} ?`) && act({ action: "delete_shift", id: s.id })}
                              className="mb-1 block w-full rounded bg-teal-100 px-1.5 py-1 text-left text-xs text-teal-900 hover:bg-red-100"
                            >
                              {s.start}–{s.end}
                              {s.label && <span className="block text-[10px] text-teal-700">{s.label}</span>}
                            </button>
                          ))}
                          <QuickShift employeeId={e.id} date={day} onAdd={act} />
                        </td>
                      );
                    })}
                    <td className={`p-2 text-right ${h > 48 ? "font-semibold text-red-600" : h > e.weekly_hours ? "text-amber-700" : ""}`}>
                      {h} h<div className="text-xs text-gray-400">/ {e.weekly_hours} h</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {d.alerts.length > 0 && (
        <ul className="space-y-1 text-sm">
          {d.alerts.map((a, i) => (
            <li key={i} className={a.level === "erreur" ? "text-red-700" : "text-amber-700"}>
              {a.level === "erreur" ? "⚠️" : "ℹ️"} <strong>{a.employee}</strong> : {a.message}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-500">
        Contrôles automatiques (cas général du Code du travail) : 10 h max par jour, 48 h max par semaine, 11 h de repos entre
        deux journées, un jour de repos par semaine. Votre convention collective peut prévoir d&apos;autres règles.
      </p>
    </div>
  );
}

function QuickShift({ employeeId, date, onAdd }: { employeeId: number; date: string; onAdd: (b: unknown) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded border border-dashed px-1 py-0.5 text-xs text-gray-400 hover:bg-gray-50">
        +
      </button>
    );
  return (
    <div className="space-y-1 rounded border bg-white p-1">
      <input type="time" className="w-full rounded border text-xs" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Début" />
      <input type="time" className="w-full rounded border text-xs" value={end} onChange={(e) => setEnd(e.target.value)} aria-label="Fin" />
      <div className="flex gap-1">
        <button
          className="flex-1 rounded bg-teal-600 px-1 text-xs text-white"
          onClick={async () => {
            await onAdd({ action: "add_shift", employee_id: employeeId, date, start, end });
            setOpen(false);
          }}
        >
          OK
        </button>
        <button className="rounded px-1 text-xs text-gray-500" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
    </div>
  );
}

function EmployeeForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: "", role: "", email: "", weekly_hours: 35, notes: "" });
  return (
    <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_90px]">
      <input className="rounded border p-2" placeholder="Nom *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className="rounded border p-2" placeholder="Poste" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
      <input className="rounded border p-2" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input
        className="rounded border p-2"
        type="number"
        value={f.weekly_hours}
        onChange={(e) => setF({ ...f, weekly_hours: Number(e.target.value) })}
        aria-label="Heures par semaine"
        title="Heures du contrat par semaine"
      />
      <input
        className="rounded border p-2 sm:col-span-3"
        placeholder="Disponibilités, contraintes (ex. pas le mercredi, uniquement le matin)"
        value={f.notes}
        onChange={(e) => setF({ ...f, notes: e.target.value })}
      />
      <button
        className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white"
        onClick={async () => {
          if (!f.name.trim()) return;
          await postJson("/api/team", { action: "add_employee", ...f });
          onDone();
        }}
      >
        Ajouter
      </button>
    </div>
  );
}

function LeaveForm({ employees, onDone }: { employees: Employee[]; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ employee_id: employees[0]?.id ?? 0, start_date: today, end_date: today, type: "congés" });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
      <select className="rounded border p-2" value={f.employee_id} onChange={(e) => setF({ ...f, employee_id: Number(e.target.value) })}>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <select className="rounded border p-2" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        {["congés", "maladie", "formation", "autre"].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      du <input type="date" className="rounded border p-2" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
      au <input type="date" className="rounded border p-2" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} />
      <button
        className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white"
        onClick={async () => {
          await postJson("/api/team", { action: "add_leave", ...f });
          onDone();
        }}
      >
        Enregistrer
      </button>
    </div>
  );
}
