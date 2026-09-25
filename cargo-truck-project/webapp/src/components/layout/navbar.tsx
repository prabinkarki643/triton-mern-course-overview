// src/components/layout/navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, LogOut } from "lucide-react";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { Button, buttonVariants } from "@/components/ui/button";

export function Navbar() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  // Why `mounted`:
  //
  // js-cookie reads document.cookie, which does not exist on the server. So
  // during server rendering getToken() is always undefined and this component
  // renders the logged-out links. In the browser the cookie IS there, so the
  // very first client render shows the loading state instead -- two different
  // trees, which React reports as a hydration mismatch.
  //
  // Rendering nothing in the auth area until after mount makes the server and
  // the first client render agree. The nav has a fixed height, so nothing
  // jumps when the real state appears a moment later.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Truck className="size-5" />
          CargoTruck
        </Link>

        <div className="flex items-center gap-3">
          {!mounted || isLoading ? null : user ? (
            <>
              <span className="hidden text-sm sm:inline">
                {user.name}
                <span className="ml-1 text-muted-foreground">
                  ({user.role})
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="size-4" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Log in
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ size: "sm" })}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
