import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-server"

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  const input = req.nextUrl.searchParams.get("q")?.trim()
  if (!input) return NextResponse.json({ error: "Kein Channel angegeben." }, { status: 400 })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: "API-Key fehlt." }, { status: 500 })

  // Extract handle or ID from input
  let handle = input
  if (handle.includes("youtube.com")) {
    try {
      const url = new URL(handle.startsWith("http") ? handle : `https://${handle}`)
      const parts = url.pathname.split("/").filter(Boolean)
      const atPart = parts.find((p) => p.startsWith("@"))
      if (atPart) handle = atPart
      else {
        const idx = parts.findIndex((p) => ["channel", "c", "user"].includes(p))
        if (idx !== -1) handle = parts[idx + 1] ?? handle
      }
    } catch { /* keep as-is */ }
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels")
  url.searchParams.set("part", "snippet")
  url.searchParams.set("key", apiKey)

  if (handle.startsWith("UC")) {
    url.searchParams.set("id", handle)
  } else {
    url.searchParams.set("forHandle", handle.startsWith("@") ? handle : `@${handle}`)
  }

  try {
    const res = await fetch(url.toString())
    const data = await res.json()
    if (!res.ok || !data.items?.length) {
      return NextResponse.json({ valid: false, error: "Channel nicht gefunden." })
    }
    const ch = data.items[0]
    return NextResponse.json({
      valid: true,
      channelId: ch.id,
      title: ch.snippet.title,
      thumbnail: ch.snippet.thumbnails?.default?.url ?? null,
    })
  } catch {
    return NextResponse.json({ valid: false, error: "Fehler bei der Validierung." })
  }
}
