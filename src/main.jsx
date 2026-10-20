import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './App.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      {/*
        Global toast container — renders above all page content and modals.
        Position is set per-call in src/utils/toast.js (top-right by default).
        z-index 9999 ensures toasts float above any modal (z-50 = 50, z-9999 wins).
      */}
      <Toaster
        position="top-right"
        gutter={8}
        containerStyle={{ zIndex: 9999 }}
        toastOptions={{
          duration: 4000,
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
