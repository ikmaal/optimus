import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for inspection photo storage. Uses the service
 * role key, so this module must never be imported into client components.
 */

const DEFAULT_BUCKET = "car-inspections";

let cached: SupabaseClient | null = null;

export function inspectionBucket(): string {
  return process.env.SUPABASE_INSPECTION_BUCKET || DEFAULT_BUCKET;
}

function getClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/**
 * Upload one inspection photo to the private bucket. Returns the storage path
 * (not a public URL — use {@link signedUrl} to read it back).
 */
export async function uploadInspectionPhoto(
  carId: string,
  inspectionId: string,
  kind: string,
  buffer: Buffer,
  contentType = "image/jpeg",
): Promise<string> {
  const path = `${carId}/${inspectionId}/${kind}.jpg`;
  const { error } = await getClient()
    .storage.from(inspectionBucket())
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  return path;
}

/** Create a short-lived signed URL for reading a stored photo. */
export async function signedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await getClient()
    .storage.from(inspectionBucket())
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Supabase signed URL failed: ${error?.message}`);
  return data.signedUrl;
}
