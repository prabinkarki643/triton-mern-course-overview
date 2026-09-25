// src/app/page.tsx
// Public landing page. It reads no cookie, so it stays statically rendered.
import Link from "next/link";
import { Truck, PackageSearch, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: PackageSearch,
    title: "Post your cargo",
    body: "Shippers describe the load, the route and the date.",
  },
  {
    icon: Truck,
    title: "Find a truck",
    body: "Transporters list their vehicles and accept the loads that suit them.",
  },
  {
    icon: ShieldCheck,
    title: "Book with confidence",
    body: "Every booking is tracked from request through to delivery.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Book trucks for your cargo
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            CargoTruck connects shippers who need to move goods with truck
            owners who have space to fill.
          </p>

          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register" className={buttonVariants()}>
              Get started
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline" })}
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="size-5 text-muted-foreground" />
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {body}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        CargoTruck &mdash; a teaching reference project.
      </footer>
    </div>
  );
}
