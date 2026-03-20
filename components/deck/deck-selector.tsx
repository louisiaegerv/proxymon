"use client"

import { useState, useMemo } from "react"
import { ChevronDown, Pencil, Trash2, Plus, Check, Layers } from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { CreateDeckDialog } from "./create-deck-dialog"
import { RenameDeckDialog } from "./rename-deck-dialog"
import { DeleteDeckDialog } from "./delete-deck-dialog"

interface DeckSelectorProps {
  className?: string
}

export function DeckSelector({ className }: DeckSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const decks = useProxyList((state) => state.decks)
  const activeDeckId = useProxyList((state) => state.activeDeckId)
  const switchDeck = useProxyList((state) => state.switchDeck)
  const getActiveDeck = useProxyList((state) => state.getActiveDeck)

  const activeDeck = getActiveDeck()

  // Calculate card counts for each deck
  const deckCardCounts = useMemo(() => {
    const counts = new Map<string, number>()
    decks.forEach((deck) => {
      const totalCards = deck.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
      counts.set(deck.id, totalCards)
    })
    return counts
  }, [decks])

  const handleSwitchDeck = (deckId: string) => {
    if (deckId !== activeDeckId) {
      switchDeck(deckId)
    }
  }

  const handleRenameClick = (
    e: React.MouseEvent,
    deckId: string,
    name: string
  ) => {
    e.stopPropagation()
    setRenameTarget({ id: deckId, name })
  }

  const handleDeleteClick = (
    e: React.MouseEvent,
    deckId: string,
    name: string
  ) => {
    e.stopPropagation()
    setDeleteTarget({ id: deckId, name })
  }

  // Format deck name with card count
  const formatDeckLabel = (deckName: string, deckId: string) => {
    const count = deckCardCounts.get(deckId) ?? 0
    return `${deckName} (${count})`
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex w-full items-center justify-between gap-2",
              "border-slate-700 bg-slate-900/50 text-slate-100",
              "hover:bg-slate-800 hover:text-slate-100",
              className
            )}
          >
            <span className="flex items-center gap-2 overflow-hidden">
              <Layers className="h-4 w-4 shrink-0 text-blue-400" />
              <span className="truncate">
                {activeDeck
                  ? formatDeckLabel(activeDeck.name, activeDeck.id)
                  : "Select Deck"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-72 border-slate-700 bg-slate-900 p-1"
          align="start"
        >
          {decks.length === 0 ? (
            <DropdownMenuItem disabled className="text-slate-500">
              No decks available
            </DropdownMenuItem>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {decks.map((deck) => {
                const isActive = deck.id === activeDeckId
                const cardCount = deckCardCounts.get(deck.id) ?? 0

                return (
                  <DropdownMenuItem
                    key={deck.id}
                    onClick={() => handleSwitchDeck(deck.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2",
                      "text-slate-100 focus:bg-slate-800",
                      isActive && "bg-slate-800/50"
                    )}
                  >
                    <span className="flex items-center gap-2 overflow-hidden">
                      {isActive ? (
                        <Check className="h-4 w-4 shrink-0 text-blue-400" />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "truncate text-sm",
                          isActive && "font-medium text-blue-400"
                        )}
                      >
                        {deck.name}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1">
                      <span className="text-xs text-slate-500">
                        {cardCount}
                      </span>

                      {/* Rename button */}
                      <button
                        onClick={(e) =>
                          handleRenameClick(e, deck.id, deck.name)
                        }
                        className="ml-1 rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                        title="Rename deck"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>

                      {/* Delete button - only show if more than one deck */}
                      {decks.length > 1 && (
                        <button
                          onClick={(e) =>
                            handleDeleteClick(e, deck.id, deck.name)
                          }
                          className="rounded p-1 text-slate-500 hover:bg-red-900/50 hover:text-red-400"
                          title="Delete deck"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  </DropdownMenuItem>
                )
              })}
            </div>
          )}

          <DropdownMenuSeparator className="my-1 bg-slate-700" />

          {/* Create new deck option */}
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="cursor-pointer rounded-sm px-2 py-2 text-slate-100 focus:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">Create New Deck</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <CreateDeckDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      {renameTarget && (
        <RenameDeckDialog
          deckId={renameTarget.id}
          currentName={renameTarget.name}
          isOpen={true}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteDeckDialog
          deckId={deleteTarget.id}
          deckName={deleteTarget.name}
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  )
}
