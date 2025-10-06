import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "TMDb Downloader",
  description: "Search and download posters/backdrops from TMDb"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
