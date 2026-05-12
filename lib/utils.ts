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
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
