import { supabase } from "@/lib/supabase";
import { Vendor } from "@/lib/types";
import { VendorsClient } from "./VendorsClient";

export default async function VendorsPage() {
  const { data } = await supabase.from("vendors").select("*").order("vendor_name");
  return <VendorsClient vendors={(data ?? []) as Vendor[]} />;
}
