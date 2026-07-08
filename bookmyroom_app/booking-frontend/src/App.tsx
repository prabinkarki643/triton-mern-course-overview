// src/App.tsx
import { Routes, Route } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { OwnerDashboardPage } from "@/pages/OwnerDashboardPage"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import OwnerLayout from "@/components/owner/OwnerLayout"
import MyRooms from "@/pages/owner/MyRooms"
import AddRoom from "@/pages/owner/AddRoom"
import EditRoom from "@/pages/owner/EditRoom"
import OwnerBookings from "@/pages/owner/OwnerBookings"
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

      {/* Owner Portal -- protected + wrapped in the sidebar layout (Lesson 23) */}
      <Route
        element={
          <ProtectedRoute requireRole="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/owner/rooms" element={<MyRooms />} />
        <Route path="/owner/rooms/new" element={<AddRoom />} />
        <Route path="/owner/rooms/:id/edit" element={<EditRoom />} />
        <Route path="/owner/bookings" element={<OwnerBookings />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
