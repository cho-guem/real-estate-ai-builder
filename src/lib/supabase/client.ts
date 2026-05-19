import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

// TODO: Remove this guard once real Supabase credentials are set in .env.local
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    new URL(url);
    return url.startsWith("https://") && key.length > 20;
  } catch {
    return false;
  }
}

export function createClient() {
  // TODO: Replace placeholder check with real credentials in .env.local
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
