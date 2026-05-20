import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { FinancesClient } from "@/components/finances/FinancesClient";
import { Income, BudgetItem, Expense } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";
import FinancesLoading from "./loading";

export const dynamic = "force-dynamic";

async function FinancesContent() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [budgetRes, projectRes, incomeRes, phasesRes, expensesRes] = await Promise.all([
    supabase.from("budget_items").select("id, project_id, user_id, item_name, category, phase_id, quoted_cost, actual_cost, vendor_id, status, payment_date, notes, receipt_url, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("projects").select("total_budget").eq("user_id", user.id).maybeSingle(),
    supabase.from("income").select("*").eq("user_id", user.id).order("date_received", { ascending: false }),
    supabase.from("phases").select("id, name, deliverables, phase_number").eq("user_id", user.id).order("phase_number"),
    supabase.from("expenses").select("*").eq("user_id", user.id).order("expense_date", { ascending: false }),
  ]);

  return (
    <>
      <FinancesClient
        initialItems={(budgetRes.data ?? []) as BudgetItem[]}
        totalBudget={(projectRes.data?.total_budget as number) ?? 0}
        initialIncomes={(incomeRes.data ?? []) as Income[]}
        initialExpenses={(expensesRes.data ?? []) as Expense[]}
        phases={(phasesRes.data ?? []) as any[]}
      />
      <div className="pt-8 pb-16 text-center shrink-0">
        <p className="text-xs text-muted-foreground">{APP_VERSION}</p>
      </div>
    </>
  );
}

export default function FinancesPage() {
  return (
    <div className="p-4 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Finances</h1>
      </div>
      <Suspense fallback={<FinancesLoading />}>
        <FinancesContent />
      </Suspense>
    </div>
  );
}
