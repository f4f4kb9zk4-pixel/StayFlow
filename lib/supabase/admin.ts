import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Server-only Supabase client using the service role key — bypasses RLS and
 * has access to the Auth Admin API (`auth.admin.*`). Used for privileged
 * operations like creating staff accounts from Settings (§3.2 item 11).
 *
 * Never import this from client components, and never expose
 * `SUPABASE_SERVICE_ROLE_KEY` to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to your environment to enable admin operations like creating staff accounts."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
