// src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";

export function HomePage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg">
          <Hotel className="size-7" />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Find your perfect stay
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
          Browse rooms, party venues and event spaces across Nepal.
        </p>

        {user ? (
          <p className="text-muted-foreground mt-8 text-sm">
            Signed in as <strong>{user.name}</strong> ({user.role})
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
            >
              <Link to="/register">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
