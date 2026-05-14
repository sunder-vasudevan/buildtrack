import { supabase } from "@/lib/supabase";

export interface AttachmentFile {
  url: string;
  folder: "receipts" | "logs" | "plans";
  filename: string;
}

function receiptFilename(date: string | null, itemName: string, url: string): string {
  const ext = url.split("?")[0].split(".").pop() ?? "jpg";
  const safeDate = (date ?? "undated").replace(/\//g, "-");
  const safeName = itemName.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
  return `${safeDate}-${safeName}.${ext}`;
}

function logFilename(date: string, url: string, index: number): string {
  const ext = url.split("?")[0].split(".").pop() ?? "jpg";
  const safeDate = date.replace(/\//g, "-");
  return `${safeDate}-photo${index + 1}.${ext}`;
}

function planFilename(title: string, url: string): string {
  const ext = url.split("?")[0].split(".").pop() ?? "pdf";
  const safeName = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 50).replace(/\s+/g, "-");
  return `${safeName}.${ext}`;
}

export async function collectAttachments(
  categories: ("receipts" | "logs" | "plans")[]
): Promise<AttachmentFile[]> {
  const results: AttachmentFile[] = [];

  if (categories.includes("receipts")) {
    const { data } = await supabase
      .from("budget_items")
      .select("item_name, payment_date, notes")
      .not("notes", "is", null);

    for (const item of data ?? []) {
      const match = (item.notes as string).match(/Receipt:\s*(https?:\/\/\S+)/i);
      if (match) {
        results.push({
          url: match[1],
          folder: "receipts",
          filename: receiptFilename(item.payment_date, item.item_name, match[1]),
        });
      }
    }
  }

  if (categories.includes("logs")) {
    const { data } = await supabase
      .from("daily_logs")
      .select("log_date, photos")
      .not("photos", "is", null);

    for (const log of data ?? []) {
      const photos: { url: string; caption?: string }[] = log.photos ?? [];
      photos.forEach((photo, i) => {
        if (photo.url) {
          results.push({
            url: photo.url,
            folder: "logs",
            filename: logFilename(log.log_date, photo.url, i),
          });
        }
      });
    }
  }

  if (categories.includes("plans")) {
    const { data } = await supabase
      .from("documents")
      .select("title, url")
      .not("url", "is", null);

    for (const doc of data ?? []) {
      results.push({
        url: doc.url,
        folder: "plans",
        filename: planFilename(doc.title, doc.url),
      });
    }
  }

  return results;
}
