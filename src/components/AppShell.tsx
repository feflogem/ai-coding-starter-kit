"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BarChart2, History, User, LogOut, Zap, ShieldCheck, BookOpen } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const navItems = [
  { href: "/analysen", icon: BarChart2, label: "Analysen" },
  { href: "/verlauf", icon: History, label: "Verlauf" },
  { href: "/profil", icon: User, label: "Profil" },
  { href: "/anleitung", icon: BookOpen, label: "Anleitung" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [tier, setTier] = useState<string>("free")

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/"); return }
      setUser(data.user)
      supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", data.user.id)
        .single()
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
          {[...navItems, ...(user?.email === adminEmail ? [{ href: "/admin", icon: ShieldCheck, label: "Admin" }] : [])].map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{displayName}</p>
              <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 ${tierColors[tier] ?? tierColors.free}`}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </span>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push("/") }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Abmelden"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-56 min-h-screen bg-white dark:bg-gray-950 overflow-auto">
        {children}
      </main>
    </div>
  )
}
