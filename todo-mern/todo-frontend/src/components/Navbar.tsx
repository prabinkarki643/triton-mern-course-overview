// src/components/Navbar.tsx
import { NavLink } from "react-router-dom"

interface NavItem {
  to: string
  label: string
  end?: boolean
}

const navItems: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
]

function Navbar() {
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <NavLink to="/" className="text-xl font-bold text-primary">
          BookMyRoom
        </NavLink>
        <div className="flex gap-4">
          {navItems.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? "font-semibold text-primary"
                  : "text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
