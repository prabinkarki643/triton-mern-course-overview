import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Calendar,
  Plus,
  Hotel,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navItems = [
  { to: "/owner/dashboard", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/owner/dashboard/rooms", icon: Home, label: "My Rooms" },
  { to: "/owner/dashboard/bookings", icon: Calendar, label: "Bookings" },
  { to: "/owner/dashboard/rooms", icon: Plus, label: "Add Room" },
];

function OwnerLayout() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white">
              <Hotel className="size-4" />
            </div>
            <span className="font-heading text-base font-semibold tracking-tight">
              BookMyRoom
            </span>
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Owner Portal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-xs font-medium text-white">
                RB
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">Ram Bahadur</p>
              <p className="truncate text-xs text-muted-foreground">Owner</p>
            </div>
            <Link
              to="/login"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default OwnerLayout;
