"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Input,
  Kbd,
  Link,
  ScrollShadow,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react"
import JSZip from "jszip"
import saveAs from "file-saver"

type SearchItem = {
  id: number
  type: "movie" | "tv"
  title: string
  year?: number
  overview?: string
}

type ImageInfo = {
  url: string
  thumbUrl: string
  width: number
  height: number
  language: string | null
  voteAverage?: number
}

type ImagesPayload = {
  posters: ImageInfo[]
  backdrops: ImageInfo[]
  title?: string
  year?: number
  type?: "movie" | "tv"
}

const Thumbnail = ({
  src,
  alt,
  ratio,
}: {
  src: string
  alt: string
  ratio: "2/3" | "16/9"
}) => {
  return (
    <div
      className={
        ratio === "2/3"
          ? "relative w-full aspect-[2/3] overflow-hidden rounded-md bg-white/5"
          : "relative w-full aspect-[16/9] overflow-hidden rounded-md bg-white/5"
      }
    >
      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        crossOrigin="anonymous"
        loading="lazy"
      />
    </div>
  )
}

export function TmdbSearch() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchItem[]>([])
  const [selected, setSelected] = useState<SearchItem | null>(null)
  const [images, setImages] = useState<ImagesPayload | null>(null)
  const [imgLoading, setImgLoading] = useState(false)
  const [zipLoading, setZipLoading] = useState<"posters" | "backdrops" | "all" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ kind: "posters" | "backdrops"; image: ImageInfo } | null>(null)
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  const canSearch = query.trim().length > 0

  const handleSearch = useCallback(async () => {
    if (!canSearch) return
    setLoading(true)
    setError(null)
    setResults([])
    setSelected(null)
    setImages(null)
    try {
      const res = await fetch("/api/tmdb/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      })
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`)
      }
      const data = (await res.json()) as { results: SearchItem[] }
      setResults(data.results)
    } catch (e: any) {
      setError(e.message || "Something went wrong while searching.")
    } finally {
      setLoading(false)
    }
  }, [query, canSearch])

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const ay = a.year ?? 0
      const by = b.year ?? 0
      return by - ay
    })
  }, [results])

  const selectItem = useCallback(async (item: SearchItem) => {
    setSelected(item)
    setImages(null)
    setImgLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tmdb/images/${item.type}/${item.id}`)
      if (!res.ok) throw new Error(`Failed to fetch images (${res.status})`)
      const data = (await res.json()) as ImagesPayload
      setImages(data)
    } catch (e: any) {
      setError(e.message || "Could not load images for the selected title.")
    } finally {
      setImgLoading(false)
    }
  }, [])

  const sanitize = (s: string) =>
    s
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 80)

  async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer | null> {
    try {
      const r = await fetch("/api/proxy-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      if (!r.ok) return null
      const ab = await r.arrayBuffer()
      return ab
    } catch {
      return null
    }
  }

  const downloadOne = useCallback(
    async (img: ImageInfo, idx: number, kind: "posters" | "backdrops") => {
      if (!selected) return
      const ab = await fetchAsArrayBuffer(img.url)
      if (!ab) return
      const ext = img.url.split(".").pop() || "jpg"
      const baseName = sanitize(`${selected.title}${selected.year ? "_" + selected.year : ""}_${selected.type}`)
      const fname = `${baseName}_${kind}_${String(idx + 1).padStart(3, "0")}_${img.width}x${img.height}.${ext.split("?")[0]}`
      const blob = new Blob([ab], { type: "application/octet-stream" })
      saveAs(blob, fname)
    },
    [selected],
  )

  const openPreview = useCallback(
    (img: ImageInfo, kind: "posters" | "backdrops") => {
      setPreview({ kind, image: img })
      onOpen()
    },
    [onOpen],
  )

  const downloadZip = useCallback(
    async (kind: "posters" | "backdrops" | "all") => {
      if (!images || !selected) return
      setZipLoading(kind)
      try {
        const zip = new JSZip()
        const baseName = sanitize(`${selected.title}${selected.year ? "_" + selected.year : ""}_${selected.type}`)
        const addSet = async (name: "posters" | "backdrops", list: ImageInfo[]) => {
          const folder = zip.folder(`${baseName}/${name}`)
          if (!folder) return
          await Promise.all(
            list.map(async (img, idx) => {
              const ab = await fetchAsArrayBuffer(img.url)
              if (ab) {
                const ext = img.url.split(".").pop() || "jpg"
                const fname = `${String(idx + 1).padStart(3, "0")}_${img.width}x${img.height}.${ext.split("?")[0]}`
                folder.file(fname, ab)
              }
            }),
          )
        }

        if (kind === "posters" || kind === "all") {
          await addSet("posters", images.posters)
        }
        if (kind === "backdrops" || kind === "all") {
          await addSet("backdrops", images.backdrops)
        }

        const content = await zip.generateAsync({ type: "blob" })
        saveAs(content, `${baseName}_${kind}.zip`)
      } finally {
        setZipLoading(null)
      }
    },
    [images, selected],
  )

  return (
    <div className="space-y-8">
      <Card className="bg-black/80 border border-white/10">
        <CardHeader className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Search TMDb</h2>
            <p className="text-sm text-muted-foreground">
              Enter a movie or TV show name. Results are sorted by year (desc).
            </p>
          </div>
          <Chip variant="flat" className="bg-white/5 text-white">
            AMOLED Mode
          </Chip>
        </CardHeader>
        <Divider className="bg-white/10" />
        <CardBody className="flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canSearch) handleSearch()
            }}
            className="flex flex-col md:flex-row items-stretch md:items-end gap-3"
          >
            <Input
              label="Title"
              labelPlacement="outside"
              value={query}
              onValueChange={setQuery}
              placeholder="e.g. Dune, Avatar, The Office"
              size="lg"
              className="flex-1"
              classNames={{
                inputWrapper: "bg-white/5 data-[hover=true]:bg-white/10",
                input: "text-white placeholder:text-white/50",
                label: "text-white mb-1",
              }}
              endContent={
                <Kbd keys={["enter"]} className="bg-white/10 text-white/80">
                  Enter
                </Kbd>
              }
            />
            <Button
              type="submit"
              color="primary"
              size="lg"
              className="btn-gradient btn-gradient-primary shrink-0"
              isDisabled={!canSearch || loading}
            >
              {loading ? <Spinner size="sm" color="default" /> : "Search"}
            </Button>
          </form>
          {error && (
            <p className="text-danger-500 text-sm" role="alert">
              {error}
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-2 bg-black/80 border border-white/10">
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Results</h3>
            <Chip variant="flat" className="bg-white/5 text-white">
              {sorted.length}
            </Chip>
          </CardHeader>
          <Divider className="bg-white/10" />
          <CardBody className="p-0">
            <ScrollShadow className="max-h-[28rem] p-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" color="default" />
                </div>
              ) : sorted.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-4">No results yet. Try searching for a title.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {sorted.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        className="w-full text-left px-3 py-3 hover:bg-white/5 focus:bg-white/10 transition rounded-md"
                        onClick={() => selectItem(item)}
                        aria-label={`Select ${item.title} ${item.year ?? ""} ${item.type.toUpperCase()}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.title}</span>
                              <Chip size="sm" className="bg-white/10 text-white/80">
                                {item.type.toUpperCase()}
                              </Chip>
                            </div>
                            <p className="text-xs text-white/60 mt-1 line-clamp-2">
                              {item.overview || "No overview available."}
                            </p>
                          </div>
                          <span className="text-sm opacity-80">{item.year ?? "—"}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollShadow>
          </CardBody>
        </Card>

        <Card className="md:col-span-3 bg-black/80 border border-white/10">
          <CardHeader className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Images</h3>
              {selected ? (
                <p className="text-sm text-white/70">
                  {selected.title} {selected.year ? `(${selected.year})` : ""} • {selected.type.toUpperCase()}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Select a result to load images</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="btn-gradient btn-gradient-warm"
                isDisabled={!images || zipLoading !== null}
                onPress={() => downloadZip("posters")}
              >
                {zipLoading === "posters" ? <Spinner size="sm" color="default" /> : "Download Posters"}
              </Button>
              <Button
                size="sm"
                className="btn-gradient btn-gradient-accent"
                isDisabled={!images || zipLoading !== null}
                onPress={() => downloadZip("backdrops")}
              >
                {zipLoading === "backdrops" ? <Spinner size="sm" color="default" /> : "Download Backdrops"}
              </Button>
              <Button
                size="sm"
                color="primary"
                className="btn-gradient btn-gradient-primary"
                isDisabled={!images || zipLoading !== null}
                onPress={() => downloadZip("all")}
              >
                {zipLoading === "all" ? <Spinner size="sm" color="default" /> : "Download All"}
              </Button>
            </div>
          </CardHeader>
          <Divider className="bg-white/10" />
          <CardBody>
            {imgLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" color="default" />
              </div>
            ) : !images ? (
              <p className="text-sm text-muted-foreground">No images to show.</p>
            ) : (
              <div className="space-y-8">
                <section>
                  <h4 className="text-base font-medium mb-3">Posters ({images.posters.length})</h4>
                  {images.posters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No posters found.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.posters.map((img, idx) => (
                        <figure key={`poster-${idx}`} className="group">
                          <button
                            className="block w-full focus:outline-none"
                            onClick={() => openPreview(img, "posters")}
                            aria-label="Preview poster"
                          >
                            <Thumbnail
                              src={img.thumbUrl}
                              alt={`Poster ${idx + 1} for ${selected?.title || "title"}`}
                              ratio="2/3"
                            />
                          </button>
                          <figcaption className="mt-1 text-xs text-white/70 flex items-center justify-between gap-2">
                            <span className="truncate">
                              {img.width}x{img.height} • {img.language ?? "—"}
                            </span>
                            <Button
                              size="sm"
                              className="btn-gradient btn-gradient-primary"
                              onPress={() => downloadOne(img, idx, "posters")}
                            >
                              Download
                            </Button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-base font-medium mb-3">Backdrops ({images.backdrops.length})</h4>
                  {images.backdrops.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No backdrops found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {images.backdrops.map((img, idx) => (
                        <figure key={`backdrop-${idx}`} className="group">
                          <button
                            className="block w-full focus:outline-none"
                            onClick={() => openPreview(img, "backdrops")}
                            aria-label="Preview backdrop"
                          >
                            <Thumbnail
                              src={img.thumbUrl}
                              alt={`Backdrop ${idx + 1} for ${selected?.title || "title"}`}
                              ratio="16/9"
                            />
                          </button>
                          <figcaption className="mt-1 text-xs text-white/70 flex items-center justify-between gap-2">
                            <span className="truncate">
                              {img.width}x{img.height} • {img.language ?? "—"}
                            </span>
                            <Button
                              size="sm"
                              className="btn-gradient btn-gradient-primary"
                              onPress={() => downloadOne(img, idx, "backdrops")}
                            >
                              Download
                            </Button>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="5xl" backdrop="opaque" className="bg-black">
        <ModalContent>
          {(close) => (
            <>
              <ModalHeader className="text-white">
                {preview ? (
                  <>
                    {selected?.title} {selected?.year ? `(${selected.year})` : ""} • {preview.kind.slice(0, -1)} •{" "}
                    {preview.image.width}x{preview.image.height} • {preview.image.language ?? "—"}
                  </>
                ) : (
                  "Preview"
                )}
              </ModalHeader>
              <ModalBody className="p-0">
                {preview && (
                  <div className="w-full flex items-center justify-center bg-black">
                    <img
                      src={preview.image.url || "/placeholder.svg"}
                      alt="Preview image"
                      className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                      crossOrigin="anonymous"
                      loading="eager"
                    />
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                {preview && (
                  <div className="flex items-center gap-2">
                    <Button
                      className="btn-gradient btn-gradient-primary"
                      onPress={() => downloadOne(preview.image, 0, preview.kind)}
                    >
                      Download
                    </Button>
                    <Link
                      href={preview.image.url}
                      className="text-white/90 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open original
                    </Link>
                  </div>
                )}
                <Button variant="flat" className="btn-gradient btn-gradient-accent" onPress={close}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
