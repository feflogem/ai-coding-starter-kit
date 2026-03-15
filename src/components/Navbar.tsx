"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"
import type { User } from "@supabase/supabase-js"

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup")
  const pathname = usePathname()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const isLanding = pathname === "/"
  const isAppRoute = ["/analysen", "/verlauf", "/profil", "/dashboard", "/admin"].some(r => pathname.startsWith(r)) || (pathname === "/anleitung" && !!user)

  if (isAppRoute) return null

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href={user ? "/dashboard" : "/"}
          className="text-lg tracking-tight font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent"
        >
          Viral Tracker
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {!isLanding && (
                <Link
                  href="/dashboard"
                  className={`text-sm transition-colors ${
                    pathname === "/dashboard"
                      ? "font-medium text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Dashboard
                </Link>
              )}
              <Link
                href="/profil"
                className={`text-sm transition-colors ${
                  pathname === "/profil"
                    ? "font-medium text-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Profil
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>Abmelden</Button>
            </>
          ) : (
            <>
              <button
                onClick={() => { setModalMode("login"); setModalOpen(true) }}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Anmelden
              </button>
              <Button size="sm" onClick={() => { setModalMode("signup"); setModalOpen(true) }} className="bg-violet-600 hover:bg-violet-700 text-white border-0">
                Kostenlos starten
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode={modalMode} />
    </header>
  )
}
