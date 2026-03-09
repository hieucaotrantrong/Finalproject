import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { GoogleOAuthProvider } from '@react-oauth/google'

import App from './App'
import './index.css'

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <GoogleOAuthProvider clientId="399428363401-v6dl5qlo2mkfu2i67vnon8liv7uo6ggq.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </StrictMode>
  )
}