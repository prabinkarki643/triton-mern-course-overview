import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import MainLayout from "@/components/layouts/MainLayout";
import OwnerLayout from "@/components/layouts/OwnerLayout";
import HomePage from "@/pages/HomePage";
import RoomDetailPage from "@/pages/RoomDetailPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MyBookingsPage from "@/pages/MyBookingsPage";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import OwnerRoomsPage from "@/pages/owner/OwnerRoomsPage";
import OwnerBookingsPage from "@/pages/owner/OwnerBookingsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Route>

        <Route path="/owner/dashboard" element={<OwnerLayout />}>
          <Route index element={<OwnerDashboard />} />
          <Route path="rooms" element={<OwnerRoomsPage />} />
          <Route path="bookings" element={<OwnerBookingsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
