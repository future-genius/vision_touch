import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AiStreamProvider } from './context/AiStreamContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AiStreamProvider>
          <App />
        </AiStreamProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
