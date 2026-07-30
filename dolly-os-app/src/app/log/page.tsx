"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Three lines. The evening log IS tomorrow's planning.
export default function LogPage() {
  const [shipped, setShipped] = useState("");
  const [signal, setSignal] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/log")
      .then((r) => r.json())
      .then((d) => {
        setShipped(d.shipped ?? "");
        setSignal(d.signal ?? "");
        setTomorrow(d.tomorrow ?? "");
      })
      .catch(() => {});
  }, []);

  const submit = async () => {
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shipped, signal, tomorrow, mood }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => router.push("/"), 900);
    }
  };

  if (saved) {
    return (
      <div className="fixed inset-0 bg-mossbg flex items-center justify-center px-8">
        <h1 className="text-2xl font-bold text-moss text-center">
          Logged. Tomorrow&apos;s one thing is set.
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">3 lines. No essays.</h1>
      </header>

      <LogInput label="shipped" value={shipped} onChange={setShipped} placeholder="what went out today" />
      <LogInput label="one signal" value={signal} onChange={setSignal} placeholder="one thing you noticed" />
      <LogInput
        label="tomorrow's ONE thing"
        value={tomorrow}
        onChange={setTomorrow}
        placeholder="this becomes tomorrow's task"
      />

      <div>
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">mood</p>
        <div className="flex gap-2">
          {["low", "ok", "high"].map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? null : m)}
              className={`flex-1 py-3 rounded-xl border-2 font-bold ${
                mood === m ? "border-ink bg-ink text-paper" : "border-stone-300 text-stone-400"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-2">
          low = tomorrow&apos;s brief auto-shrinks to the 2-minute version.
        </p>
      </div>

      <button
        onClick={submit}
        disabled={!shipped.trim() && !signal.trim() && !tomorrow.trim()}
        className="py-4 rounded-xl bg-ink text-paper font-bold text-lg disabled:opacity-30"
      >
        log it
      </button>
    </div>
  );
}

function LogInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-stone-200 focus:border-ink rounded-xl px-4 py-3 text-lg bg-white outline-none"
      />
    </div>
  );
}
