"use client";

import { useCallback, useEffect, useState } from "react";

type Med = { id: string; name: string; days: number[] };
type MedsState = {
  date: string;
  weekday: number;
  weekStart: string;
  meds: Med[];
  takes: { med_id: string; date: string }[];
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function dateForWeekday(weekStart: string, weekday: number): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + weekday);
  return d.toISOString().slice(0, 10);
}

export default function MedsPage() {
  const [state, setState] = useState<MedsState | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/meds");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (body: object) => {
    const res = await fetch("/api/meds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setState(await res.json());
  };

  if (!state) return <p className="text-stone-400 pt-24 text-center">…</p>;

  const taken = new Set(state.takes.map((t) => `${t.med_id}:${t.date}`));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Meds</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tick when taken. The schedule is your doctors&apos; job — this just
          tracks the tick.
        </p>
      </header>

      {state.meds.length === 0 && !adding && (
        <p className="text-stone-400">Nothing here yet. Add what you take.</p>
      )}

      {state.meds.map((med) => (
        <div key={med.id} className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-lg">{med.name}</p>
            <button
              onClick={() => {
                if (confirm(`Remove ${med.name}?`)) act({ action: "remove", med_id: med.id });
              }}
              className="text-stone-300 text-sm"
            >
              remove
            </button>
          </div>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, wd) => {
              const scheduled = med.days.includes(wd);
              const date = dateForWeekday(state.weekStart, wd);
              const done = taken.has(`${med.id}:${date}`);
              const isToday = wd === state.weekday;
              const isFuture = date > state.date;
              if (!scheduled) {
                return (
                  <div key={wd} className="flex-1 py-2 text-center text-stone-200 text-sm">
                    {label}
                  </div>
                );
              }
              return (
                <button
                  key={wd}
                  disabled={isFuture}
                  onClick={() => act({ action: "toggle_take", med_id: med.id, date })}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 ${
                    done
                      ? "border-moss bg-mossbg text-moss"
                      : isFuture
                      ? "border-stone-200 text-stone-300"
                      : isToday
                      ? "border-ink text-ink"
                      : "border-stone-300 text-stone-400" /* missed = neutral grey, no guilt */
                  }`}
                >
                  {done ? "✓" : label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-2xl border-2 border-ink bg-white p-4 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="name (e.g. Reta)"
            className="border-b-2 border-stone-200 py-2 text-lg outline-none"
            autoFocus
          />
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, wd) => (
              <button
                key={wd}
                onClick={() =>
                  setDays((d) => (d.includes(wd) ? d.filter((x) => x !== wd) : [...d, wd]))
                }
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 ${
                  days.includes(wd)
                    ? "border-ink bg-ink text-paper"
                    : "border-stone-300 text-stone-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAdding(false);
                setName("");
                setDays([]);
              }}
              className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-500"
            >
              cancel
            </button>
            <button
              disabled={!name.trim() || days.length === 0}
              onClick={async () => {
                await act({ action: "add", name, days });
                setAdding(false);
                setName("");
                setDays([]);
              }}
              className="flex-1 py-3 rounded-xl bg-ink text-paper font-bold disabled:opacity-30"
            >
              add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="py-3 rounded-xl border-2 border-dashed border-stone-300 text-stone-500"
        >
          + add medication
        </button>
      )}
    </div>
  );
}
