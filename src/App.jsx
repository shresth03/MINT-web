import { Routes, Route, Navigate } from 'react-router-dom'
import PrototypePage from './pages/PrototypePage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/*" element={<PrototypePage />} />
    </Routes>
  )
}