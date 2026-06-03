// src/layouts/MainLayout.tsx
import Navbar from "@/components/NavBar"
import { Outlet } from "react-router-dom"

function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4">
        <Outlet />
      </main>
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        &copy; 2026 BookMyRoom. All rights reserved.
      </footer>
    </div>
  )
}

export default MainLayout
