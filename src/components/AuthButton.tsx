"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { AuthModal } from "@/components/AuthModal"
import { Button } from "@/components/ui/button"
import type { User } from "@supabase/supabase-js"

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{user.email}</span>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Abmelden
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
        Anmelden
      </Button>
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
