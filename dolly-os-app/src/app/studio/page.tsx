"use client";

import { useCallback, useEffect, useState } from "react";
import type { Reel } from "@/lib/reels";

const LABEL: Record<string, string> = {
  scripted: "writing done · rendering soon",
  rendering: "rendering…",
  regenerate: "redoing…",
  review: "needs you",
  approved: "scheduled",
  publishing: "posting…",
  posted: "live",
  failed: "failed",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

// The reel studio: watch, tweak the caption, approve. Nothing posts without a tap here.
export default function StudioPage() {
  const [reels, setReels] = useState<Reel[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/reels")
      .then((r) => r.json())
      .then((d) => setReels(d.reels))
      .catch(() => setReels([]));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    await fetch("/api/reels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setBusy(false);
    load();
  };

  const review = (reels ?? []).filter((r) => r.status === "review");
  const rest = (reels ?? []).filter((r) => r.status !== "review");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reels</h1>
          <p className="text-sm text-stone-400">Claude writes. You tap. It posts.</p>
        </div>
        <button
          disabled={busy}
          onClick={() => act({ action: "new" })}
          className="px-4 py-2 rounded-xl bg-ink text-paper text-sm font-bold disabled:opacity-40"
        >
          {busy ? "…" : "+ new reel"}
        </button>
      </header>

      {reels === null && <p className="text-stone-400">loading…</p>}
      {reels?.length === 0 && (
        <p className="text-stone-400">Nothing yet. Tap “new reel” or wait for tomorrow’s script.</p>
      )}

      {review.map((r) => (
        <ReviewCard key={r.id} reel={r} busy={busy} act={act} />
      ))}

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-widest text-stone-400">pipeline</h2>
          {rest.map((r) => (
            <div key={r.id} className="rounded-xl border border-stone-200 p-4 flex flex-col gap-1">
              <div className="flex justify-between text-xs text-stone-400">
                <span>{r.pillar}</span>
                <span className={r.status === "failed" ? "text-red-600" : ""}>
                  {LABEL[r.status] ?? r.status}
                  {r.status === "approved" && r.scheduled_at ? ` · ${when(r.scheduled_at)}` : ""}
                </span>
              </div>
              <p className="font-bold">{r.hook}</p>
              {r.error && <p className="text-xs text-red-600">{r.error}</p>}
              {r.status === "approved" && (
                <div className="flex gap-4 text-sm mt-1">
                  <button onClick={() => act({ action: "now", id: r.id })} className="underline">
                    post now
                  </button>
                  <button onClick={() => act({ action: "unschedule", id: r.id })} className="text-stone-400">
                    unschedule
                  </button>
                </div>
              )}
              {r.status === "failed" && (
                <button
                  onClick={() => act({ action: "redo", id: r.id, feedback: "" })}
                  className="text-sm underline self-start"
                >
                  try again
                </button>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ReviewCard({
  reel,
  busy,
  act,
}: {
  reel: Reel;
  busy: boolean;
  act: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [caption, setCaption] = useState(reel.caption);
  const [feedback, setFeedback] = useState("");
  const [redo, setRedo] = useState(false);

  return (
    <section className="rounded-2xl border-2 border-ink p-4 flex flex-col gap-3">
      <p className="text-xs uppercase tracking-widest text-stone-400">needs you · {reel.pillar}</p>
      {reel.video_url && (
        <video
          src={reel.video_url}
          controls
          playsInline
          className="w-full max-h-[70vh] rounded-xl bg-ink aspect-[9/16] object-contain"
        />
      )}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={5}
        className="w-full rounded-xl border border-stone-200 p-3 text-sm bg-white"
      />
      {redo ? (
        <div className="flex flex-col gap-2">
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="what should change? (hook, topic, tone…)"
            className="w-full rounded-xl border border-stone-200 p-3 text-sm bg-white"
          />
          <button
            disabled={busy}
            onClick={() => act({ action: "redo", id: reel.id, feedback })}
            className="py-3 rounded-xl bg-ink text-paper font-bold disabled:opacity-40"
          >
            redo it
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <button
            disabled={busy}
            onClick={() => act({ action: "approve", id: reel.id, caption })}
            className="col-span-3 py-3 rounded-xl bg-moss text-white font-bold disabled:opacity-40"
          >
            approve · next slot
          </button>
          <button
            disabled={busy}
            onClick={() => act({ action: "now", id: reel.id, caption })}
            className="py-2 rounded-xl border border-stone-300 text-sm"
          >
            post now
          </button>
          <button onClick={() => setRedo(true)} className="py-2 rounded-xl border border-stone-300 text-sm">
            redo
          </button>
          <button
            disabled={busy}
            onClick={() => act({ action: "reject", id: reel.id })}
            className="py-2 rounded-xl border border-stone-300 text-sm text-stone-400"
          >
            kill
          </button>
        </div>
      )}
    </section>
  );
}
