"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pass, setPass] = useState("");
  const [wrong, setWrong] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase: pass }),
    });
    if (res.ok) router.push("/");
    else setWrong(true);
  };

  return (
    <form onSubmit={submit} className="pt-24 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dolly OS</h1>
      <input
        type="password"
        value={pass}
        onChange={(e) => {
          setPass(e.target.value);
          setWrong(false);
        }}
        placeholder="passphrase"
        className="border-2 border-ink rounded-xl px-4 py-3 text-lg bg-white"
        autoFocus
      />
      {wrong && <p className="text-stone-500">nope.</p>}
      <button className="bg-ink text-paper rounded-xl py-3 font-bold">
        in
      </button>
    </form>
  );
}
