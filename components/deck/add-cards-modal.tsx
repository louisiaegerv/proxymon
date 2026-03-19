"use client"

import { useState, useCallback } from "react"
import { FileText, Trophy, Link, Plus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MetaDeckSelector } from "./meta-deck-selector"
import { DeckUrlImport } from "./deck-url-import"
import { LoadConfirmDialog } from "./load-confirm-dialog"
import { useProxyList } from "@/stores/proxy-list"
import { parseDeckList, type DeckListItem } from "@/lib/deck-parser"

interface AddCardsModalProps {
  isOpen: boolean
  onClose: () => void
  onAddCards: (items: DeckListItem[]) => void
}

type AddMethod = "text" | "meta" | "url"

interface MethodOption {
  value: AddMethod
  label: string
  icon: React.ElementType
  description: string
}

const methods: MethodOption[] = [
  {
    value: "text",
    label: "Type / Paste",
    icon: FileText,
    description: "Enter cards manually or paste a deck list",
  },
  {
    value: "meta",
    label: "Meta Decks",
    icon: Trophy,
    description: "Import from top tournament decks",
  },
  {
    value: "url",
    label: "URL Import",
    icon: Link,
    description: "Import from Limitless TCG URL",
  },
]

export function AddCardsModal({
  isOpen,
  onClose,
  onAddCards,
}: AddCardsModalProps) {
  const [activeMethod, setActiveMethod] = useState<AddMethod>("text")
  const [textInput, setTextInput] = useState("")
  const [pendingItems, setPendingItems] = useState<DeckListItem[] | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importSource, setImportSource] = useState<string>("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const existingItems = useProxyList((state) => state.items)
  const clearList = useProxyList((state) => state.clearList)
  const existingCardCount = existingItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const handleMethodChange = (method: AddMethod) => {
    setActiveMethod(method)
    setPendingItems(null)
    setImportSource("")
  }

  const handleTextChange = (value: string) => {
    setTextInput(value)
    if (value.trim()) {
      const items = parseDeckList(value)
      setPendingItems(items)
    } else {
      setPendingItems(null)
    }
  }

  const handleMetaSelect = useCallback(
    (items: DeckListItem[], deckName: string) => {
      setPendingItems(items)
      setImportSource(deckName)
      setActiveMethod("text")
      const text = items
        .map((item) =>
          `${item.quantity} ${item.cardName} ${item.setCode || ""} ${item.cardNumber || ""}`.trim()
        )
        .join("\n")
      setTextInput(text)
    },
    []
  )

  const handleUrlImport = useCallback(
    (items: DeckListItem[], deckName: string) => {
      setPendingItems(items)
      setImportSource(deckName)
      setActiveMethod("text")
      const text = items
        .map((item) =>
          `${item.quantity} ${item.cardName} ${item.setCode || ""} ${item.cardNumber || ""}`.trim()
        )
        .join("\n")
      setTextInput(text)
    },
    []
  )

  const handleAddToDeck = async () => {
    if (!pendingItems || pendingItems.length === 0) return

    // Check if there are existing cards
    if (existingCardCount > 0) {
      setShowConfirmDialog(true)
      return
    }

    await processAddToDeck()
  }

  const processAddToDeck = async (action: "overwrite" | "add" = "add") => {
    setIsProcessing(true)
    try {
      // If overwrite action, clear existing cards first
      if (action === "overwrite") {
        clearList()
      }

      onAddCards(pendingItems!)
      setTextInput("")
      setPendingItems(null)
      setImportSource("")
      setActiveMethod("text")
      setShowConfirmDialog(false)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOverwrite = () => {
    processAddToDeck("overwrite")
  }

  const handleAddToExisting = () => {
    processAddToDeck("add")
  }

  const handleConfirmDialogClose = () => {
    setShowConfirmDialog(false)
  }

  const handleClose = () => {
    if (!isProcessing) {
      onClose()
    }
  }

  const totalCards =
    pendingItems?.reduce((sum, item) => sum + item.quantity, 0) || 0

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

  const loadSample = () => {
    handleTextChange(sampleDeck)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-slate-800 bg-slate-900 p-0 text-slate-100">
          <DialogHeader className="border-b border-slate-800 px-6 py-4">
            <DialogTitle className="text-lg font-semibold text-slate-100">
              Add Cards to Deck
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col overflow-hidden">
            {/* Method Selector */}
            <div className="border-b border-slate-800 px-6 py-4">
              <div className="grid grid-cols-3 gap-3">
                {methods.map((method) => {
                  const Icon = method.icon
                  const isActive = activeMethod === method.value

                  return (
                    <button
                      key={method.value}
                      onClick={() => handleMethodChange(method.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-3 transition-all",
                        isActive
                          ? "border-blue-500 bg-blue-500/10 text-blue-400"
                          : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
                      )}
                    >
                      <Icon
                        className={cn("h-5 w-5", isActive && "text-blue-400")}
                      />
                      <span className="text-sm font-medium">
                        {method.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content Area */}
            <div className="max-h-[50vh] min-h-[300px] overflow-y-auto px-6 py-4">
              {activeMethod === "text" && (
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      Enter cards in format:{" "}
                      <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
                        4 Charmander OBF 26
                      </code>
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadSample}
                      className="h-7 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Load Sample
                    </Button>
                  </div>

                  {importSource && (
                    <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-400">
                      Imported from: {importSource}
                    </div>
                  )}

                  <Textarea
                    value={textInput}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={`Paste deck list here...\n\nExamples:\n4 Charmander OBF 26\n3 Charizard ex OBF 125\nBoss's Orders PAL 172`}
                    className="min-h-[200px] resize-none border-slate-700 bg-slate-800/50 font-mono text-sm text-slate-100 placeholder:text-slate-600"
                  />

                  <div className="text-xs text-slate-500">
                    <p>Formats supported:</p>
                    <ul className="mt-1 ml-4 list-disc">
                      <li>
                        4 Charmander OBF 26 (quantity + name + set + number)
                      </li>
                      <li>4 Charmander (quantity + name only)</li>
                      <li>Boss's Orders (name only, defaults to 1)</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeMethod === "meta" && (
                <MetaDeckSelector onSelectDeck={handleMetaSelect} />
              )}

              {activeMethod === "url" && (
                <DeckUrlImport onImport={handleUrlImport} />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  {pendingItems ? (
                    <span className="text-slate-300">
                      <span className="font-semibold text-white">
                        {totalCards}
                      </span>{" "}
                      cards to add
                      {importSource && (
                        <span className="ml-2 text-slate-500">
                          from {importSource}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span>Enter cards or select an import method</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddToDeck}
                    disabled={
                      !pendingItems || pendingItems.length === 0 || isProcessing
                    }
                    className="gap-2 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add to Deck
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Confirmation Dialog */}
      <LoadConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleConfirmDialogClose}
        onOverwrite={handleOverwrite}
        onAddToExisting={handleAddToExisting}
        existingCardCount={existingCardCount}
        newDeckName={importSource || "Imported Deck"}
      />
    </>
  )
}
