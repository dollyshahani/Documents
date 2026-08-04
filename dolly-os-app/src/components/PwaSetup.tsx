"use client";

import { useEffect, useState } from "react";

// Registers the service worker, and shows the one-time iOS
// add-to-home-screen banner — without home screen install, push silently
// fails on iPhone, so this banner is load-bearing.
export default function PwaSetup() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem("a2hs_dismissed") === "1";
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos && !standalone && !dismissed) setShowBanner(true);
  }, []);

  if (!showBanner) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-ink text-paper px-5 py-4 text-sm leading-snug">
      <p className="font-bold mb-1">Add this to your home screen first.</p>
      <p>
        Notifications don&apos;t work from Safari. Tap the share button
        {" ↑ "}below, then <strong>&quot;Add to Home Screen&quot;</strong>.
        Open the app from there — once. That&apos;s it forever.
      </p>
      <button
        className="mt-2 underline"
        onClick={() => {
          localStorage.setItem("a2hs_dismissed", "1");
          setShowBanner(false);
        }}
      >
        done / dismiss
      </button>
    </div>
  );
}
