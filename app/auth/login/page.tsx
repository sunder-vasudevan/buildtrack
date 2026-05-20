"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

type Mode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://buildtrackapp.vercel.app/auth/set-password",
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setResetDone(true);
        setLoading(false);
      }
      return;
    }

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setSignupDone(true);
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.replace("/");
      }
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setConfirmPassword("");
    setResetDone(false);
  }

  if (signupDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border p-6 shadow-sm text-center space-y-3">
          <div className="text-4xl">📬</div>
          <h2 className="font-bold text-gray-900 text-lg">Check your inbox</h2>
          <p className="text-sm text-gray-500">
            We sent a confirmation link to <span className="font-medium text-gray-700">{email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <button onClick={() => { setSignupDone(false); switchMode("signin"); }} className="text-sm text-primary underline">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (resetDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border p-6 shadow-sm text-center space-y-3">
          <div className="text-4xl">🔑</div>
          <h2 className="font-bold text-gray-900 text-lg">Reset link sent</h2>
          <p className="text-sm text-gray-500">
            Check your inbox at <span className="font-medium text-gray-700">{email}</span> and click the link to set a new password.
          </p>
          <button onClick={() => { setResetDone(false); switchMode("signin"); }} className="text-sm text-primary underline">
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gray-100 p-4 rounded-2xl mb-4">
            <Image src="/crane.svg" alt="BuildTrack" width={40} height={40} unoptimized />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BuildTrack</h1>
          <p className="text-sm text-gray-500 mt-1">Construction project tracker</p>
        </div>

        {/* Demo banner — hidden, re-enable when demo mode is built */}

        {mode !== "forgot" && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "signin" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === "signup" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              Create account
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="mb-5">
            <button onClick={() => switchMode("signin")} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              ← Back to sign in
            </button>
            <h2 className="font-bold text-gray-900 text-lg mt-3">Reset your password</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your email and we&apos;ll send a reset link.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {mode === "signin" && (
                  <button type="button" onClick={() => switchMode("forgot")} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Min 8 characters" : "••••••••"}
                  className="w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading
              ? mode === "signup" ? "Creating account…" : mode === "forgot" ? "Sending…" : "Signing in…"
              : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
