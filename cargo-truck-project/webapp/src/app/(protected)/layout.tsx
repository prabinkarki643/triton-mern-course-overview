// src/app/(protected)/layout.tsx
// The guard. Anything inside (protected) requires a token cookie.
//
// This checks only that a cookie EXISTS -- it does not verify the JWT.
// That is deliberate: it is a user-experience guard so people are not shown
// pages that cannot load. The real enforcement is requireAuth on the
// backend, which verifies the signature on every protected endpoint.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
