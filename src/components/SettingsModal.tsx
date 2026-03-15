"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

const tierName: Record<string, string> = { free: "Free", basic: "Basic", premium: "Premium" }
const tierPrice: Record<string, string> = { free: "Kostenlos", basic: "€8,99 / Monat", premium: "€15,99 / Monat" }
const tierChannelLimit: Record<string, number> = { free: 3, basic: 10, premium: 40 }
const MONTHLY_LIMITS: Record<string, { scans: number; competitor: number }> = {
  free: { scans: 3, competitor: 1 },
  basic: { scans: 10, competitor: 5 },
  premium: { scans: Infinity, competitor: 25 },
}
const TIER_BADGE: Record<string, string> = {
  premium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  basic: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  free: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [email, setEmail] = useState("")
  const [userId, setUserId] = useState("")
  const [tier, setTier] = useState("free")
  const [scanCount, setScanCount] = useState(0)
  const [competitorCount, setCompetitorCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Password
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "done" | "mismatch" | "error">("idle")

  // YouTube
  const [youtubeChannel, setYoutubeChannel] = useState("")
  const [ytStatus, setYtStatus] = useState<"idle" | "saving" | "saved" | "invalid" | "error">("idle")
  const [validatedChannel, setValidatedChannel] = useState<{ title: string; thumbnail: string | null } | null>(null)

  // Plan actions
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setEmail(data.user.email ?? "")
      setUserId(data.user.id)
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const [profileResult, subResult, scanResult, competitorResult] = await Promise.all([
        supabase.from("profiles").select("youtube_channel_id").eq("id", data.user.id).single(),
        supabase.from("subscriptions").select("tier").eq("user_id", data.user.id).single(),
        supabase.from("scans").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).gte("created_at", startOfMonth),
        supabase.from("competitor_analyses").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).gte("created_at", startOfMonth),
      ])
      if (profileResult.data?.youtube_channel_id) setYoutubeChannel(profileResult.data.youtube_channel_id)
      if (subResult.data?.tier) setTier(subResult.data.tier)
      if (scanResult.count !== null) setScanCount(scanResult.count)
      if (competitorResult.count !== null) setCompetitorCount(competitorResult.count)
      setLoading(false)
    })
  }, [open])

  if (!open) return null

  async function changePassword() {
    if (newPassword !== confirmPassword) { setPwStatus("mismatch"); return }
    if (newPassword.length < 6) return
    setPwStatus("saving")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPwStatus("error"); return }
    setPwStatus("done")
    setNewPassword("")
    setConfirmPassword("")
    setTimeout(() => setPwStatus("idle"), 3000)
  }

  async function saveYoutubeChannel() {
    if (!userId) return
    setYtStatus("saving")
    setValidatedChannel(null)
    if (youtubeChannel.trim()) {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/validate-channel?q=${encodeURIComponent(youtubeChannel.trim())}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (!data.valid) { setYtStatus("invalid"); setTimeout(() => setYtStatus("idle"), 4000); return }
      setValidatedChannel({ title: data.title, thumbnail: data.thumbnail })
    }
    const { error } = await supabase.from("profiles").update({ youtube_channel_id: youtubeChannel.trim(), updated_at: new Date().toISOString() }).eq("id", userId)
    if (error) { setYtStatus("error"); setTimeout(() => setYtStatus("idle"), 3000); return }
    setYtStatus("saved")
    setTimeout(() => setYtStatus("idle"), 2500)
  }

  async function handleUpgrade(plan: "basic" | "premium") {
    setUpgradeLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUpgradeLoading(false); return }
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ tier: plan }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setUpgradeLoading(false)
  }

  async function openPortal() {
    setPortalLoading(true)
    setPortalError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPortalLoading(false); return }
    const res = await fetch("/api/stripe/portal", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } })
    const data = await res.json()
    if (data.url) { window.location.href = data.url; return }
    setPortalError(data.error ?? "Fehler")
    setPortalLoading(false)
  }

  const limits = MONTHLY_LIMITS[tier] ?? MONTHLY_LIMITS.free
  const channelLimit = tierChannelLimit[tier] ?? 3

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-xl bg-white dark:bg-gray-950 rounded-2xl shadow-2xl pointer-events-auto flex flex-col" style={{ maxHeight: "90vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Einstellungen</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {loading ? (
              <div className="space-y-3 py-8">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
              </div>
            ) : (
              <>
                {/* ── Account ── */}
                <Section title="Konto">
                  <Field label="E-Mail">
                    <p className="text-sm text-gray-900 dark:text-white">{email}</p>
                  </Field>

                  <Field label="Passwort">
                    <p className="text-sm text-gray-400 dark:text-gray-500 tracking-widest mb-3">••••••••</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Neues Passwort</p>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => { setNewPassword(e.target.value); setPwStatus("idle") }}
                          placeholder="Mindestens 6 Zeichen"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Bestätigen</p>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus("idle") }}
                          placeholder="Wiederholen"
                          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                    {pwStatus === "mismatch" && <p className="text-xs text-red-500 mt-1.5">Passwörter stimmen nicht überein.</p>}
                    {pwStatus === "error" && <p className="text-xs text-red-500 mt-1.5">Fehler. Bitte erneut einloggen und versuchen.</p>}
                    <button
                      onClick={changePassword}
                      disabled={newPassword.length < 6 || pwStatus === "saving"}
                      className="mt-2.5 px-4 py-2 text-sm rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-40 transition-colors font-medium"
                    >
                      {pwStatus === "saving" ? "..." : pwStatus === "done" ? "✓ Gespeichert" : "Passwort ändern"}
                    </button>
                  </Field>
                </Section>

                {/* ── YouTube ── */}
                <Section title="YouTube-Kanal">
                  <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Wird im KI-Titelgenerator als Referenz für deinen Stil verwendet.</p>

                  {youtubeChannel && ytStatus !== "invalid" && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      {validatedChannel?.thumbnail
                        ? <img src={validatedChannel.thumbnail} alt="" className="w-6 h-6 rounded-full shrink-0" />
                        : <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      }
                      <span className="text-sm text-gray-900 dark:text-white font-medium truncate">{validatedChannel?.title ?? youtubeChannel}</span>
                      <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium shrink-0">Gespeichert</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={youtubeChannel}
                      onChange={(e) => setYoutubeChannel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveYoutubeChannel()}
                      placeholder="@MeinChannel oder youtube.com/@MeinChannel"
                      className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={saveYoutubeChannel}
                      disabled={ytStatus === "saving"}
                      className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium shrink-0"
                    >
                      {ytStatus === "saving" ? "Prüfen..." : ytStatus === "saved" ? "✓ Gespeichert" : "Speichern"}
                    </button>
                  </div>
                  {ytStatus === "invalid" && <p className="text-xs text-red-500">Channel nicht gefunden. @Handle oder URL prüfen.</p>}
                  {ytStatus === "error" && <p className="text-xs text-red-500">Fehler beim Speichern.</p>}
                </Section>

                {/* ── Plan ── */}
                <Section title="Abonnement">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-gray-900 dark:text-white">{tierName[tier]}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_BADGE[tier] ?? TIER_BADGE.free}`}>Aktiv</span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tierPrice[tier]}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>

                  {/* Usage bars */}
                  <div className="space-y-3 pt-1">
                    {[
                      { label: "Kanal-Analysen", used: scanCount, max: limits.scans },
                      { label: "Competitor Analysen", used: competitorCount, max: limits.competitor },
                      { label: "Channels pro Scan", used: channelLimit, max: 40, display: `bis zu ${channelLimit}` },
                    ].map(({ label, used, max, display }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {display ?? (max === Infinity ? "Unbegrenzt" : `${used} / ${max} diesen Monat`)}
                          </p>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${used >= max && max !== Infinity ? "bg-red-500" : "bg-violet-600"}`}
                            style={{ width: max === Infinity ? "100%" : `${Math.min(100, (used / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tier === "free" && (
                      <button
                        onClick={() => handleUpgrade("basic")}
                        disabled={upgradeLoading}
                        className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                      >
                        {upgradeLoading ? "..." : "Auf Basic upgraden"}
                      </button>
                    )}
                    {tier !== "premium" && (
                      <button
                        onClick={() => handleUpgrade("premium")}
                        disabled={upgradeLoading}
                        className="text-sm px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 font-medium transition-colors"
                      >
                        {upgradeLoading ? "..." : "Auf Premium upgraden"}
                      </button>
                    )}
                    {tier !== "free" && (
                      <button
                        onClick={openPortal}
                        disabled={portalLoading}
                        className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 transition-colors"
                      >
                        {portalLoading ? "..." : "Abo verwalten / kündigen"}
                      </button>
                    )}
                  </div>
                  {portalError && <p className="text-xs text-red-500">{portalError}</p>}
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
