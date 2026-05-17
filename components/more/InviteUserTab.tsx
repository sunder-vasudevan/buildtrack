"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { UserPlus, CheckCircle } from "lucide-react";

const ADMIN_EMAIL = "sunder.v@outlook.com";

export function InviteUserTab() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== ADMIN_EMAIL) {
      setError("You don't have permission to invite users.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, inviterEmail: user.email }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to send invite.");
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <CheckCircle className="h-10 w-10 text-emerald-500" />
        <p className="font-semibold text-gray-800">Invite sent to {email}</p>
        <p className="text-xs text-gray-500">They'll get an email to set up their account and project.</p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="mt-2 text-sm text-primary underline"
        >
          Invite another user
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-violet-100 p-2.5 rounded-xl">
          <UserPlus className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Invite a User</h2>
          <p className="text-xs text-gray-500">They'll set up their own project independently</p>
        </div>
      </div>

      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contractor@example.com"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? "Sending invite…" : "Send invite"}
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center">
        The user will receive an email to create their password and set up their project.
        Their data is completely separate from yours.
      </p>
    </div>
  );
}
