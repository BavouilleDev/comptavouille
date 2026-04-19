import { onAuthStateChanged } from 'firebase/auth'

/** Attend le premier événement Auth (synchrone avec l’état persistant / redirect). */
export function waitFirstAuthTick(auth) {
  if (!auth) return Promise.resolve()
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub()
      resolve()
    })
  })
}
