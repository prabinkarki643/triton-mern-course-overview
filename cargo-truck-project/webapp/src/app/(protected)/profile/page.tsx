// src/app/(protected)/profile/page.tsx
// Server Component. The (protected) layout already guarded this route, and
// the client half handles the two interactive sections.
import { Suspense } from "react";
import ProfileClient from "./profile-client";

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileClient />
    </Suspense>
  );
}
