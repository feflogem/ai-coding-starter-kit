"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Passwörter stimmen nicht überein."); return }
    if (password.length < 6) { setError("Mindestens 6 Zeichen."); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError("Fehler beim Zurücksetzen. Bitte erneut versuchen."); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push("/analysen"), 2000)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Viral Tracker</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Neues Passwort setzen</h1>
        </div>

        {success ? (
          <p className="text-sm text-center text-green-600 dark:text-green-400">Passwort geändert. Du wirst weitergeleitet...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                required
                minLength={6}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Passwort wiederholen"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? "..." : "Passwort speichern"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
