"use client"

import { useCallback } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DeleteDeckDialogProps {
  deckId: string
  deckName: string
  isOpen: boolean
  onClose: () => void
}

export function DeleteDeckDialog({
  deckId,
  deckName,
  isOpen,
  onClose,
}: DeleteDeckDialogProps) {
  const decks = useProxyList((state) => state.decks)
  const deleteDeck = useProxyList((state) => state.deleteDeck)

  const isLastDeck = decks.length <= 1

  const handleDelete = () => {
    deleteDeck(deckId)
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose()
      }
    },
    [onClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Trash2 className="h-5 w-5 text-red-400" />
            Delete Deck
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Are you sure you want to delete &ldquo;{deckName}&rdquo;?
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Warning for last deck */}
          {isLastDeck && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  Last Deck Warning
                </p>
                <p className="text-sm text-amber-300/80">
                  This is your last deck. Deleting it will create an empty
                  default deck automatically.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <p className="text-sm text-slate-400">
              This action cannot be undone. All cards in this deck will be
              permanently removed.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
