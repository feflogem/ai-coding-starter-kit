"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { supabase } from "@/lib/supabase"

interface AdminUser {
  id: string
  email: string
  createdAt: string
  lastSignIn: string | null
  tier: string
  youtubeChannel: string | null
  totalScans: number
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  basic: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  premium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changing, setChanging] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "free" | "basic" | "premium">("all")
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return }
      if (data.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        router.push("/analysen"); return
      }
      fetchUsers(data.user)
    })
  }, [router])

  async function fetchUsers(user: { email?: string }) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { setError("Fehler beim Laden der Nutzer."); setLoading(false); return }
    const data = await res.json()
    setUsers(data.users)
    setLoading(false)
  }

  async function changeTier(userId: string, newTier: string) {
    setChanging(userId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setChanging(null); return }
    await fetch("/api/admin/set-tier", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ userId, tier: newTier }),
    })
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, tier: newTier } : u))
    setChanging(null)
  }

  const filtered = filter === "all" ? users : users.filter((u) => u.tier === filter)
  const counts = { all: users.length, free: 0, basic: 0, premium: 0 }
  users.forEach((u) => { if (u.tier in counts) counts[u.tier as keyof typeof counts]++ })

  return (
    <AppShell>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nutzerübersicht & Plan-Verwaltung</p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(["all", "free", "basic", "premium"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full border transition-colors ${
                filter === t
                  ? "bg-violet-600 text-white border-violet-600"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400"
              }`}
            >
              {t === "all" ? "Alle" : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${filter === t ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_80px_80px_140px_120px] gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">E-Mail</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">YouTube</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Scans</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Registriert</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan ändern</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((u) => (
                <div key={u.id} className="grid grid-cols-[1fr_100px_80px_80px_140px_120px] gap-3 px-5 py-3.5 items-center">
                  <p className="text-sm text-gray-900 dark:text-white truncate">{u.email}</p>
                  <p className="text-xs text-gray-400 truncate">{u.youtubeChannel ?? "—"}</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">{u.totalScans}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${TIER_COLORS[u.tier] ?? TIER_COLORS.free}`}>
                    {u.tier}
                  </span>
                  <p className="text-xs text-gray-400 text-right">{formatDate(u.createdAt)}</p>
                  <div className="flex gap-1">
                    {["free", "basic", "premium"].map((t) => (
                      <button
                        key={t}
                        onClick={() => changeTier(u.id, t)}
                        disabled={u.tier === t || changing === u.id}
                        className={`text-xs px-2 py-1 rounded border transition-colors disabled:opacity-40 ${
                          u.tier === t
                            ? "bg-violet-600 text-white border-violet-600"
                            : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-violet-400 hover:text-violet-600"
                        }`}
                      >
                        {t[0].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
