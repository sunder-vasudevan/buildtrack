/**
 * migrate-photos-to-b2.ts
 *
 * Migrates photos stored in Supabase Storage to Backblaze B2.
 * Targets: daily_logs.photos[] and phases.deliverables[].photos[]
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> npx ts-node --project tsconfig.scripts.json scripts/migrate-photos-to-b2.ts
 *
 * Required env (reads from .env.local automatically via dotenv):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role — bypasses RLS)
 *   B2_KEY_ID
 *   B2_APP_KEY
 *   B2_BUCKET_NAME
 *   B2_ENDPOINT
 *
 * Safety: downloads first → uploads to B2 → verifies publicUrl reachable → updates DB.
 * Supabase Storage files are NOT deleted by this script.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL"); process.exit(1); }
if (!SERVICE_ROLE_KEY) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. RLS may block some rows.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY ?? ANON_KEY);

const B2_KEY_ID = process.env.B2_KEY_ID!;
const B2_APP_KEY = process.env.B2_APP_KEY!;
const B2_BUCKET = process.env.B2_BUCKET_NAME!;
const B2_ENDPOINT = process.env.B2_ENDPOINT!;

if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT) {
  console.error("Missing B2 env vars"); process.exit(1);
}

const s3 = new S3Client({
  endpoint: `https://${B2_ENDPOINT}`,
  region: "auto",
  credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY },
});

function isSupabaseUrl(url: string): boolean {
  return url.includes("supabase") || url.includes("supabase.co");
}

function b2PublicUrl(key: string): string {
  return `https://${B2_BUCKET}.${B2_ENDPOINT}/${key}`;
}

async function downloadFile(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

async function uploadToB2(buffer: Buffer, contentType: string, key: string): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await s3.send(cmd);
  return b2PublicUrl(key);
}

async function verifyB2Object(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: B2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function keyFromSupabaseUrl(url: string, userId?: string): string {
  // Try to extract original filename from path
  const segments = url.split("/");
  const filename = segments[segments.length - 1].split("?")[0];
  const prefix = userId ? `${userId}/` : "migrated/";
  return `${prefix}${Date.now()}-${filename}`;
}

interface MigrationResult {
  original: string;
  b2Url: string | null;
  error: string | null;
}

async function migrateUrl(url: string, userId?: string): Promise<MigrationResult> {
  if (!isSupabaseUrl(url)) {
    return { original: url, b2Url: url, error: null }; // already B2 or other, skip
  }
  try {
    const { buffer, contentType } = await downloadFile(url);
    const key = keyFromSupabaseUrl(url, userId);
    const b2Url = await uploadToB2(buffer, contentType, key);
    const verified = await verifyB2Object(key);
    if (!verified) throw new Error("B2 HeadObject check failed after upload");
    console.log(`  ✓ ${url.slice(-60)} → ${b2Url.slice(-60)}`);
    return { original: url, b2Url, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${url.slice(-60)}: ${message}`);
    return { original: url, b2Url: null, error: message };
  }
}

// --- daily_logs migration ---

async function migrateDailyLogs() {
  console.log("\n=== Migrating daily_logs.photos ===");

  const { data: rows, error } = await supabase
    .from("daily_logs")
    .select("id, user_id, photos")
    .not("photos", "is", null);

  if (error) { console.error("Query error:", error.message); return; }
  if (!rows?.length) { console.log("No daily_log rows with photos."); return; }

  let updated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const photos: string[] = row.photos ?? [];
    const hasSupabase = photos.some(isSupabaseUrl);
    if (!hasSupabase) { skipped++; continue; }

    console.log(`Row ${row.id} — ${photos.length} photo(s)`);
    const results = await Promise.all(photos.map((url: string) => migrateUrl(url, row.user_id)));

    const anyFailed = results.some((r) => r.error !== null);
    if (anyFailed) {
      console.warn(`  Skipping DB update for row ${row.id} due to migration errors.`);
      failed++;
      continue;
    }

    const newPhotos = results.map((r) => r.b2Url!);
    const { error: updateErr } = await supabase
      .from("daily_logs")
      .update({ photos: newPhotos })
      .eq("id", row.id);

    if (updateErr) {
      console.error(`  DB update failed for row ${row.id}: ${updateErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`daily_logs: ${updated} updated, ${skipped} skipped (already B2), ${failed} failed`);
}

// --- phases migration ---

async function migratePhases() {
  console.log("\n=== Migrating phases.deliverables photos ===");

  const { data: rows, error } = await supabase
    .from("phases")
    .select("id, user_id, deliverables")
    .not("deliverables", "is", null);

  if (error) { console.error("Query error:", error.message); return; }
  if (!rows?.length) { console.log("No phase rows with deliverables."); return; }

  let updated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const deliverables = row.deliverables;
    if (!Array.isArray(deliverables)) { skipped++; continue; }

    // Check if any deliverable has supabase photo URLs
    const hasAnySupabase = deliverables.some((d: Record<string, unknown>) => {
      const photos: string[] = Array.isArray(d?.photos) ? d.photos : [];
      return photos.some(isSupabaseUrl);
    });
    if (!hasAnySupabase) { skipped++; continue; }

    console.log(`Phase ${row.id} — checking deliverables`);
    let anyFailed = false;
    const newDeliverables = await Promise.all(
      deliverables.map(async (d: Record<string, unknown>) => {
        const photos: string[] = Array.isArray(d?.photos) ? d.photos : [];
        if (!photos.some(isSupabaseUrl)) return d;

        const results = await Promise.all(photos.map((url: string) => migrateUrl(url, row.user_id)));
        if (results.some((r) => r.error !== null)) { anyFailed = true; return d; }
        return { ...d, photos: results.map((r) => r.b2Url!) };
      })
    );

    if (anyFailed) {
      console.warn(`  Skipping DB update for phase ${row.id} due to migration errors.`);
      failed++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from("phases")
      .update({ deliverables: newDeliverables })
      .eq("id", row.id);

    if (updateErr) {
      console.error(`  DB update failed for phase ${row.id}: ${updateErr.message}`);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`phases: ${updated} updated, ${skipped} skipped (already B2 or no photos), ${failed} failed`);
}

async function main() {
  console.log("BuildTrack: Supabase Storage → B2 photo migration");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`B2 bucket: ${B2_BUCKET} @ ${B2_ENDPOINT}`);
  console.log("Using", SERVICE_ROLE_KEY ? "service role key" : "anon key (RLS applies)");

  await migrateDailyLogs();
  await migratePhases();

  console.log("\nMigration complete. Supabase Storage files NOT deleted.");
}

main().catch((err) => { console.error(err); process.exit(1); });
