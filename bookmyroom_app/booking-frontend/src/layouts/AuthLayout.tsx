// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom"

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  )
}

export default AuthLayout
