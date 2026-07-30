"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The Call — full screen, hard-hitting, generated from her real state.
export default function TalkPage() {
  const [talk, setTalk] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/talk", { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTalk(d.talk);
      })
      .catch(() => {
        if (!cancelled) setTalk("Couldn't connect. You still know the one thing. Go do it.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-ink text-paper flex flex-col px-7 py-12 overflow-y-auto">
      {talk === null ? (
        <div className="m-auto text-center">
          <p className="text-4xl mb-4 animate-pulse">☎</p>
          <p className="text-stone-400">calling…</p>
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-stone-500 mb-6">
            the call
          </p>
          <p className="text-2xl font-bold leading-snug whitespace-pre-wrap flex-1">
            {talk}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-8 py-4 rounded-xl bg-paper text-ink font-bold text-lg"
          >
            ok. going.
          </button>
        </>
      )}
    </div>
  );
}
