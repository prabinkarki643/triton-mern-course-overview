// src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom"
import { MainLayout } from "@/layouts/MainLayout"
import { HomePage } from "@/pages/HomePage"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { OwnerDashboardPage } from "@/pages/OwnerDashboardPage"
import RoomListing from "@/pages/RoomListing"
import RoomDetail from "@/pages/RoomDetail"
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
        <Route path="/rooms" element={<RoomListing />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Owner Portal -- protected + wrapped in the sidebar layout (Lesson 23).
          Mounted once at /owner, everything inside inherits the shell. */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute requireRole="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboardPage />} />
        <Route path="rooms" element={<MyRooms />} />
        <Route path="rooms/new" element={<AddRoom />} />
        <Route path="rooms/:id/edit" element={<EditRoom />} />
        <Route path="bookings" element={<OwnerBookings />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

export default App
