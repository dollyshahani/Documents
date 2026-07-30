"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TodayState } from "@/lib/types";

export default function TodayPage() {
  const [state, setState] = useState<TodayState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/today");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string) => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/today", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) setState(await res.json());
    setBusy(false);
  };

  if (!state) {
    return <p className="text-stone-400 pt-24 text-center">…</p>;
  }

  // Rule 4: floor done => the whole screen is the COMPLETE state. Nothing else.
  if (state.complete) {
    return (
      <div className="fixed inset-0 bg-mossbg flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-6xl mb-6">●</p>
          <h1 className="text-3xl font-bold text-moss">
            That&apos;s a complete day.
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">{state.displayDate}</h1>
        <p className="text-stone-500 mt-1">Day {state.streakDay} of streak ·</p>
      </header>

      {/* THE ONE THING — rule 1: one task, huge type, tap = done */}
      <button
        onClick={() => act("done_one_thing")}
        className={`text-left rounded-2xl p-6 border-2 transition-colors ${
          state.oneThingDone
            ? "border-moss bg-mossbg"
            : "border-ink bg-white active:bg-stone-100"
        }`}
      >
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
          The one thing
        </p>
        <p className="text-2xl font-bold leading-snug">
          {state.oneThing ? state.oneThing.title : "Rest. Nothing is queued."}
        </p>
        {state.oneThingDone && <p className="mt-3 text-moss font-bold">done.</p>}
      </button>

      {/* the floor */}
      <div className="flex gap-3">
        <FloorBox
          label="posted"
          checked={state.postDone}
          onClick={() => act("toggle_post")}
        />
        <FloorBox
          label="logged"
          checked={state.logDone}
          onClick={() => act("toggle_log")}
        />
      </div>
      <p className="text-sm text-stone-400 -mt-4">
        These two = a complete day. Everything above is bonus.
      </p>

      {/* the call — on-demand hard-hitting motivation */}
      <Link
        href="/talk"
        className="py-4 rounded-xl bg-ink text-paper font-bold text-center text-lg"
      >
        ☎ the call
      </Link>

      <div className="flex gap-3 mt-auto">
        {!state.twoMin && (
          <button
            onClick={() => act("bad_day")}
            className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-500 active:bg-stone-100"
          >
            bad day
          </button>
        )}
        <button
          onClick={() => act("swap")}
          className="flex-1 py-3 rounded-xl border border-stone-300 text-stone-500 active:bg-stone-100"
        >
          swap
        </button>
      </div>
    </div>
  );
}

function FloorBox({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 rounded-xl border-2 font-bold ${
        checked
          ? "border-moss bg-mossbg text-moss"
          : "border-stone-300 text-stone-500 active:bg-stone-100"
      }`}
    >
      {checked ? "✓ " : ""}
      {label}
    </button>
  );
}
