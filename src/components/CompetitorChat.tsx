"use client"

import { useState, useRef, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface CompetitorContext {
  channelName: string
  summary: string
  angles: string[]
  titlePatterns: string[]
  topPerformers: { title: string; views: number }[]
}

interface CompetitorChatProps {
  competitorContext: CompetitorContext
}

const SUGGESTED_PROMPTS = [
  "Wie kann ich diese Angles für meinen eigenen Channel nutzen?",
  "Welches Titelmuster passt am besten für mich?",
  "Welche Themen sollte ich als nächstes aufgreifen?",
  "Was macht diesen Channel so erfolgreich?",
]

export function CompetitorChat({ competitorContext }: CompetitorChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send(text?: string) {
    const userMessage = (text ?? input).trim()
    if (!userMessage || loading) return

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/chat-competitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: newMessages, competitorContext }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error ?? "Fehler aufgetreten." }])
        return
      }
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Netzwerkfehler. Bitte versuche es erneut." }])
    } finally {
      setLoading(false)
    }
  }

  const showSuggestions = messages.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">KI-Assistent</p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Frag mich zur Analyse von {competitorContext.channelName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {showSuggestions && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Vorschläge:</p>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={loading}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Frage zur Analyse..."
            className="text-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
