import { NextResponse } from "next/server"

const ALLOWED_HOST = "image.tmdb.org"

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string }
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 })
    }

    if (parsed.hostname !== ALLOWED_HOST) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
    }

    const upstream = await fetch(parsed.toString(), { cache: "no-store" })
    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 })
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream"
    const arrayBuffer = await upstream.arrayBuffer()
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
