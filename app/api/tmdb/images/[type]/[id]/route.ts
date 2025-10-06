import { NextResponse } from "next/server"

const TMDB_API_KEY = process.env.TMDB_API_KEY
const IMG_BASE = "https://image.tmdb.org/t/p/original"
const ALL_LANGS =
  "null,en,fr,es,de,it,ru,ja,zh,ko,pt,hi,ar,pl,sv,da,no,fi,nl,tr,cs,el,he,hu,ro,uk,vi,th,ms,sk,sl,bg,hr,lt,lv,et,fa,id"

export async function GET(_req: Request, { params }: { params: { type: string; id: string } }) {
  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY is not configured" }, { status: 500 })
  }

  const type = params.type === "movie" ? "movie" : params.type === "tv" ? "tv" : null
  const id = Number(params.id)

  if (!type || !id) {
    return NextResponse.json({ error: "Invalid type or id" }, { status: 400 })
  }

  try {
    const detailsUrl =
      type === "movie"
        ? `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`
        : `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}`
    const imagesUrl =
      type === "movie"
        ? `https://api.themoviedb.org/3/movie/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=${ALL_LANGS}`
        : `https://api.themoviedb.org/3/tv/${id}/images?api_key=${TMDB_API_KEY}&include_image_language=${ALL_LANGS}`

    const [detailsRes, imagesRes] = await Promise.all([fetch(detailsUrl), fetch(imagesUrl)])

    if (!detailsRes.ok || !imagesRes.ok) {
      return NextResponse.json({ error: "TMDb images fetch failed" }, { status: 502 })
    }

    const details = await detailsRes.json()
    const images = await imagesRes.json()

    const title = type === "movie" ? details.title : details.name
    const yearStr = type === "movie" ? details.release_date : details.first_air_date
    const year = yearStr ? Number(String(yearStr).slice(0, 4)) : undefined

    const posters = (images.posters || []).map((p: any) => ({
      url: `${IMG_BASE}${p.file_path}`,
      width: p.width as number,
      height: p.height as number,
      language: p.iso_639_1 as string | null,
      voteAverage: p.vote_average as number | undefined,
    }))

    const backdrops = (images.backdrops || []).map((b: any) => ({
      url: `${IMG_BASE}${b.file_path}`,
      width: b.width as number,
      height: b.height as number,
      language: b.iso_639_1 as string | null,
      voteAverage: b.vote_average as number | undefined,
    }))

    return NextResponse.json({ posters, backdrops, title, year, type })
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
