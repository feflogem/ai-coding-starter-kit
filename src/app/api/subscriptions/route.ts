import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"

export async function GET(request: Request) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return NextResponse.json({ error: "YouTube API-Key fehlt" }, { status: 500 })

  // Fetch user's own channel ID from profile
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_channel_id")
    .eq("id", user.id)
    .single()

  const rawChannelInput = profile?.youtube_channel_id?.trim()
  if (!rawChannelInput) {
    return NextResponse.json({ error: "no_channel" }, { status: 404 })
  }

  // Resolve @handle or URL to channel ID
  let channelId = rawChannelInput
  if (!channelId.startsWith("UC")) {
    // Extract handle from URL if needed
    let handle = channelId
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

    if (handle.startsWith("UC")) {
      channelId = handle
    } else {
      // Resolve @handle
      const q = handle.startsWith("@") ? handle : `@${handle}`
      const resolveUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
      resolveUrl.searchParams.set("part", "id")
      resolveUrl.searchParams.set("forHandle", q)
      resolveUrl.searchParams.set("key", apiKey)
      const resolveRes = await fetch(resolveUrl.toString())
      if (!resolveRes.ok) return NextResponse.json({ error: "channel_not_found" }, { status: 404 })
      const resolveData = await resolveRes.json()
      channelId = resolveData.items?.[0]?.id
      if (!channelId) return NextResponse.json({ error: "channel_not_found" }, { status: 404 })
    }
  }

  // Fetch subscriptions (public only)
  const subUrl = new URL("https://www.googleapis.com/youtube/v3/subscriptions")
  subUrl.searchParams.set("part", "snippet")
  subUrl.searchParams.set("channelId", channelId)
  subUrl.searchParams.set("maxResults", "50")
  subUrl.searchParams.set("order", "alphabetical")
  subUrl.searchParams.set("key", apiKey)

  const subRes = await fetch(subUrl.toString())
  const subData = await subRes.json()

  if (subData.error?.code === 403 || !subData.items) {
    return NextResponse.json({ error: "private" }, { status: 403 })
  }

  if (subData.items.length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 404 })
  }

  const channels = (subData.items as Array<{
    snippet: {
      title: string
      resourceId: { channelId: string }
      thumbnails?: { default?: { url: string } }
    }
  }>).map((item) => ({
    channelId: item.snippet.resourceId.channelId,
    name: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.default?.url ?? null,
    subscriberCount: 0,
  }))

  // Batch-fetch subscriber counts
  try {
    const ids = channels.map((c) => c.channelId).join(",")
    const statsUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
    statsUrl.searchParams.set("part", "statistics")
    statsUrl.searchParams.set("id", ids)
    statsUrl.searchParams.set("key", apiKey)
    const statsRes = await fetch(statsUrl.toString())
    if (statsRes.ok) {
      const statsData = await statsRes.json()
      const statsMap: Record<string, number> = {}
      for (const item of statsData.items ?? []) {
        statsMap[item.id] = parseInt(item.statistics?.subscriberCount ?? "0")
      }
      for (const ch of channels) {
        if (statsMap[ch.channelId] !== undefined) ch.subscriberCount = statsMap[ch.channelId]
      }
    }
  } catch { /* subscriber counts are optional */ }

  return NextResponse.json({ channels, total: subData.pageInfo?.totalResults ?? channels.length })
}
