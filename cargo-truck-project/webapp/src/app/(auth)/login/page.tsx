// src/app/(auth)/login/page.tsx
// Server Component. Holds no interactive code, so any server work we need
// later (a cookie read, a redirect, server-side fetching) can go here
// without touching the client file.
import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  // Suspense costs nothing here and becomes mandatory the moment the client
  // component reads the URL -- useSearchParams() without a boundary fails
  // the production build.
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
