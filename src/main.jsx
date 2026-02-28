import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { HuertoProvider } from "./context/HuertoContext"
import './index.css'
import 'antd/dist/reset.css'
import App from './App'

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <HuertoProvider>
            <App />
          </HuertoProvider>
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>
  )
}