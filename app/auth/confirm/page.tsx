"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

function ConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleConfirm() {
      const type = searchParams.get("type");

      // Invite flow → user needs to set a password
      if (type === "invite") {
        router.replace("/auth/set-password");
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Invalid or expired link. Please log in again.");
        return;
      }

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      router.replace(project ? "/dashboard" : "/setup");
    }

    handleConfirm();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-gray-700 font-medium mb-4">{error}</p>
        <a href="/auth/login" className="text-sm text-primary underline">Back to login</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4" />
      <p className="text-sm text-gray-500">One moment…</p>
    </div>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense>
      <ConfirmHandler />
    </Suspense>
  );
}
