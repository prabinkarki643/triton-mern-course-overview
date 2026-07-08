// src/components/owner/OwnerLayout.tsx
// Matches Lesson 23 section 23.8. Sidebar shared across every owner page,
// wrapped by ProtectedRoute at the App.tsx level so only authenticated
// owners can reach it.
import { NavLink, Outlet } from "react-router-dom";
import { Home, PlusCircle, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: "/owner/rooms", label: "My Rooms", icon: <Home className="h-4 w-4" /> },
  {
    to: "/owner/rooms/new",
    label: "Add Room",
    icon: <PlusCircle className="h-4 w-4" />,
  },
  {
    to: "/owner/bookings",
    label: "Booking Requests",
    icon: <CalendarCheck className="h-4 w-4" />,
  },
];

function OwnerLayout() {
  return (
    <div className="flex min-h-svh">
      <aside className="bg-muted/30 w-64 border-r p-4">
        <h2 className="mb-6 text-lg font-semibold">Owner Portal</h2>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/owner/rooms"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default OwnerLayout;
