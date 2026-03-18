import ProfilePage from './pages/ProfilePage'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypePage from './pages/PrototypePage'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import ProtectedRoute from './components/layout/ProtectedRoute'
import NotFound from './pages/NotFound'
import SearchPage from './pages/SearchPage'
import ChannelPage from './pages/ChannelPage'
import MessagesPage from './pages/MessagesPage'
import FeedbackPage from './pages/FeedbackPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={<ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/search" element={
        <ProtectedRoute>
          <SearchPage />
        </ProtectedRoute>
      } />
      <Route path="/channel/:username" element={
        <ProtectedRoute>
          <ChannelPage />
        </ProtectedRoute>
      } />
      <Route path="/messages" element={
        <ProtectedRoute>
          <MessagesPage />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <PrototypePage />
        </ProtectedRoute>
      } />
      <Route path="/404" element={<NotFound />} />
      <Route path="/feedback" element={<FeedbackPage />} />
    </Routes>
  )
}