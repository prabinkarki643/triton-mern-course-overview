import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Hotel,
  LogOut,
  Calendar,
  LayoutDashboard,
  User,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-rose-500">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-xs font-medium text-white">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                  <ChevronDown className="hidden size-4 text-muted-foreground sm:inline" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
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
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  className="hidden sm:inline-flex"
                  render={<Link to="/login">Log in</Link>}
                />
                <Button
                  size="sm"
                  nativeButton={false}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
                  render={<Link to="/register">Sign up</Link>}
                />
              </>
            )}
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
