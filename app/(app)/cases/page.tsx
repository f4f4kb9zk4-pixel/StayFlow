import { redirect } from "next/navigation";

/**
 * Guest Cases has been merged into the Incidents module (one table, one
 * page, one status set). Redirect any old /cases links/bookmarks there.
 */
export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const params = await searchParams;
  redirect(params.case ? `/incidents?incident=${params.case}` : "/incidents");
}
