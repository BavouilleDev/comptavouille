import { AlertTriangle } from 'lucide-react'

export function FirestoreRulesBanner() {
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 space-y-2">
          <p className="font-medium">Firestore : accès refusé (règles de sécurité)</p>
          <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
            Les règles publiées dans la console Firebase ne correspondent pas à ce
            dépôt, ou ne sont pas encore publiées. Ouvre{' '}
            <span className="font-mono">firestore.rules</span>, copie tout le contenu
            dans la console :{' '}
            <strong>Firestore Database → Règles → Publier</strong>. Tu peux aussi
            lancer <span className="font-mono">npm run deploy:rules</span> après{' '}
            <span className="font-mono">firebase login</span>. Désactive les
            bloqueurs de requêtes sur <span className="font-mono">localhost</span> si
            tu vois <span className="font-mono">ERR_BLOCKED_BY_CLIENT</span> sur{' '}
            <span className="font-mono">firestore.googleapis.com</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
