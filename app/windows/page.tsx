import { supabase } from "@/lib/supabase";
import { Window, Vendor } from "@/lib/types";
import { WindowsClient } from "./WindowsClient";

async function getData() {
  const [windowsRes, vendorsRes] = await Promise.all([
    supabase.from("windows").select("*").order("window_id"),
    supabase.from("vendors").select("id, vendor_name").order("vendor_name"),
  ]);
  return {
    windows: (windowsRes.data ?? []) as Window[],
    vendors: (vendorsRes.data ?? []) as Pick<Vendor, "id" | "vendor_name">[],
  };
}

export default async function WindowsPage() {
  const { windows, vendors } = await getData();
  return <WindowsClient initialWindows={windows} vendors={vendors} />;
}
