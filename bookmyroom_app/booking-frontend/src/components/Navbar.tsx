// src/components/Navbar.tsx
// L27.10 extends the L21 Navbar with a role-aware `Sheet` hamburger
// menu below the `md` breakpoint. A single `navLinks` array drives
// both the desktop nav and the mobile Sheet so the two views can
// never drift. The avatar dropdown stays as-is on all breakpoints.
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Hotel,
  LayoutDashboard,
  LogOut,
  Menu,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";

export function Navbar() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  // Single source of truth for both desktop and mobile nav. `show`
  // encodes the role gate -- guests don't see My Bookings, non-owners
  // don't see the Owner Portal link.
  const navLinks = [
    { to: "/", label: "Browse Rooms", end: true, show: true },
    { to: "/dashboard", label: "Dashboard", show: !!user },
    { to: "/bookings", label: "My Bookings", show: !!user },
    {
      to: "/owner/dashboard",
      label: "Owner Portal",
      show: user?.role === "owner",
    },
  ] as const;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
            <Hotel className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            BookMyRoom
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks
            .filter((link) => link.show)
            .map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={"end" in link ? link.end : undefined}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 outline-none transition-colors focus-visible:ring-2">
                <Avatar size="sm">
                  <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-xs font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {user.email}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <UserIcon className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {user.role === "owner" && (
                  <DropdownMenuItem asChild>
                    <Link to="/owner/dashboard">
                      <LayoutDashboard className="mr-2 size-4" />
                      Owner Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}

          {/* Mobile hamburger -- only visible below md. Reuses the same
              navLinks so mobile and desktop stay in lock-step. */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-4">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={"end" in link ? link.end : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `rounded-md px-3 py-2 text-base font-medium transition-colors ${
                          isActive
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                {!user && (
                  <Button
                    asChild
                    variant="outline"
                    className="mt-4"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Link to="/login">Log in</Link>
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
