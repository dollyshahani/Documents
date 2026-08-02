"use client";

import { useEffect, useState } from "react";

type Settings = {
  morning_time: string;
  night_time: string;
  timezone: string;
  in_bangalore: boolean;
  morning_stack: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pushStatus, setPushStatus] = useState<string>("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const enablePush = async () => {
    try {
      setPushStatus("asking…");
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("permission denied. iPhone: add to home screen first.");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setPushStatus("VAPID key not configured.");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setPushStatus(res.ok ? "notifications on ✓" : "failed to save subscription.");
    } catch {
      setPushStatus("failed. iPhone: this only works from the home-screen app.");
    }
  };

  if (!settings) return <p className="text-stone-400 pt-24 text-center">…</p>;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      <button
        onClick={enablePush}
        className="py-4 rounded-xl bg-ink text-paper font-bold"
      >
        enable notifications
      </button>
      {pushStatus && <p className="text-sm text-stone-500 -mt-3">{pushStatus}</p>}

      <label className="flex items-center justify-between rounded-2xl border-2 border-stone-200 bg-white p-4">
        <div>
          <p className="font-bold">I&apos;m in Bangalore</p>
          <p className="text-sm text-stone-400">
            morning prompt becomes &quot;gym&quot; instead of &quot;10-min anything&quot;
          </p>
        </div>
        <input
          type="checkbox"
          checked={settings.in_bangalore}
          onChange={(e) => save({ in_bangalore: e.target.checked })}
          className="w-6 h-6 accent-black"
        />
      </label>

      <TimeField
        label="morning ping"
        value={settings.morning_time}
        onChange={(v) => save({ morning_time: v })}
      />
      <TimeField
        label="night ping"
        value={settings.night_time}
        onChange={(v) => save({ night_time: v })}
      />
      <p className="text-xs text-stone-400 -mt-3">
        These control the actual send times (checked every ~10 min by the tick
        cron). Phone-out fires 30 min after the night ping. To test: set the
        morning ping a few minutes ahead, lock your phone, wait.
      </p>

      <div>
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
          morning stack
        </p>
        <input
          value={settings.morning_stack}
          onChange={(e) => save({ morning_stack: e.target.value })}
          placeholder="e.g. B12, juice, funmax"
          className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white"
        />
        <p className="text-xs text-stone-400 mt-2">
          Rides inside the morning push. One notification carries the whole
          stack — more pings would just become noise you swipe away.
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">timezone</p>
        <input
          value={settings.timezone}
          onChange={(e) => save({ timezone: e.target.value })}
          className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white"
        />
      </div>
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">{label}</p>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-stone-200 rounded-xl px-4 py-3 bg-white"
      />
    </div>
  );
}
