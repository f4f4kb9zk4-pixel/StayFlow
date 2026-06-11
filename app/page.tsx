import { redirect } from "next/navigation";

/**
 * Root route — middleware already redirects unauthenticated requests to
 * /login, so reaching here means the user is authenticated; send them to
 * the Dashboard Action Center (§0.1).
 */
export default function RootPage() {
  redirect("/dashboard");
}
