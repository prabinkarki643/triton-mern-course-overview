import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Hotel,
  LogOut,
  Calendar,
  LayoutDashboard,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockUser } from "@/lib/mock-data";

function MainLayout() {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
              <Hotel className="size-5" />
            </div>
            <span className="font-heading text-lg font-semibold tracking-tight">
              BookMyRoom
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/" end className={navItemClass}>
              Browse Rooms
            </NavLink>
            <NavLink to="/my-bookings" className={navItemClass}>
              My Bookings
            </NavLink>
            <NavLink to="/owner/dashboard" className={navItemClass}>
              Owner Portal
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 transition-colors hover:bg-muted">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-xs font-medium text-white">
                        RB
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">
                      {mockUser.name}
                    </span>
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link to="/my-bookings">
                      <Calendar className="mr-2 size-4" />
                      My Bookings
                    </Link>
                  }
                />
                <DropdownMenuItem
                  render={
                    <Link to="/owner/dashboard">
                      <LayoutDashboard className="mr-2 size-4" />
                      Owner Portal
                    </Link>
                  }
                />
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  render={
                    <Link to="/login">
                      <LogOut className="mr-2 size-4" />
                      Log out
                    </Link>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                  <Hotel className="size-4" />
                </div>
                <span className="font-heading text-base font-semibold">
                  BookMyRoom
                </span>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                Find and book amazing stays across Nepal.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Discover</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Kathmandu</li>
                <li>Pokhara</li>
                <li>Bhaktapur</li>
                <li>Nagarkot</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">For Owners</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>List your room</li>
                <li>Owner dashboard</li>
                <li>Pricing guide</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help centre</li>
                <li>Contact us</li>
                <li>Terms &amp; privacy</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            (c) {new Date().getFullYear()} BookMyRoom. Built for learning by Triton College.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;
