import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Ne pas envoyer Cross-Origin-Opener-Policy depuis ce serveur : avec signInWithPopup,
// Firebase lit popup.closed / close() sur une origine différente ; COOP (même
// same-origin-allow-popups) peut encore déclencher des avertissements ou des blocages.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
    strictPort: true,
  },
})
