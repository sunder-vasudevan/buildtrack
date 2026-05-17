import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${day} ${months[month - 1]} ${year}`;
}

export function daysLeft(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function parseLogDescription(desc: string | null | undefined) {
  if (!desc) return { category: null, labour: null, cleanDescription: "" };

  const categoryMatch = desc.match(/^\[Category:\s*([^\]]+)\]/);
  const labourMatch = desc.match(/\[Labour:\s*([^\]]+)\]/);

  let cleanDescription = desc;
  let category = null;
  let labour = null;

  if (categoryMatch) {
    category = categoryMatch[1];
    cleanDescription = cleanDescription.replace(categoryMatch[0], "");
  }
  if (labourMatch) {
    labour = labourMatch[1];
    cleanDescription = cleanDescription.replace(labourMatch[0], "");
  }

  return {
    category: category ? category.trim() : null,
    labour: labour ? labour.trim() : null,
    cleanDescription: cleanDescription.trim(),
  };
}

export function isWish(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.trim().startsWith("[Wish]");
}

export function cleanWishText(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text.trim().replace(/^\[Wish\]\s*/i, "").trim();
  cleaned = cleaned.replace(/^\[Phase:[^\]]*\]\s*/i, "").trim();
  return cleaned;
}

export function parseWishPhase(text: string | null | undefined): { id: string | null, name: string | null } {
  if (!text) return { id: null, name: null };
  const cleaned = text.trim().replace(/^\[Wish\]\s*/i, "").trim();
  const match = cleaned.match(/^\[Phase:([^|\]]*)\|([^\]]*)\]/);
  if (match) {
    return {
      id: match[1] || null,
      name: match[2] || null
    };
  }
  return { id: null, name: null };
}

export function parseDeliverableFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const match = notes.trim().match(/^\[Deliverable:([^\]]*)\]/i);
  return match ? match[1] : null;
}

export function cleanDeliverableNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes.trim().replace(/^\[Deliverable:[^\]]*\]\s*/i, "").trim();
}
