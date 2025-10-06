import { NextResponse } from "next/server"

const TMDB_API_KEY = process.env.TMDB_API_KEY

export async function POST(req: Request) {
  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY is not configured" }, { status: 500 })
  }

  try {
    const { query } = await req.json()
    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }
    const q = encodeURIComponent(query.trim())

    const [movieRes, tvRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${q}&include_adult=false`),
      fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${q}&include_adult=false`),
    ])

    if (!movieRes.ok || !tvRes.ok) {
      return NextResponse.json({ error: "TMDb search failed" }, { status: 502 })
    }

    const movieData = await movieRes.json()
    const tvData = await tvRes.json()

    const movies = (movieData.results || []).map((m: any) => ({
      id: m.id as number,
      type: "movie" as const,
      title: m.title as string,
      year: m.release_date ? Number(String(m.release_date).slice(0, 4)) : undefined,
      overview: m.overview as string | undefined,
    }))

    const tv = (tvData.results || []).map((t: any) => ({
      id: t.id as number,
      type: "tv" as const,
      title: t.name as string,
      year: t.first_air_date ? Number(String(t.first_air_date).slice(0, 4)) : undefined,
      overview: t.overview as string | undefined,
    }))

    const results = [...movies, ...tv].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
