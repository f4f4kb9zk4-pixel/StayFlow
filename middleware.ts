import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes the Supabase auth session on every request and resolves the
 * current hotel context. Tenant scoping itself is enforced by RLS
 * (see supabase/migrations/0001_init.sql), this middleware just keeps the
 * session cookie fresh so server components get a valid `auth.uid()`.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest, icons (static assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
