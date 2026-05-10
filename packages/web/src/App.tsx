import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import BlockScreenPreview from './pages/BlockScreenPreview'
import { ProtectedRoute } from './components/ProtectedRoute'

const queryClient = new QueryClient()

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/block-preview" element={<ProtectedRoute><BlockScreenPreview /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App
