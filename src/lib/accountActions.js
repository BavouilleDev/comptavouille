import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { deleteUser } from 'firebase/auth'

/** @param {import('firebase/firestore').Firestore} db */
export async function deleteCollectionDocs(db, colRef) {
  const snap = await getDocs(colRef)
  const refs = snap.docs.map((d) => d.ref)
  const chunk = 400
  for (let i = 0; i < refs.length; i += chunk) {
    const batch = writeBatch(db)
    for (const r of refs.slice(i, i + chunk)) batch.delete(r)
    await batch.commit()
  }
}

/**
 * Deletes all documents in `users/{uid}/months`, then `users/{uid}`, then Firebase Auth user.
 * @param {{ db: import('firebase/firestore').Firestore; user: import('firebase/auth').User }} param0
 */
export async function nukeUserAccount({ db, user }) {
  const uid = user.uid
  const monthsCol = collection(db, 'users', uid, 'months')
  await deleteCollectionDocs(db, monthsCol)
  await deleteDoc(doc(db, 'users', uid))
  await deleteUser(user)
}
