// src/app/(auth)/layout.tsx
// Shared shell for every (auth) page. Also bounces anyone who is already
// logged in -- reading the cookie on the server, before the form renders.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Truck } from "lucide-react";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("token")?.value;

  if (token) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Truck className="size-5" />
        CargoTruck
      </Link>

      {children}

      <p className="text-xs text-muted-foreground">
        A teaching project &mdash; do not use real passwords.
      </p>
    </main>
  );
}
