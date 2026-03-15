"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

interface AccountModalProps {
  open: boolean
  onClose: () => void
  email: string
  displayName: string
  tier: string
  onUpgrade: () => void
}

const PLAN_INFO: Record<string, { label: string; price: string; period: string; channels: number; features: string[] }> = {
  free: {
    label: "Free",
    price: "0€",
    period: "für immer",
    channels: 3,
    features: ["3 Channels pro Analyse", "KI-Titel Generator", "Muster-Analyse", "Alle Zeitraum-Filter"],
  },
  basic: {
    label: "Basic",
    price: "8,99€",
    period: "/ Monat",
    channels: 10,
    features: ["10 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Kanalliste speichern"],
  },
  premium: {
    label: "Premium",
    price: "15,99€",
    period: "/ Monat",
    channels: 40,
    features: ["40 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Mehrere Listen"],
  },
}

const TIER_BADGE: Record<string, string> = {
  premium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  basic: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  free: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
}

export function AccountModal({ open, onClose, email, displayName, tier, onUpgrade }: AccountModalProps) {
  const [tab, setTab] = useState<"account" | "plan">("account")
  const [newPassword, setNewPassword] = useState("")
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "done" | "error">("idle")
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  if (!open) return null

  const plan = PLAN_INFO[tier] ?? PLAN_INFO.free

  async function changePassword() {
    if (newPassword.length < 6) return
    setPwStatus("saving")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwStatus("error"); return }
    setPwStatus("done")
    setNewPassword("")
    setTimeout(() => setPwStatus("idle"), 3000)
  }

  async function openStripePortal() {
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (!res.ok || !data.url) { setPortalError(data.error ?? "Fehler"); setPortalLoading(false); return }
      window.location.href = data.url
    } catch {
      setPortalError("Netzwerkfehler")
      setPortalLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-lg bg-white dark:bg-gray-950 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Mein Konto</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-6 pt-4 border-b border-gray-200 dark:border-gray-800">
            {[
              { key: "account", label: "Mein Konto" },
              { key: "plan", label: "Abo verwalten" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key as "account" | "plan")}
                className={`pb-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? "border-violet-600 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Mein Konto */}
          {tab === "account" && (
            <div className="px-6 py-6 space-y-3">
              {/* Email */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">E-Mail</p>
                  <p className="text-sm text-gray-900 dark:text-white">{email}</p>
                </div>
              </div>

              {/* Name */}
              {displayName && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Name</p>
                  <p className="text-sm text-gray-900 dark:text-white">{displayName}</p>
                </div>
              )}

              {/* Password */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3.5">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Passwort ändern</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPwStatus("idle") }}
                    onKeyDown={(e) => e.key === "Enter" && changePassword()}
                    placeholder="Neues Passwort (min. 6 Zeichen)"
                    className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={changePassword}
                    disabled={newPassword.length < 6 || pwStatus === "saving"}
                    className="px-4 py-2 text-sm rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-40 transition-colors font-medium shrink-0"
                  >
                    {pwStatus === "saving" ? "..." : pwStatus === "done" ? "✓ Gespeichert" : pwStatus === "error" ? "Fehler" : "Ändern"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Abo verwalten */}
          {tab === "plan" && (
            <div className="px-6 py-6 space-y-4">
              {/* Current plan */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Aktueller Plan</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900 dark:text-white">{plan.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_BADGE[tier] ?? TIER_BADGE.free}`}>
                        Aktiv
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{plan.price}</p>
                    <p className="text-xs text-gray-400">{plan.period}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-violet-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {tier !== "premium" && (
                  <button
                    onClick={() => { onClose(); onUpgrade() }}
                    className="w-full py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    {tier === "free" ? "Upgrade auf Basic oder Premium" : "Upgrade auf Premium"}
                  </button>
                )}

                {tier !== "free" && (
                  <>
                    <button
                      onClick={openStripePortal}
                      disabled={portalLoading}
                      className="w-full py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50"
                    >
                      {portalLoading ? "Wird geöffnet..." : "Abo verwalten / kündigen"}
                    </button>
                    {portalError && <p className="text-xs text-red-500 dark:text-red-400 text-center">{portalError}</p>}
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                      Öffnet das Stripe-Kundenportal für Rechnungen, Zahlungsmethoden und Kündigung.
                    </p>
                  </>
                )}

                {tier === "free" && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    Kein aktives Abonnement — kein Kündigen nötig.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
