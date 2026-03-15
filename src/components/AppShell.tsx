"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { supabase } from "@/lib/supabase"
import { BarChart2, History, LogOut, Zap, ShieldCheck, BookOpen, HelpCircle, Settings, Moon, Sun, Send } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { SettingsModal } from "@/components/SettingsModal"
import { ThemeToggle } from "@/components/ThemeToggle"

const navItems = [
  { href: "/analysen", icon: BarChart2, label: "Analysen" },
  { href: "/verlauf", icon: History, label: "Verlauf" },
  { href: "/anleitung", icon: BookOpen, label: "Anleitung" },
  { href: null, icon: HelpCircle, label: "Hilfe" },
]

// ── Help Chat ──────────────────────────────────────────────────────────────────
function HelpChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! Ich helfe dir bei Fragen zu Viral Tracker — Nutzung, Tarife, Features. Was möchtest du wissen?" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/help-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ messages: next.slice(1) }), // skip initial assistant message
      })
      const data = await res.json()
      setMessages([...next, { role: "assistant", content: data.reply ?? data.error ?? "Fehler beim Laden." }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Verbindungsfehler. Bitte erneut versuchen." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-start p-4 sm:pl-64 pointer-events-none">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col pointer-events-auto" style={{ height: "480px" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Viral Tracker Support</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Frage stellen…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main AppShell ──────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tier, setTier] = useState<string>("free")
  const [helpOpen, setHelpOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return }
      setUser(data.user)
      supabase.from("subscriptions").select("tier").eq("user_id", data.user.id).single()
        .then(({ data: sub }) => { if (sub?.tier) setTier(sub.tier) })
    })
  }, [router])

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??"
  const displayName = user?.email?.split("@")[0] ?? ""
  const tierColors: Record<string, string> = {
    premium: "bg-amber-500/20 text-amber-400",
    basic: "bg-blue-500/20 text-blue-400",
    free: "bg-gray-700 text-gray-400",
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-950 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-40">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Viral Tracker</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {[...navItems, ...(adminEmail && user?.email === adminEmail ? [{ href: "/admin" as string | null, icon: ShieldCheck, label: "Admin" }] : [])].map(({ href, icon: Icon, label }) => {
            const active = href !== null && (pathname === href || pathname.startsWith(href + "/"))
            const cls = `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              active ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`
            if (href === null) {
              return (
                <button key={label} onClick={() => setHelpOpen(true)} className={cls}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              )
            }
            return (
              <Link key={href} href={href} className={cls}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-2 py-3 border-t border-gray-800 flex items-center gap-1.5">
          {/* Account trigger → opens AccountModal directly */}
          <button
            onClick={() => setAccountOpen(true)}
            className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors group min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-white font-medium truncate">{displayName}</p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${tierColors[tier] ?? tierColors.free}`}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Heller Modus" : "Dunkler Modus"}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors shrink-0"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Logout */}
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/") }}
            title="Abmelden"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Theme toggle – fixed top right */}
      <div className="fixed top-3 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen bg-white dark:bg-gray-950 overflow-auto">
        {children}
      </main>

      {/* Modals */}
      <SettingsModal open={accountOpen} onClose={() => setAccountOpen(false)} />
      {helpOpen && <HelpChat onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
