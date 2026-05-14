import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

// Reads GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID from env
// See setup guide in DRIVE_SETUP.md at the project root

type Category = "receipts" | "logs" | "plans";

function receiptFilename(date: string | null, itemName: string, url: string): string {
  const ext = url.split("?")[0].split(".").pop() ?? "jpg";
  const safeDate = (date ?? "undated").replace(/\//g, "-");
  const safeName = itemName.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 40).replace(/\s+/g, "-");
  return `${safeDate}-${safeName}.${ext}`;
}

function logFilename(date: string, url: string, index: number): string {
  const ext = url.split("?")[0].split(".").pop() ?? "jpg";
  return `${date}-photo${index + 1}.${ext}`;
}

function planFilename(title: string, url: string): string {
  const ext = url.split("?")[0].split(".").pop() ?? "pdf";
  const safeName = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, 50).replace(/\s+/g, "-");
  return `${safeName}.${ext}`;
}

async function getOrCreateFolder(drive: any, parentId: string, name: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });
  if (res.data.files?.length) return res.data.files[0].id as string;

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  return created.data.id as string;
}

async function uploadFileToDrive(
  drive: any,
  folderId: string,
  filename: string,
  url: string
): Promise<"ok" | "skip" | "error"> {
  let response: Response;
  try {
    response = await fetch(url);
    if (!response.ok) return "skip";
  } catch {
    return "error";
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";

  // Skip if already exists in this folder
  const existing = await drive.files.list({
    q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id)",
  });
  if (existing.data.files?.length) return "skip";

  try {
    await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType: contentType, body: buffer },
      fields: "id",
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function POST(req: NextRequest) {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!serviceAccountJson || !rootFolderId) {
    return NextResponse.json(
      { error: "Google Drive not configured. Add GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID to your .env.local file." },
      { status: 503 }
    );
  }

  const { categories }: { categories: Category[] } = await req.json();
  if (!categories?.length) {
    return NextResponse.json({ error: "No categories selected." }, { status: 400 });
  }

  // Auth
  const credentials = JSON.parse(serviceAccountJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const drive = google.drive({ version: "v3", auth });

  // Server-side Supabase client (uses service role if available, else anon)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  if (categories.includes("receipts")) {
    const folderId = await getOrCreateFolder(drive, rootFolderId, "receipts");
    const { data } = await supabase
      .from("budget_items")
      .select("item_name, payment_date, notes")
      .not("notes", "is", null);

    for (const item of data ?? []) {
      const match = (item.notes as string).match(/Receipt:\s*(https?:\/\/\S+)/i);
      if (!match) continue;
      const result = await uploadFileToDrive(
        drive, folderId,
        receiptFilename(item.payment_date, item.item_name, match[1]),
        match[1]
      );
      if (result === "ok") uploaded++;
      else if (result === "skip") skipped++;
      else errors++;
    }
  }

  if (categories.includes("logs")) {
    const folderId = await getOrCreateFolder(drive, rootFolderId, "logs");
    const { data } = await supabase
      .from("daily_logs")
      .select("log_date, photos")
      .not("photos", "is", null);

    for (const log of data ?? []) {
      const photos: { url: string }[] = log.photos ?? [];
      for (let i = 0; i < photos.length; i++) {
        if (!photos[i].url) continue;
        const result = await uploadFileToDrive(
          drive, folderId,
          logFilename(log.log_date, photos[i].url, i),
          photos[i].url
        );
        if (result === "ok") uploaded++;
        else if (result === "skip") skipped++;
        else errors++;
      }
    }
  }

  if (categories.includes("plans")) {
    const folderId = await getOrCreateFolder(drive, rootFolderId, "plans");
    const { data } = await supabase
      .from("documents")
      .select("title, url")
      .not("url", "is", null);

    for (const doc of data ?? []) {
      const result = await uploadFileToDrive(
        drive, folderId,
        planFilename(doc.title, doc.url),
        doc.url
      );
      if (result === "ok") uploaded++;
      else if (result === "skip") skipped++;
      else errors++;
    }
  }

  return NextResponse.json({ uploaded, skipped, errors });
}
