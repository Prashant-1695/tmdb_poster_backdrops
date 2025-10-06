import { TmdbSearch } from "@/components/tmdb-search"

export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-balance">TMDb Posters & Backdrops Downloader</h1>
          <p className="text-muted-foreground mt-2">
            Search for movies or TV shows, pick the correct title by year, and download all posters and backdrops in
            original quality.
          </p>
        </header>
        <TmdbSearch />
        <footer className="mt-16 text-xs text-muted-foreground">
          Uses TMDb but is not endorsed or certified by TMDb.
        </footer>
      </div>
    </main>
  )
}
