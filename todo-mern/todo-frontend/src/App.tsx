import { Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage"
import AboutPage from "./pages/AboutPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import NotFoundPage from "./pages/NotFoundPage"
import RoomDetailPage from "./pages/RoomDetailsPage/RoomDetailPage"
import MainLayout from "./layouts/MainLayout"
import TodoPage from "./pages/TodoPage"

export function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/todos" element={<TodoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/rooms/:id" element={<RoomDetailPage />} />

        {/* Catch All Route to catch not found URL */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default App
