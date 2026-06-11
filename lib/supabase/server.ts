import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Server-side Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads/writes the auth cookie via Next's `cookies()`.
 *
 * The explicit `SupabaseClient<Database>` return type + cast works around a
 * type-resolution mismatch between @supabase/ssr's `createServerClient`
 * generic signature and the installed @supabase/supabase-js version, which
 * otherwise causes all `.from(...).select(...)` results to type as `never`.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
