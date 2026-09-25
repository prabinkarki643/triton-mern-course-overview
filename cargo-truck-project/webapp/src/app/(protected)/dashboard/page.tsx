// src/app/(protected)/dashboard/page.tsx
// A Server Component. This is what the cookie buys us: the token is read on
// the server, the API is called there, and the HTML arrives with the user's
// details already in it -- no loading spinner.
import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/types/user";

async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    // Never cache a per-user request, or one user sees another's data.
    cache: "no-store",
  });

  if (!res.ok) return null;

  const { data }: { data: User } = await res.json();
  return data;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // The layout already redirected anyone without a cookie. Reaching here
  // without a user means the cookie exists but the token is invalid or
  // expired -- exactly what a forged cookie produces.
  if (!user) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Session expired</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We could not verify your session. Please log in again.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">
          Signed in as a {user.role}. This page was rendered on the server.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email: </span>
              {user.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {user.phone}
            </p>
            <p>
              <span className="text-muted-foreground">Role: </span>
              {user.role}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {user.role === "transporter" ? "Your trucks" : "Your shipments"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Nothing here yet &mdash; this is where the next lesson builds the
            {user.role === "transporter"
              ? " truck listings."
              : " cargo bookings."}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
