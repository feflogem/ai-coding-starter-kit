"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: "login" | "signup"
}

type AuthMode = "login" | "signup" | "reset"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export function AuthModal({ open, onClose, defaultMode = "signup" }: AuthModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(defaultMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [agbAccepted, setAgbAccepted] = useState(false)

  // Reset state whenever modal is opened or defaultMode changes
  useEffect(() => {
    if (open) {
      setMode(defaultMode)
      setError(null)
      setSuccess(null)
      setAgbAccepted(false)
    }
  }, [open, defaultMode])

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/analysen` },
    })
    if (error) {
      setError("Google-Anmeldung fehlgeschlagen.")
      setGoogleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError("E-Mail oder Passwort falsch.")
      else { onClose(); router.push("/analysen") }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/analysen` },
      })
      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.status === 400) {
          setMode("login")
          setError("Du hast bereits ein Konto. Bitte melde dich an.")
        } else {
          setError(error.message)
        }
      } else if (data.user && (data.user.identities?.length === 0)) {
        // Supabase silently "succeeds" for existing confirmed accounts — identities is empty
        setMode("login")
        setError("Du hast bereits ein Konto. Bitte melde dich an.")
      } else if (data.user && !data.session) {
        setSuccess("Bestätigungsmail gesendet — bitte E-Mail prüfen.")
      } else if (data.session) {
        onClose()
        router.push("/analysen")
      }
    }

    setLoading(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError("Fehler beim Senden. Bitte E-Mail prüfen.")
    else setSuccess("Reset-Link wurde gesendet — bitte E-Mail prüfen.")
    setLoading(false)
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode)
    setError(null)
    setSuccess(null)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-white dark:bg-gray-950 px-8 py-8 space-y-5">
          {/* Header */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Viral Tracker</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === "login" ? "Willkommen zurück" : mode === "signup" ? "Kostenlos starten" : "Passwort zurücksetzen"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {mode === "login" ? "Meld dich in deinem Konto an." : mode === "signup" ? "Kostenlos bis zu 3 Channels · Keine Kreditkarte." : "Wir senden dir einen Reset-Link."}
            </p>
          </div>

          {/* Reset mode */}
          {mode === "reset" ? (
            <form onSubmit={handleReset} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="auth-email-reset" className="text-sm">E-Mail</Label>
                <Input
                  id="auth-email-reset"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
              {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "..." : "Reset-Link senden"}
              </Button>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                <button type="button" onClick={() => switchMode("login")} className="hover:underline">← Zurück zum Login</button>
              </p>
            </form>
          ) : (
            <>
              {/* Google */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2 border-gray-300 dark:border-gray-700 h-10"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                <GoogleIcon />
                <span className="text-sm font-medium">
                  {googleLoading ? "Weiterleitung..." : mode === "login" ? "Mit Google anmelden" : "Mit Google registrieren"}
                </span>
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs text-gray-400 font-medium">ODER</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              {/* Email form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="auth-email" className="text-sm">E-Mail</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password" className="text-sm">Passwort</Label>
                    {mode === "login" && (
                      <button type="button" onClick={() => switchMode("reset")} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        Passwort vergessen?
                      </button>
                    )}
                  </div>
                  <Input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
                    required
                    minLength={6}
                  />
                </div>

                {mode === "signup" && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agbAccepted}
                      onChange={(e) => setAgbAccepted(e.target.checked)}
                      className="mt-0.5 shrink-0 accent-violet-600"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Ich akzeptiere die{" "}
                      <a href="/agb" target="_blank" className="underline hover:text-gray-900 dark:hover:text-white">AGB</a>
                      {" "}und die{" "}
                      <a href="/datenschutz" target="_blank" className="underline hover:text-gray-900 dark:hover:text-white">Datenschutzerklärung</a>.
                    </span>
                  </label>
                )}

                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                {success && <p className="text-sm text-green-600 dark:text-green-400">{success}</p>}

                <Button type="submit" className="w-full h-10" disabled={loading || (mode === "signup" && !agbAccepted)}>
                  {loading ? "..." : mode === "login" ? "Anmelden" : "Konto erstellen"}
                </Button>
              </form>

              {/* Switch mode */}
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                {mode === "login" ? (
                  <>Noch kein Konto?{" "}
                    <button onClick={() => switchMode("signup")} className="font-medium text-gray-900 dark:text-white hover:underline">
                      Kostenlos registrieren
                    </button>
                  </>
                ) : (
                  <>Schon ein Konto?{" "}
                    <button onClick={() => switchMode("login")} className="font-medium text-gray-900 dark:text-white hover:underline">
                      Anmelden
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
