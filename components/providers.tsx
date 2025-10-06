"use client"

import { NextUIProvider } from "@nextui-org/react"
import { type ReactNode, useEffect } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // Force dark mode class on documentElement for AMOLED theme
  useEffect(() => {
    if (!document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.add("dark")
    }
  }, [])

  return <NextUIProvider>{children}</NextUIProvider>
}
