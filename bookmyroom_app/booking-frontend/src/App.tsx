// src/App.tsx
import { Routes, Route } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { OwnerDashboardPage } from "@/pages/OwnerDashboardPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import AuthLayout from "./layouts/AuthLayout"
import NotFoundPage from "./pages/NotFoundPage"

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute requireRole="owner">
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
