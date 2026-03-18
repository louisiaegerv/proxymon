"use client"

import { useState, useEffect } from "react"
import { DeckSidebar } from "@/components/deck/deck-sidebar"
import { LivePreview } from "@/components/proxy/live-preview"
import { SettingsSidebar } from "@/components/proxy/settings-sidebar"
import { MobileLayout } from "@/components/mobile/mobile-layout"
import { MobileSettings } from "@/components/mobile/mobile-settings"
import { MobilePreview } from "@/components/mobile/mobile-preview"

export default function Home() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  // Detect mobile viewport on client
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Show nothing during SSR/hydration to prevent mismatch
  if (isMobile === null) {
    return (
      <div className="flex h-dvh flex-col bg-slate-950">
        {/* Loading state - matches desktop structure */}
        <header className="hidden h-14 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <h1 className="text-lg font-bold text-slate-100">Proxymon</h1>
          </div>
        </header>
        <main className="flex flex-1 overflow-hidden">
          <div className="hidden flex-1 lg:flex">
            <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/30" />
            <div className="flex-1 bg-slate-950 p-6" />
            <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/30" />
          </div>
        </main>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex h-dvh flex-col bg-slate-950">
        <MobileLayout
          deckSection={<DeckSidebar variant="mobile" />}
          previewSection={<MobilePreview />}
          settingsSection={<MobileSettings />}
        />
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <span className="text-sm font-bold text-white">P</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Proxymon</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            Add cards to generate proxies
          </span>
        </div>
      </header>

      {/* Main Content - 3 Column Layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left: Deck Input Tabs */}
        <div className="w-80 flex-shrink-0 border-r border-slate-800 bg-slate-900/30">
          <DeckSidebar />
        </div>

        {/* Center: Live Preview */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6">
          <LivePreview />
        </div>

        {/* Right: Settings & Details */}
        <div className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/30">
          <SettingsSidebar />
        </div>
      </main>
    </div>
  )
}
