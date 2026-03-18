"use client"

import { useState, useEffect } from "react"
import {
  Link,
  Loader2,
  AlertCircle,
  Check,
  ExternalLink,
  Trash2,
  ArrowRight,
} from "lucide-react"
import {
  parseDeckUrl,
  fetchDeckDetail,
  convertToDeckList,
} from "@/lib/limitless"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useProxyList } from "@/stores/proxy-list"
import { LoadConfirmDialog } from "./load-confirm-dialog"

interface DeckUrlImportProps {
  onPopulateText: (text: string, source: string) => void
}

// Recent URLs storage
const RECENT_URLS_KEY = "proxymon-recent-deck-urls"
const MAX_RECENT_URLS = 5

interface RecentUrl {
  url: string
  name: string
  image?: string
  timestamp: number
}

function getRecentUrls(): RecentUrl[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(RECENT_URLS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentUrl(url: string, name: string, image?: string) {
  if (typeof window === "undefined") return
  try {
    const recent = getRecentUrls()
    const filtered = recent.filter((r) => r.url !== url)
    const updated = [
      { url, name, image, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_URLS)
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

function removeRecentUrl(url: string) {
  if (typeof window === "undefined") return
  try {
    const recent = getRecentUrls()
    const updated = recent.filter((r) => r.url !== url)
    localStorage.setItem(RECENT_URLS_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

export function DeckUrlImport({ onPopulateText }: DeckUrlImportProps) {
  const [url, setUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{
    type: "error" | "success" | "info" | null
    message: string
  }>({ type: null, message: "" })
  const [recentUrls, setRecentUrls] = useState<RecentUrl[]>(() =>
    getRecentUrls()
  )
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingDeckData, setPendingDeckData] = useState<{
    text: string
    name: string
  } | null>(null)

  const existingCards = useProxyList((state) => state.items)
  const clearList = useProxyList((state) => state.clearList)
  const totalExistingCards = existingCards.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const processImport = async (
    deckId: number,
    deckName: string,
    shouldClear: boolean,
    variant?: number
  ) => {
    setIsLoading(true)
    setStatus({ type: "info", message: "Fetching deck information..." })

    try {
      const detail = await fetchDeckDetail(deckId, variant)

      if (!detail || !detail.cards || detail.cards.length === 0) {
        setStatus({
          type: "error",
          message:
            "Could not load deck cards. The deck may be empty or unavailable.",
        })
        setIsLoading(false)
        return
      }

      // Clear existing if user chose to overwrite
      if (shouldClear) {
        clearList()
      }

      // Convert to deck list format
      const deckListText = convertToDeckList(detail.cards)
      const cardCount = detail.cards.reduce((sum, c) => sum + c.quantity, 0)

      // Add to recent URLs
      addRecentUrl(url, detail.name, detail.image)
      setRecentUrls(getRecentUrls())

      setStatus({
        type: "success",
        message: `Found ${cardCount} cards! Switching to Deck List tab...`,
      })

      // Populate the text area and switch tabs (with a small delay so user sees the success message)
      setTimeout(() => {
        onPopulateText(deckListText, `URL: ${detail.name}`)
        setUrl("")
        setStatus({ type: null, message: "" })
      }, 800)
    } catch (err) {
      setStatus({
        type: "error",
        message: "Failed to import deck. Please check the URL and try again.",
      })
      console.error(err)
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!url.trim()) {
      setStatus({ type: "error", message: "Please enter a URL" })
      return
    }

    const parsed = parseDeckUrl(url)
    if (!parsed) {
      setStatus({
        type: "error",
        message:
          "Invalid Limitless TCG URL. Expected format: limitlesstcg.com/decks/123",
      })
      return
    }

    const { deckId, variant } = parsed

    // Check if there are existing cards
    if (totalExistingCards > 0) {
      // Need to fetch deck name for the dialog
      setIsLoading(true)
      try {
        const detail = await fetchDeckDetail(deckId, variant)
        if (detail) {
          const deckListText = convertToDeckList(detail.cards)
          setPendingDeckData({
            text: deckListText,
            name: detail.name,
          })
          setShowConfirmDialog(true)
          setIsLoading(false)
          return
        }
      } catch {
        // If fetch fails, proceed without confirmation
      }
      setIsLoading(false)
    }

    // No existing cards or fetch failed, import directly
    await processImport(deckId, "", false, variant)
  }

  const handleConfirmOverwrite = () => {
    const parsed = parseDeckUrl(url)
    if (parsed && pendingDeckData) {
      processImport(parsed.deckId, pendingDeckData.name, true, parsed.variant)
      setShowConfirmDialog(false)
      setPendingDeckData(null)
    }
  }

  const handleConfirmAdd = () => {
    const parsed = parseDeckUrl(url)
    if (parsed && pendingDeckData) {
      processImport(parsed.deckId, pendingDeckData.name, false, parsed.variant)
      setShowConfirmDialog(false)
      setPendingDeckData(null)
    }
  }

  const handleRecentClick = (recentUrl: string) => {
    setUrl(recentUrl)
  }

  const handleRemoveRecent = (e: React.MouseEvent, urlToRemove: string) => {
    e.stopPropagation()
    removeRecentUrl(urlToRemove)
    setRecentUrls(getRecentUrls())
  }

  const exampleUrls = [
    "https://limitlesstcg.com/decks/284/cards",
    "https://limitlesstcg.com/decks/1/cards",
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 p-4">
        <h2 className="font-semibold text-slate-100">Import from URL</h2>
        <p className="mt-1 text-xs text-slate-500">
          Paste a Limitless TCG deck URL to load into the editor
        </p>
      </div>

      {/* Input Area */}
      <div className="flex-1 space-y-4 overflow-auto p-4">
        {/* URL Input */}
        <div className="space-y-2">
          <div className="relative">
            <Link className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="https://limitlesstcg.com/decks/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleImport()}
              className="border-slate-700 bg-slate-900/50 pl-10 text-sm text-slate-100 placeholder:text-slate-600"
              disabled={isLoading}
            />
          </div>

          {/* Status Message */}
          {status.type && (
            <div
              className={cn(
                "rounded-md px-3 py-2 text-xs",
                status.type === "error" && "bg-red-900/30 text-red-400",
                status.type === "success" && "bg-green-900/30 text-green-400",
                status.type === "info" && "bg-blue-900/30 text-blue-400"
              )}
            >
              <div className="flex items-center gap-2">
                {status.type === "error" && (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
                {status.type === "success" && <Check className="h-3.5 w-3.5" />}
                {status.type === "info" && isLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {status.message}
              </div>
            </div>
          )}

          <Button
            className="w-full bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleImport}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Deck...
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Load into Editor
              </>
            )}
          </Button>
        </div>

        {/* Supported Formats */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
          <h3 className="mb-2 text-xs font-medium text-slate-400">
            Supported URL formats:
          </h3>
          <ul className="space-y-1 text-[10px] text-slate-500">
            <li className="font-mono">limitlesstcg.com/decks/1</li>
            <li className="font-mono">limitlesstcg.com/decks/1/cards</li>
            <li className="font-mono">
              limitlesstcg.com/decks/1/cards?variant=1
            </li>
          </ul>
        </div>

        {/* Recent Imports */}
        {recentUrls.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-400">
              Recent Imports
            </h3>
            <div className="space-y-2">
              {recentUrls.map((recent) => (
                <div
                  key={recent.url}
                  onClick={() => handleRecentClick(recent.url)}
                  className="group flex cursor-pointer items-center gap-3 rounded-md border border-slate-800 bg-slate-900/30 p-2 hover:border-slate-700 hover:bg-slate-800/50"
                >
                  {/* Deck Image */}
                  {recent.image && (
                    <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-800">
                      <img
                        src={recent.image}
                        alt={recent.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          // Hide image if it fails to load
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    </div>
                  )}

                  {/* Text Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-300">
                      {recent.name}
                    </p>
                    <p className="truncate text-[10px] text-slate-600">
                      {recent.url}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleRemoveRecent(e, recent.url)}
                  >
                    <Trash2 className="h-3 w-3 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-slate-400">Examples</h3>
          <div className="space-y-1">
            {exampleUrls.map((exampleUrl) => (
              <button
                key={exampleUrl}
                onClick={() => setUrl(exampleUrl)}
                className="w-full truncate rounded-md border border-slate-800 bg-slate-900/30 px-3 py-2 text-left text-[10px] text-slate-500 transition-colors hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-400"
              >
                {exampleUrl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <p className="text-center text-[10px] text-slate-600">
          Cards will be loaded into the Deck List tab for review
        </p>
      </div>

      {/* Load Confirm Dialog */}
      <LoadConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false)
          setPendingDeckData(null)
        }}
        onOverwrite={handleConfirmOverwrite}
        onAddToExisting={handleConfirmAdd}
        existingCardCount={totalExistingCards}
        newDeckName={pendingDeckData?.name || ""}
      />
    </div>
  )
}
