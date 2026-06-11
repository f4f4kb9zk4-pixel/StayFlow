import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in — StayFlow",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="StayFlow" className="mx-auto h-12 w-12 rounded-lg" />
          <p className="text-2xl font-semibold tracking-tight text-primary">StayFlow</p>
          <p className="text-sm text-muted-foreground">One flow. Every dept.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your StayFlow staff account to continue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error === "no_hotel_access" && (
              <p className="text-sm text-warning">
                Your account isn&apos;t assigned to a hotel yet. Contact your hotel
                administrator.
              </p>
            )}
            <LoginForm />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Need access?{" "}
          <Link href="mailto:support@stayflow.app" className="text-primary hover:underline">
            Contact your administrator
          </Link>
        </p>
      </div>
    </div>
  );
}
