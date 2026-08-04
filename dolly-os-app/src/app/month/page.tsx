"use client";

import { useEffect, useState } from "react";
import { Goal } from "@/lib/types";

type MonthDay = {
  date: string;
  state: "complete" | "missed" | "future";
  log: { shipped: string; signal: string; tomorrow: string } | null;
};
type Star = { id: string; title: string; translation: string; target_date: string | null };
type MonthState = {
  today: string;
  days: MonthDay[];
  goals: Goal[];
  streak: number;
  stars: Star[];
};

export default function MonthPage() {
  const [state, setState] = useState<MonthState | null>(null);
  const [selected, setSelected] = useState<MonthDay | null>(null);

  useEffect(() => {
    fetch("/api/month")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
  }, []);

  if (!state) return <p className="text-stone-400 pt-24 text-center">…</p>;

  const doneCount = state.goals.filter((g) => g.status === "done").length;
  const totalCount = state.goals.filter((g) => g.status !== "killed").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Month</h1>
      </header>

      {/* North-star strip — the WHY. Not draggable, not checkable. */}
      <div className="rounded-2xl bg-ink text-paper p-4 flex flex-col gap-2">
        {state.stars.map((s) => {
          const daysLeft = s.target_date
            ? Math.max(
                0,
                Math.round(
                  (new Date(s.target_date).getTime() - new Date(state.today).getTime()) /
                    86400000
                )
              )
            : null;
          return (
            <div key={s.id} className="flex items-baseline justify-between gap-3">
              <p className="font-bold">
                {s.title}
                <span className="text-stone-400 font-normal"> → {s.translation}</span>
              </p>
              {daysLeft !== null && (
                <span className="text-sm text-amber-300 shrink-0">{daysLeft}d</span>
              )}
            </div>
          );
        })}
      </div>

      {/* progress line — current streak only, never the broken one */}
      <div className="flex gap-6 text-sm text-stone-500">
        <span>
          streak <strong className="text-ink">{state.streak}</strong>
        </span>
        <span>
          goals <strong className="text-ink">{doneCount}</strong>/{totalCount}
        </span>
      </div>

      {/* the grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {state.days.map((d) => (
          <button
            key={d.date}
            onClick={() => setSelected(selected?.date === d.date ? null : d)}
            className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center border-2 ${
              d.state === "complete"
                ? "bg-mossbg border-moss text-moss"
                : d.state === "missed"
                ? "bg-stone-100 border-stone-200 text-stone-400" /* neutral grey, no guilt */
                : "bg-white border-stone-200 text-stone-300"
            } ${d.date === state.today ? "ring-2 ring-ink ring-offset-1" : ""}`}
          >
            {Number(d.date.slice(8, 10))}
          </button>
        ))}
      </div>

      {selected && (
        <div className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
            {selected.date}
          </p>
          {selected.log ? (
            <div className="flex flex-col gap-1 text-sm">
              <p><strong>shipped:</strong> {selected.log.shipped || "—"}</p>
              <p><strong>signal:</strong> {selected.log.signal || "—"}</p>
              <p><strong>tomorrow:</strong> {selected.log.tomorrow || "—"}</p>
            </div>
          ) : (
            <p className="text-stone-400 text-sm">no log this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
