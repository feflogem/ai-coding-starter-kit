"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"

interface PricingModalProps {
  open: boolean
  onClose: () => void
}

const PLANS = [
  {
    name: "Free",
    price: "0€",
    period: "für immer",
    features: ["3 Channels pro Analyse", "KI-Titel Generator", "Muster-Analyse", "Alle Zeitraum-Filter"],
    tier: null,
    highlight: false,
  },
  {
    name: "Basic",
    price: "8,99€",
    period: "/ Monat",
    features: ["10 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Kanalliste speichern"],
    tier: "basic",
    highlight: true,
  },
  {
    name: "Premium",
    price: "15,99€",
    period: "/ Monat",
    features: ["40 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Mehrere Listen"],
    tier: "premium",
    highlight: false,
  },
]

export function PricingModal({ open, onClose }: PricingModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSelect(tier: string | null) {
    if (!tier) { onClose(); return }
    setLoading(tier)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError("Bitte zuerst einloggen."); setLoading(null); return }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { setError(data.error ?? "Fehler beim Starten des Checkouts."); setLoading(null); return }
      window.location.href = data.url
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
      setLoading(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-2xl bg-white dark:bg-gray-950 rounded-2xl shadow-2xl pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Plan wählen</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Upgrade jederzeit kündbar.</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Plans */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-5 flex flex-col gap-3 ${
                  plan.highlight
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                }`}
              >
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${plan.highlight ? "text-violet-200" : "text-gray-400 dark:text-gray-500"}`}>{plan.name}</p>
                  <p className="text-3xl font-bold">{plan.price}</p>
                  <p className={`text-xs ${plan.highlight ? "text-violet-200" : "text-gray-400 dark:text-gray-500"}`}>{plan.period}</p>
                </div>
                <ul className={`space-y-1.5 text-xs flex-1 ${plan.highlight ? "text-violet-100" : "text-gray-600 dark:text-gray-300"}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="opacity-60">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  onClick={() => handleSelect(plan.tier)}
                  disabled={!!loading}
                  variant={plan.highlight ? "secondary" : "outline"}
                  className={`w-full ${plan.highlight ? "bg-white text-violet-700 hover:bg-violet-50 border-0" : ""}`}
                >
                  {loading === plan.tier ? "..." : plan.tier === null ? "Weiter mit Free" : `${plan.name} wählen`}
                </Button>
              </div>
            ))}
          </div>

          {error && <p className="px-6 pb-4 text-sm text-red-500 dark:text-red-400">{error}</p>}
        </div>
      </div>
    </>
  )
}
