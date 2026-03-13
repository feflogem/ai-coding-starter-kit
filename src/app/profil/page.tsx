"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { User } from "@supabase/supabase-js"

const tierName: Record<string, string> = { free: "Free", basic: "Basic", premium: "Premium" }
const tierPrice: Record<string, string> = { free: "Kostenlos", basic: "€8,99/Monat", premium: "€15,99/Monat" }
const tierChannelLimit: Record<string, number> = { free: 3, basic: 10, premium: 40 }
const MONTHLY_LIMITS: Record<string, { scans: number; competitor: number }> = {
  free: { scans: 3, competitor: 1 },
  basic: { scans: 10, competitor: 5 },
  premium: { scans: Infinity, competitor: 25 },
}

function nextBillingDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })
}

function nextResetDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  d.setDate(1)
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long" })
}

function ProfilPageInner() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [youtubeChannel, setYoutubeChannel] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error" | "mismatch">("idle")
  const [tier, setTier] = useState<string>("free")
  const [scanCount, setScanCount] = useState(0)
  const [competitorCount, setCompetitorCount] = useState(0)
  const [devTierSwitch, setDevTierSwitch] = useState<"idle" | "loading">("idle")
  const [upgradeStatus, setUpgradeStatus] = useState<"idle" | "loading">("idle")
  const [portalStatus, setPortalStatus] = useState<"idle" | "loading">("idle")
  const [portalError, setPortalError] = useState<string | null>(null)

  // Extra usage state
  const [extraUsageEnabled, setExtraUsageEnabled] = useState(false)
  const [extraMonthlyLimitCents, setExtraMonthlyLimitCents] = useState(2500)
  const [extraCreditBalanceCents, setExtraCreditBalanceCents] = useState(0)
  const [extraAutoReload, setExtraAutoReload] = useState(false)
  const [editingLimit, setEditingLimit] = useState(false)
  const [editLimitValue, setEditLimitValue] = useState("")
  const [extraUsageStatus, setExtraUsageStatus] = useState<"idle" | "saving">("idle")

  const router = useRouter()
  const searchParams = useSearchParams()
  const upgradeParam = searchParams.get("upgrade")

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return }
      setUser(data.user)
      loadProfile(data.user.id)
    })
  }, [router])

  async function loadProfile(userId: string) {
    setIsLoadingProfile(true)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [profileResult, subResult, scanResult, competitorResult] = await Promise.all([
      supabase.from("profiles").select("youtube_channel_id").eq("id", userId).single(),
      supabase.from("subscriptions").select("tier, extra_usage_enabled, extra_monthly_limit_cents, extra_credit_balance_cents, extra_auto_reload").eq("user_id", userId).single(),
      supabase.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
      supabase.from("competitor_analyses").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfMonth),
    ])
    if (profileResult.data?.youtube_channel_id) setYoutubeChannel(profileResult.data.youtube_channel_id)
    if (subResult.data) {
      setTier(subResult.data.tier)
      setExtraUsageEnabled(subResult.data.extra_usage_enabled ?? false)
      setExtraMonthlyLimitCents(subResult.data.extra_monthly_limit_cents ?? 2500)
      setExtraCreditBalanceCents(subResult.data.extra_credit_balance_cents ?? 0)
      setExtraAutoReload(subResult.data.extra_auto_reload ?? false)
    }
    if (scanResult.count !== null) setScanCount(scanResult.count)
    if (competitorResult.count !== null) setCompetitorCount(competitorResult.count)
    setIsLoadingProfile(false)
  }

  async function saveProfile() {
    if (!user) return
    setProfileStatus("saving")
    const { error } = await supabase
      .from("profiles")
      .update({ youtube_channel_id: youtubeChannel, updated_at: new Date().toISOString() })
      .eq("id", user.id)
    if (error) { setProfileStatus("error"); setTimeout(() => setProfileStatus("idle"), 3000); return }
    setProfileStatus("saved")
    setTimeout(() => setProfileStatus("idle"), 2000)
  }

  async function handleUpgrade(plan: "basic" | "premium") {
    setUpgradeStatus("loading")
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUpgradeStatus("idle"); return }
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ tier: plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) { setUpgradeStatus("idle"); return }
      window.location.href = data.url
    } catch { setUpgradeStatus("idle") }
  }

  async function handleManageSubscription() {
    setPortalStatus("loading")
    setPortalError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPortalStatus("idle"); return }
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setPortalError(data.error ?? "Fehler beim Öffnen des Portals.")
        setPortalStatus("idle")
        return
      }
      window.location.href = data.url
    } catch {
      setPortalError("Netzwerkfehler.")
      setPortalStatus("idle")
    }
  }

  async function switchTierDev(newTier: string) {
    if (!user) return
    setDevTierSwitch("loading")
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setDevTierSwitch("idle"); return }
    const res = await fetch("/api/admin/set-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId: user.id, tier: newTier }),
    })
    if (res.ok) {
      setTier(newTier)
    }
    setDevTierSwitch("idle")
  }

  async function handleExtraUsagePatch(patch: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch("/api/extra-usage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(patch),
    })
  }

  async function handleToggleExtraUsage(enabled: boolean) {
    setExtraUsageEnabled(enabled)
    await handleExtraUsagePatch({ extra_usage_enabled: enabled })
  }

  async function handleToggleAutoReload(enabled: boolean) {
    setExtraAutoReload(enabled)
    await handleExtraUsagePatch({ extra_auto_reload: enabled })
  }

  async function handleSaveLimit() {
    const euros = parseFloat(editLimitValue.replace(",", "."))
    if (isNaN(euros) || euros < 0) return
    const cents = Math.round(euros * 100)
    setExtraUsageStatus("saving")
    setExtraMonthlyLimitCents(cents)
    await handleExtraUsagePatch({ extra_monthly_limit_cents: cents })
    setExtraUsageStatus("idle")
    setEditingLimit(false)
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) return
    if (newPassword !== confirmPassword) { setPasswordStatus("mismatch"); return }
    setPasswordStatus("saving")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPasswordStatus("error"); return }
    setPasswordStatus("saved")
    setNewPassword("")
    setConfirmPassword("")
    setTimeout(() => setPasswordStatus("idle"), 2000)
  }

  if (!user) return null

  const channelLimit = tierChannelLimit[tier] ?? 3
  const limits = MONTHLY_LIMITS[tier] ?? MONTHLY_LIMITS.free
  const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const extraMonthlyLimitEuros = extraMonthlyLimitCents / 100

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil & Abonnement</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verwalte dein Konto und dein Abonnement</p>
        </div>

        {/* Plan card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Aktueller Plan</h2>
            {!isLoadingProfile && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                tier === "premium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                : tier === "basic" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}>
                {tierName[tier] ?? tier}
              </span>
            )}
          </div>

          {upgradeParam === "success" && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-3">Upgrade erfolgreich! Dein Plan wurde aktualisiert.</p>
          )}
          {upgradeParam === "cancelled" && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Upgrade abgebrochen.</p>
          )}

          {isLoadingProfile ? (
            <div className="space-y-3">
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">Plan</p>
                  <p className="text-gray-900 dark:text-white font-medium">{tierName[tier]} · {tierPrice[tier]}</p>
                </div>
                {tier !== "free" && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">Nächste Abrechnung</p>
                    <p className="text-gray-900 dark:text-white">{nextBillingDate()}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-0.5">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <p className="text-gray-900 dark:text-white">Aktiv</p>
                  </div>
                </div>
              </div>

              {/* Usage bars */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                {/* Kanal-Analysen */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Kanal-Analysen</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {limits.scans === Infinity
                        ? "Unbegrenzt"
                        : `${scanCount} / ${limits.scans} diesen Monat`}
                    </p>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${scanCount >= limits.scans && limits.scans !== Infinity ? "bg-red-500" : "bg-violet-600"}`}
                      style={{ width: limits.scans === Infinity ? "100%" : `${Math.min(100, (scanCount / limits.scans) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Competitor Analysen */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Competitor Analysen</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {`${competitorCount} / ${limits.competitor} diesen Monat`}
                    </p>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${competitorCount >= limits.competitor ? "bg-red-500" : "bg-violet-600"}`}
                      style={{ width: `${Math.min(100, (competitorCount / limits.competitor) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Channels per scan */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Channels pro Scan</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">bis zu {channelLimit}</p>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 rounded-full" style={{ width: `${(channelLimit / 40) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Dev: Plan switcher (admin only) */}
              {isAdmin && (
                <div className="pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-2 font-medium">Plan wechseln (Dev)</p>
                  <div className="flex gap-2">
                    {["free", "basic", "premium"].map((t) => (
                      <button
                        key={t}
                        onClick={() => switchTierDev(t)}
                        disabled={devTierSwitch === "loading" || tier === t}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-40 ${
                          tier === t
                            ? "bg-violet-600 text-white border-violet-600"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upgrade / manage buttons */}
              {tier !== "premium" && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tier === "free" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpgrade("basic")}
                      disabled={upgradeStatus === "loading"}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {upgradeStatus === "loading" ? "..." : "Auf Basic upgraden"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleUpgrade("premium")}
                    disabled={upgradeStatus === "loading"}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {upgradeStatus === "loading" ? "..." : "Auf Premium upgraden"}
                  </Button>
                </div>
              )}
              {tier !== "free" && (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={portalStatus === "loading"}
                      className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      {portalStatus === "loading" ? "..." : "Plan kündigen"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={portalStatus === "loading"}
                    >
                      {portalStatus === "loading" ? "..." : "Abonnement verwalten"}
                    </Button>
                  </div>
                  {portalError && <p className="text-xs text-red-500">{portalError}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extra Usage */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Zusätzliche Nutzung</h2>
            <button
              onClick={() => handleToggleExtraUsage(!extraUsageEnabled)}
              disabled={isLoadingProfile}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                extraUsageEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                extraUsageEnabled ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Aktiviere Zusatznutzung, um die App weiter zu nutzen, wenn du ein Limit erreichst.{" "}
            <span className="underline cursor-pointer text-gray-500 dark:text-gray-400">Mehr erfahren</span>
          </p>

          {extraUsageEnabled && (
            <div className="space-y-5">
              {/* Spending progress */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(0 / 100).toFixed(2).replace(".", ",")} € ausgegeben
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Zurücksetzung am {nextResetDate()}</p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {extraMonthlyLimitCents > 0 ? Math.round((0 / extraMonthlyLimitCents) * 100) : 0}% verbraucht
                  </p>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${extraMonthlyLimitCents > 0 ? Math.min(100, (0 / extraMonthlyLimitCents) * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Monthly limit */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{extraMonthlyLimitEuros} €</p>
                    <span className="text-xs text-gray-400 cursor-help" title="Maximaler Betrag, den du monatlich für Zusatznutzung ausgeben kannst.">ⓘ</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monatliches Ausgabenlimit</p>
                </div>
                {editingLimit ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24 h-8 text-sm"
                      value={editLimitValue}
                      onChange={(e) => setEditLimitValue(e.target.value)}
                      placeholder={String(extraMonthlyLimitEuros)}
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveLimit} disabled={extraUsageStatus === "saving"} className="bg-violet-600 hover:bg-violet-700 text-white">
                      {extraUsageStatus === "saving" ? "..." : "Speichern"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingLimit(false)}>Abbruch</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setEditLimitValue(String(extraMonthlyLimitEuros)); setEditingLimit(true) }}>
                    Limit anpassen
                  </Button>
                )}
              </div>

              {/* Credit balance */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(extraCreditBalanceCents / 100).toFixed(2).replace(".", ",")} €
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aktuelles Guthaben ·{" "}
                    <button
                      onClick={() => handleToggleAutoReload(!extraAutoReload)}
                      className="text-amber-600 dark:text-amber-400 underline"
                    >
                      Automatisches Neuladen {extraAutoReload ? "ein" : "aus"}
                    </button>
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Zusatznutzung kaufen
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* YouTube Channel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">YouTube-Kanal</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            Wird im KI-Titelgenerator als Referenz für deinen Stil verwendet.
          </p>

          {youtubeChannel && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span className="text-sm text-gray-900 dark:text-white font-medium">{youtubeChannel}</span>
              <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">Gespeichert</span>
            </div>
          )}

          <div className="flex gap-2">
            {isLoadingProfile ? (
              <div className="h-9 flex-1 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            ) : (
              <Input
                value={youtubeChannel}
                onChange={(e) => setYoutubeChannel(e.target.value)}
                placeholder="@MeinChannel oder youtube.com/@MeinChannel"
                className="flex-1"
              />
            )}
            <Button
              onClick={saveProfile}
              disabled={profileStatus === "saving" || isLoadingProfile}
              className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
            >
              {profileStatus === "saving" ? "..." : profileStatus === "saved" ? "✓ Gespeichert" : "Aktualisieren"}
            </Button>
          </div>
          {profileStatus === "error" && (
            <p className="text-xs text-red-500 mt-2">Fehler beim Speichern.</p>
          )}
        </div>

        {/* Account settings */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Konto-Einstellungen</h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">E-Mail</Label>
              <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Passwort ändern</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs">Neues Passwort</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordStatus("idle") }}
                    placeholder="Mindestens 6 Zeichen"
                    minLength={6}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs">Bestätigen</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordStatus("idle") }}
                    placeholder="Passwort wiederholen"
                  />
                </div>
              </div>
              {passwordStatus === "mismatch" && <p className="text-xs text-red-500">Passwörter stimmen nicht überein.</p>}
              {passwordStatus === "error" && <p className="text-xs text-red-500">Fehler beim Ändern. Bitte erneut einloggen.</p>}
              <Button
                size="sm"
                variant="outline"
                onClick={changePassword}
                disabled={passwordStatus === "saving" || !newPassword || newPassword.length < 6}
              >
                {passwordStatus === "saving" ? "Speichern..." : passwordStatus === "saved" ? "✓ Geändert" : "Passwort ändern"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function ProfilPage() {
  return (
    <Suspense>
      <ProfilPageInner />
    </Suspense>
  )
}
