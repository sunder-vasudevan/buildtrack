"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, RefreshCw } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
  project: { name: string; created_at: string } | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterEmail: user.email }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load users.");
    } else {
      setUsers(data.users);
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-xl">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">All Users</h2>
            <p className="text-xs text-gray-500">{users.length} account{users.length !== 1 ? "s" : ""} signed up</p>
          </div>
        </div>
        <button onClick={fetchUsers} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No users yet.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white border rounded-xl p-4 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 break-all">{u.email}</p>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${u.project ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {u.project ? "Active" : "No project"}
                </span>
              </div>
              {u.project && (
                <p className="text-xs text-gray-600">📁 {u.project.name}</p>
              )}
              <div className="flex gap-3 text-xs text-gray-400">
                <span>Joined {formatDate(u.created_at)}</span>
                {u.last_sign_in && <span>· Last seen {formatDate(u.last_sign_in)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
