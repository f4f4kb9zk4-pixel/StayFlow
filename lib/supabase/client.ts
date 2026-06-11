import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Browser-side Supabase client for use in Client Components
 * (realtime subscriptions, optimistic mutations, etc.)
 *
 * See lib/supabase/server.ts for why the explicit return type + cast is
 * needed (works around a @supabase/ssr / @supabase/supabase-js type
 * mismatch that otherwise resolves all query results to `never`).
 */
export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ) as unknown as SupabaseClient<Database>;
}
