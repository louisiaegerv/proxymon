"use client"

import { useState, useCallback } from "react"
import { FileText, Trophy, Link, Plus, Trash2, Loader2 } from "lucide-react"
import { parseDeckList, resolveDeckCards } from "@/lib/deck-parser"
import { useProxyList } from "@/stores/proxy-list"
import { getProcessedCardImage } from "@/lib/tcgdex"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { MetaDeckSelector } from "./meta-deck-selector"
import { DeckUrlImport } from "./deck-url-import"

interface DeckSidebarProps {
  variant?: "desktop" | "mobile"
}

export function DeckSidebar({ variant = "desktop" }: DeckSidebarProps) {
  const isMobile = variant === "mobile"

  const [activeTab, setActiveTab] = useState("decklist")
  const [deckText, setDeckText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearDeckListToo, setClearDeckListToo] = useState(false)
  const [lastImportedSource, setLastImportedSource] = useState<string>("")

  const addItem = useProxyList((state) => state.addItem)
  const clearList = useProxyList((state) => state.clearList)
  const items = useProxyList((state) => state.items)
  const totalCards = useProxyList((state) => state.getTotalCards)()

  const handleProcessDeck = async () => {
    if (!deckText.trim()) return

    setIsProcessing(true)
    setParseErrors([])
    setProcessingStatus("Parsing deck list...")

    // Parse the deck list
    const parsedItems = parseDeckList(deckText)

    if (parsedItems.length === 0) {
      setParseErrors(["No valid cards found in deck list"])
      setIsProcessing(false)
      return
    }

    setProcessingStatus(
      `Found ${parsedItems.length} unique cards, searching...`
    )

    // Resolve cards against TCGdex
    const results = await resolveDeckCards(parsedItems)

    const errors: string[] = []
    let addedCount = 0

    // Process each unique card
    for (const result of results) {
      if (result.card) {
        setProcessingStatus(`Processing ${result.card.name}...`)

        // Process image to stretch corners (mandatory preprocessing)
        const processedImage = await getProcessedCardImage(
          result.card.image,
          "high"
        )

        // Add the card with the specified quantity (single call)
        addItem(
          {
            cardId: result.card.id,
            name: result.card.name,
            image: processedImage,
            originalImage: result.card.image,
            setName: result.card.set?.name || "Unknown",
            setId: result.card.set?.id || "",
            localId: result.card.localId,
          },
          result.item.quantity
        )

        addedCount += result.item.quantity
      } else {
        errors.push(`${result.item.cardName}: ${result.error || "Not found"}`)
      }
    }

    setParseErrors(errors)
    setProcessingStatus(`Added ${addedCount} cards`)
    setIsProcessing(false)
    if (errors.length === 0 && addedCount > 0) {
      setDeckText("")
    }

    // Clear status after 3 seconds
    setTimeout(() => setProcessingStatus(""), 3000)
  }

  const handleClearClick = () => {
    if (items.length === 0 && !deckText.trim()) {
      // Nothing to clear
      return
    }
    setClearDeckListToo(false) // Reset checkbox
    setShowClearDialog(true)
  }

  const handleClearConfirm = () => {
    clearList()
    if (clearDeckListToo) {
      setDeckText("")
      setParseErrors([])
      setProcessingStatus("")
      setLastImportedSource("")
    }
    setShowClearDialog(false)
  }

  // Called when Meta Decks or URL Import wants to populate the textarea
  const handlePopulateText = useCallback((text: string, source: string) => {
    setDeckText(text)
    setLastImportedSource(source)
    setParseErrors([])
    setProcessingStatus("")
    // Switch to decklist tab so user can review/edit
    setActiveTab("decklist")
  }, [])

  const sampleDeck = `4 Charmander OBF 26
3 Charmeleon OBF 27
3 Charizard ex OBF 125
4 Arcanine ex OBF 224
2 Bidoof CRZ 111
2 Bibarel CRZ 112
2 Pidgey MEW 16
2 Pidgeotto MEW 17
2 Pidgeot ex OBF 164
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
3 Boss's Orders PAL 172
3 Iono PAL 185
4 Nest Ball SVI 181`

  return (
    <div className={cn("flex h-full flex-col", isMobile && "bg-slate-950")}>
      {/* Mobile Header - Outside Tabs */}
      {isMobile && (
        <div className="flex-shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-100">Deck</h1>
              <p className="text-xs text-slate-500">
                {items.length > 0
                  ? `${totalCards} cards in preview`
                  : "Add cards to get started"}
              </p>
            </div>
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearClick}
                className="h-8 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={cn(
          "flex h-full flex-col",
          isMobile && "flex-1 overflow-hidden"
        )}
      >
        {/* Tab Navigation */}
        <div
          className={cn(
            "border-b border-slate-800 px-4 py-2",
            isMobile && "flex-shrink-0"
          )}
        >
          <TabsList
            className={cn(
              "grid w-full grid-cols-3 bg-slate-800/50",
              !isMobile &&
                "text-xl [&_svg]:h-3.5 [&_svg]:w-3.5 [&>button]:flex [&>button]:items-center [&>button]:gap-2",
              isMobile && "h-10"
            )}
          >
            <TabsTrigger
              value="decklist"
              className={cn(
                "data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100",
                !isMobile && "text-sm",
                isMobile && "text-xs"
              )}
            >
              <FileText
                className={cn("mr-1", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")}
              />
              <span>List</span>
            </TabsTrigger>
            <TabsTrigger
              value="meta"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
            >
              <Trophy
                className={cn("mr-1", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")}
              />
              <span>Meta</span>
            </TabsTrigger>
            <TabsTrigger
              value="url"
              className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
            >
              <Link
                className={cn("mr-1", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")}
              />
              <span>URL</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className={cn("flex-1 overflow-hidden", isMobile && "flex-1")}>
          {/* Deck List Tab */}
          <TabsContent
            value="decklist"
            className={cn("mt-0 h-full", isMobile && "flex h-full flex-col")}
          >
            <div className={cn("flex h-full flex-col", isMobile && "flex-1")}>
              {/* Desktop Header - Inside Tab */}
              {!isMobile && (
                <div className="border-b border-slate-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-100">
                        Deck List
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Review and edit cards before adding
                      </p>
                    </div>
                    {lastImportedSource && (
                      <span className="rounded-full bg-blue-900/30 px-2 py-1 text-[10px] text-blue-400">
                        From: {lastImportedSource}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div
                className={cn("flex-1", isMobile ? "overflow-auto p-4" : "p-4")}
              >
                <Textarea
                  value={deckText}
                  onChange={(e) => setDeckText(e.target.value)}
                  placeholder={`Enter cards manually or import from Meta Decks / URL...\n\nExamples:\n4 Charmander OBF 26\n3 Charizard ex OBF 125\nBoss's Orders PAL 172  (defaults to 1)\nMew ex`}
                  className={cn(
                    "h-full resize-none border-slate-700 bg-slate-900/50 font-mono text-sm text-slate-100 placeholder:text-slate-600",
                    isMobile ? "min-h-[300px]" : "min-h-[200px]"
                  )}
                  disabled={isProcessing}
                />
              </div>

              {/* Status & Errors */}
              {(processingStatus || parseErrors.length > 0) && (
                <div
                  className={cn(
                    isMobile ? "space-y-2 px-4 pb-2" : "px-4 pb-2 text-xs"
                  )}
                >
                  {processingStatus && (
                    <div
                      className={cn(
                        isMobile
                          ? "rounded-lg px-3 py-2 text-sm"
                          : "rounded px-3 py-2",
                        isProcessing
                          ? "bg-blue-900/30 text-blue-400"
                          : "bg-green-900/30 text-green-400"
                      )}
                    >
                      {isProcessing && (
                        <Loader2
                          className={cn(
                            "mr-2 inline animate-spin",
                            isMobile ? "h-4 w-4" : "h-3 w-3"
                          )}
                        />
                      )}
                      {processingStatus}
                    </div>
                  )}
                  {parseErrors.length > 0 && (
                    <div
                      className={cn(
                        "overflow-auto rounded bg-red-900/30 px-3 py-2 text-red-400",
                        isMobile ? "max-h-32 text-xs" : "mt-2 max-h-24"
                      )}
                    >
                      <div className="mb-1 font-semibold">
                        {isMobile ? "Issues:" : "Issues found:"}
                      </div>
                      {parseErrors.map((err, i) => (
                        <div key={i} className="truncate">
                          {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div
                className={cn(
                  "space-y-2 border-t border-slate-800 p-4",
                  isMobile && "flex-shrink-0 space-y-3 bg-slate-900/50"
                )}
              >
                <Button
                  className={cn(
                    "w-full bg-blue-600 text-white hover:bg-blue-500",
                    isMobile && "h-12 text-base"
                  )}
                  onClick={handleProcessDeck}
                  disabled={isProcessing || !deckText.trim()}
                >
                  {isProcessing ? (
                    <>
                      <Loader2
                        className={cn(
                          "mr-2 animate-spin",
                          isMobile ? "h-5 w-5" : "h-4 w-4"
                        )}
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus
                        className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")}
                      />
                      Add to Proxy List
                    </>
                  )}
                </Button>

                <div
                  className={cn("flex gap-2", !isMobile && "[&>button]:flex-1")}
                >
                  <Button
                    variant="outline"
                    className={cn(
                      "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                      isMobile ? "h-10 flex-1" : "flex-1"
                    )}
                    onClick={() => {
                      setDeckText(sampleDeck)
                      setLastImportedSource("Sample")
                    }}
                    disabled={isProcessing}
                  >
                    Load Sample
                  </Button>
                  {/* Desktop: Clear button in footer */}
                  {!isMobile && (
                    <Button
                      variant="outline"
                      className="flex-1 border-slate-700 text-red-400 hover:bg-red-950 hover:text-red-300"
                      onClick={handleClearClick}
                      disabled={isProcessing && items.length === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Meta Decks Tab */}
          <TabsContent value="meta" className="mt-0 h-full">
            <MetaDeckSelector onPopulateText={handlePopulateText} />
          </TabsContent>

          {/* Import URL Tab */}
          <TabsContent value="url" className="mt-0 h-full">
            <DeckUrlImport onPopulateText={handlePopulateText} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Clear Cards</DialogTitle>
            <DialogDescription className="text-slate-400">
              {isMobile
                ? "Choose what you want to clear."
                : "Choose what you want to clear. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "py-4",
              !isMobile &&
                "space-y-4 [&>*]:rounded-lg [&>*]:border [&>*]:border-slate-800 [&>*]:bg-slate-900/50 [&>*]:px-4 [&>*]:py-3"
            )}
          >
            {/* Desktop: Preview info */}
            {!isMobile && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Print Preview
                  </p>
                  <p className="text-xs text-slate-500">
                    {items.length > 0 ? `${totalCards} cards` : "Empty"}
                  </p>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded border border-green-500 bg-green-500/20">
                  <span className="text-xs text-green-400">✓</span>
                </div>
              </div>
            )}

            {/* Deck list option */}
            <button
              type="button"
              onClick={() => setClearDeckListToo(!clearDeckListToo)}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between text-left transition-colors",
                !isMobile && "hover:border-slate-700 hover:bg-slate-800/50",
                isMobile &&
                  cn(
                    "rounded-lg border px-4 py-3",
                    clearDeckListToo
                      ? "border-green-500 bg-green-500/10"
                      : "border-slate-800 bg-slate-900/50"
                  )
              )}
            >
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {isMobile ? "Also clear deck text" : "Also clear Deck List"}
                </p>
                <p className="text-xs text-slate-500">
                  {deckText.trim()
                    ? "Your imported/pasted deck text"
                    : "Text area is empty"}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border",
                  clearDeckListToo
                    ? "border-green-500 bg-green-500/20"
                    : "border-slate-600 bg-slate-800"
                )}
              >
                {clearDeckListToo && (
                  <span className="text-xs text-green-400">✓</span>
                )}
              </div>
            </button>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowClearDialog(false)}
              className={cn(
                "text-slate-400",
                !isMobile && "hover:bg-slate-800 hover:text-slate-100",
                isMobile && "flex-1"
              )}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearConfirm}
              className={cn(
                "bg-red-600",
                !isMobile && "text-white hover:bg-red-700",
                isMobile && "flex-1"
              )}
            >
              {isMobile
                ? "Clear"
                : clearDeckListToo
                  ? "Clear All"
                  : "Clear Preview Only"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
