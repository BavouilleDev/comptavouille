import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { getRedirectResult } from 'firebase/auth'
import './index.css'
import App from './App.jsx'
import { auth, firebaseReady } from './firebase'
import { waitFirstAuthTick } from './lib/waitFirstAuth'

/**
 * 1) Consomme un éventuel retour OAuth (redirect).
 * 2) Attend le 1er tick `onAuthStateChanged` pour que `auth.currentUser` soit aligné
 *    avant le 1er rendu React (évite flash `user === null` → /login).
 * Pas de StrictMode : en dev il remontait tout le graphe et recréait des courses avec Auth.
 */
async function bootstrap() {
  if (firebaseReady && auth) {
    try {
      await getRedirectResult(auth)
    } catch (err) {
      if (err?.code !== 'auth/no-auth-event') {
        console.warn('[auth] getRedirectResult', err)
      }
    }
    await waitFirstAuthTick(auth)
  }

  createRoot(document.getElementById('root')).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  )
}

void bootstrap()
