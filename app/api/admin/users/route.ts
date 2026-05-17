import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "sunder.v@outlook.com";

export async function POST(req: NextRequest) {
  const { requesterEmail } = await req.json();

  if (requesterEmail !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Fetch project names for each user
  const userIds = data.users.map((u) => u.id);
  const { data: projects } = await supabaseAdmin
    .from("projects")
    .select("user_id, name, created_at")
    .in("user_id", userIds);

  const projectMap = Object.fromEntries(
    (projects ?? []).map((p) => [p.user_id, { name: p.name, created_at: p.created_at }])
  );

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at,
    project: projectMap[u.id] ?? null,
  }));

  return NextResponse.json({ users });
}
