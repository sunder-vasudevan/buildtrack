"use client";

import { useState } from "react";
import { Vendor } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { Phone, Mail, X } from "lucide-react";

const PAYMENT_COLORS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Partial: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-700",
};

export function VendorsClient({ vendors }: { vendors: Vendor[] }) {
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const categories = Array.from(new Set(vendors.map((v) => v.category)));
  const filtered = filterCat === "all" ? vendors : vendors.filter((v) => v.category === filterCat);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
        <p className="text-sm text-muted-foreground">{vendors.length} vendors</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              filterCat === cat ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-border"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => setSelected(vendor)}
            className="bg-white rounded-xl p-4 shadow-sm border border-border cursor-pointer active:bg-gray-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-gray-900">{vendor.vendor_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{vendor.category}</p>
                {vendor.contact_person && <p className="text-xs text-gray-600 mt-1">👤 {vendor.contact_person}</p>}
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                {vendor.quote_amount && <p className="text-sm font-semibold text-gray-900">{formatINR(vendor.quote_amount)}</p>}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full block ${PAYMENT_COLORS[vendor.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                  {vendor.payment_status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border sticky top-0 bg-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">{selected.vendor_name}</h2>
                <p className="text-xs text-muted-foreground">{selected.category}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4">
              {/* Contact */}
              <div className="space-y-2">
                {selected.contact_person && <p className="text-sm text-gray-700">👤 {selected.contact_person}</p>}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <Phone className="h-4 w-4" /> {selected.phone}
                  </a>
                )}
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                    <Mail className="h-4 w-4" /> {selected.email}
                  </a>
                )}
                {selected.address && <p className="text-xs text-muted-foreground">📍 {selected.address}</p>}
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Quote</p><p className="font-semibold">{formatINR(selected.quote_amount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Quoted Date</p><p className="font-medium">{formatDate(selected.quoted_date)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{selected.status}</p></div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_COLORS[selected.payment_status] ?? "bg-gray-100 text-gray-600"}`}>
                    {selected.payment_status}
                  </span>
                </div>
              </div>

              {selected.notes && (
                <div><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm text-gray-700">{selected.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
