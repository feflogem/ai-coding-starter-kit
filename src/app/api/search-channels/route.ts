import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth-server"

export async function GET(req: NextRequest) {
  // Auth check
  const user = await getAuthUser(req)
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert. Bitte einloggen." }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get("q")
  if (!query) return NextResponse.json({ error: "Kein Suchbegriff angegeben" }, { status: 400 })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API-Key nicht konfiguriert" }, { status: 500 })
  }

  let searchData
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=8&key=${apiKey}`
    const searchRes = await fetch(searchUrl)
    searchData = await searchRes.json()
    if (!searchRes.ok) {
      return NextResponse.json({ error: searchData.error?.message ?? "YouTube API Fehler" }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: "Fehler bei der YouTube-Suche" }, { status: 500 })
  }

  const channelIds = searchData.items?.map((i: { id: { channelId: string } }) => i.id.channelId).join(",")
  if (!channelIds) return NextResponse.json({ channels: [] })

  let statsData
  try {
    const statsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${apiKey}`
    const statsRes = await fetch(statsUrl)
    statsData = await statsRes.json()
    if (!statsRes.ok) {
      return NextResponse.json({ error: statsData.error?.message ?? "YouTube API Fehler" }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden der Channel-Details" }, { status: 500 })
  }

  const channels = (statsData.items ?? []).map((ch: {
    id: string
    snippet: { title: string; description: string; thumbnails: { default: { url: string } } }
    statistics: { subscriberCount?: string; videoCount?: string }
  }) => ({
    channelId: ch.id,
    title: ch.snippet.title,
    description: ch.snippet.description?.slice(0, 100),
    thumbnail: ch.snippet.thumbnails?.default?.url,
    subscriberCount: parseInt(ch.statistics.subscriberCount ?? "0"),
    videoCount: parseInt(ch.statistics.videoCount ?? "0"),
  }))

  return NextResponse.json({ channels })
}
