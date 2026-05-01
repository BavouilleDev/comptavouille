/* eslint-disable react-hooks/set-state-in-effect -- Firebase listeners need synchronous reset when deps change */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, firebaseReady } from '../firebase'
import { clampTaxPercentage, defaultTaxPercentage } from '../lib/monthTax'
import { defaultSourcesFromProfile } from '../lib/userDefaults'
import { AppDataContext } from './appDataContext'

/** URL `/login?auth=redirect` (respecte `import.meta.env.BASE_URL`). */
function loginRedirectTabUrl() {
  const raw = import.meta.env.BASE_URL ?? '/'
  const base = raw.endsWith('/') ? raw.slice(0, -1) : raw
  const loginPath = !base || base === '' ? '/login' : `${base}/login`
  const u = new URL(loginPath, window.location.origin)
  u.searchParams.set('auth', 'redirect')
  return u.href
}

async function ensureUserDocument(user) {
  if (!db || !user) return
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  await setDoc(ref, {
    taxPercentage: 22,
    defaultRevenueSources: ['Prestation Client A', 'Ventes'],
    theme: 'dark',
    createdAt: serverTimestamp(),
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
  })
}

export function AppDataProvider({ children }) {
  /**
   * Aligné sur `auth.currentUser` dès le 1er rendu : évite qu’un remontage React
   * (Strict Mode) remette `user` à null avant le 1er `onAuthStateChanged`, ce qui
   * déclenchait `<Navigate to="/login" />` alors que la session Google existait.
   */
  const [user, setUser] = useState(() => auth?.currentUser ?? null)
  /**
   * Tant qu’on n’a pas reçu le 1er événement Auth : `false` si une session existe
   * déjà (retour `getRedirectResult` dans main.jsx).
   */
  const [authLoading, setAuthLoading] = useState(
    () => Boolean(auth) && auth.currentUser == null,
  )
  /** `undefined` = listener pas encore prêt ; `null` = doc absent ou erreur règles */
  const [profile, setProfile] = useState(undefined)
  const [monthsById, setMonthsById] = useState({})
  const [profileRulesDenied, setProfileRulesDenied] = useState(false)
  const [monthsRulesDenied, setMonthsRulesDenied] = useState(false)

  /** Session réelle : état React ou `auth.currentUser` (évite 1 frame sans user). */
  const sessionUser = user ?? auth?.currentUser ?? null

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        try {
          // S’assure que le jeton Auth est visible par Firestore avant getDoc/setDoc
          await u.getIdToken()
          await ensureUserDocument(u)
        } catch (e) {
          console.error('[auth] ensureUserDocument', e)
        }
      }
      setAuthLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!db || !sessionUser) {
      setProfile(undefined)
      setProfileRulesDenied(false)
      return
    }
    setProfileRulesDenied(false)
    const ref = doc(db, 'users', sessionUser.uid)
    return onSnapshot(
      ref,
      (snap) => {
        setProfileRulesDenied(false)
        setProfile(snap.exists() ? snap.data() : null)
      },
      (err) => {
        console.error('[firestore] users/{uid}', err)
        if (err?.code === 'permission-denied') setProfileRulesDenied(true)
        setProfile(null)
      },
    )
  }, [sessionUser])

  useEffect(() => {
    if (!db || !sessionUser) {
      setMonthsById({})
      setMonthsRulesDenied(false)
      return
    }
    setMonthsRulesDenied(false)
    const col = collection(db, 'users', sessionUser.uid, 'months')
    return onSnapshot(
      col,
      (snap) => {
        setMonthsRulesDenied(false)
        const next = {}
        snap.forEach((d) => {
          next[d.id] = { id: d.id, ...d.data() }
        })
        setMonthsById(next)
      },
      (err) => {
        console.error('[firestore] months', err)
        if (err?.code === 'permission-denied') setMonthsRulesDenied(true)
        setMonthsById({})
      },
    )
  }, [sessionUser])

  useEffect(() => {
    if (profile === undefined) return
    const t =
      profile && typeof profile === 'object' && profile.theme === 'light'
        ? 'light'
        : 'dark'
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [profile])

  const googleProvider = useMemo(() => {
    const p = new GoogleAuthProvider()
    p.setCustomParameters({ prompt: 'select_account' })
    return p
  }, [])

  const signInWithGoogleRedirect = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured')
    await signInWithRedirect(auth, googleProvider)
  }, [googleProvider])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Firebase is not configured')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (e?.code === 'auth/popup-blocked-by-browser') {
        const w = window.open(loginRedirectTabUrl(), '_blank', 'noopener,noreferrer')
        if (w == null) {
          throw new Error(
            'Les pop-ups et les nouveaux onglets sont bloqués. Autorise-les pour ce site, ou utilise un autre navigateur.',
          )
        }
        const err = new Error(
          'Un nouvel onglet s’est ouvert : termine la connexion Google dans cet onglet, puis reviens ici.',
        )
        err.code = 'auth/opened-new-tab'
        throw err
      }
      throw e
    }
  }, [googleProvider])

  const signOut = useCallback(async () => {
    if (!auth) return
    await firebaseSignOut(auth)
  }, [])

  const updateUserProfile = useCallback(
    async (partial) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid)
      await updateDoc(ref, partial)
    },
    [user],
  )

  const ensureMonthDoc = useCallback(
    async (monthKey) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid, 'months', monthKey)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        const tp = Number(data?.taxPercentage)
        if (!Number.isFinite(tp)) {
          const locked = defaultTaxPercentage(profile)
          await updateDoc(ref, { taxPercentage: locked })
          return { ...data, taxPercentage: locked }
        }
        return data
      }
      const sources = defaultSourcesFromProfile(profile)
      const taxPercentage = defaultTaxPercentage(profile)
      await setDoc(ref, { isDeclared: false, sources, taxPercentage })
      return { isDeclared: false, sources, taxPercentage }
    },
    [user, profile],
  )

  const setMonthDeclared = useCallback(
    async (monthKey, isDeclared) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid, 'months', monthKey)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, {
          isDeclared,
          sources: defaultSourcesFromProfile(profile),
          taxPercentage: defaultTaxPercentage(profile),
        })
      } else {
        const data = snap.data()
        const patch = { isDeclared }
        if (!Number.isFinite(Number(data?.taxPercentage))) {
          patch.taxPercentage = defaultTaxPercentage(profile)
        }
        await updateDoc(ref, patch)
      }
    },
    [user, profile],
  )

  const saveMonthSources = useCallback(
    async (monthKey, sources) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid, 'months', monthKey)
      await setDoc(ref, { sources }, { merge: true })
    },
    [user],
  )

  const saveMonthTaxPercentage = useCallback(
    async (monthKey, taxPercentage) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid, 'months', monthKey)
      await setDoc(
        ref,
        { taxPercentage: clampTaxPercentage(taxPercentage) },
        { merge: true },
      )
    },
    [user],
  )

  const deleteMonthDoc = useCallback(
    async (monthKey) => {
      const u = auth?.currentUser ?? user
      if (!db || !u) throw new Error('Not signed in')
      const ref = doc(db, 'users', u.uid, 'months', monthKey)
      await deleteDoc(ref)
    },
    [user],
  )

  const firestorePermissionDenied = profileRulesDenied || monthsRulesDenied

  const value = useMemo(
    () => ({
      firebaseReady,
      user,
      sessionUser,
      authLoading,
      profile,
      monthsById,
      firestorePermissionDenied,
      signInWithGoogle,
      signInWithGoogleRedirect,
      signOut,
      updateUserProfile,
      setMonthDeclared,
      saveMonthSources,
      saveMonthTaxPercentage,
      ensureMonthDoc,
      deleteMonthDoc,
      db,
      auth,
    }),
    [
      user,
      sessionUser,
      authLoading,
      profile,
      monthsById,
      firestorePermissionDenied,
      signInWithGoogle,
      signInWithGoogleRedirect,
      signOut,
      updateUserProfile,
      setMonthDeclared,
      saveMonthSources,
      saveMonthTaxPercentage,
      ensureMonthDoc,
      deleteMonthDoc,
    ],
  )

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}
