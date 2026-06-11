"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HOTEL_COOKIE } from "@/lib/auth/use-current-user";

/**
 * Sets the active hotel cookie (§3.3 hotel context resolution) for staff
 * who have access to multiple properties, then reloads the current view.
 */
export async function setActiveHotel(hotelId: string) {
  const cookieStore = await cookies();
  cookieStore.set(HOTEL_COOKIE, hotelId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect("/dashboard");
}
