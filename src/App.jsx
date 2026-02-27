import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypePage from './pages/PrototypePage'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/layout/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PrototypePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}