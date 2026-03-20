"use client"

import { useState, useRef, useCallback } from "react"
import { Layers } from "lucide-react"
import { useProxyList } from "@/stores/proxy-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CreateDeckDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateDeckDialog({ isOpen, onClose }: CreateDeckDialogProps) {
  const [deckName, setDeckName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createDeck = useProxyList((state) => state.createDeck)

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        // Small delay to ensure dialog animation is complete
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 50)
      } else {
        // Reset state when dialog closes
        setDeckName("")
        setError(null)
        onClose()
      }
    },
    [onClose]
  )

  const handleSubmit = () => {
    const trimmedName = deckName.trim()

    // Validate name is not empty
    if (!trimmedName) {
      setError("Deck name is required")
      return
    }

    // Create the deck - this automatically switches to it
    createDeck(trimmedName)

    // Close the dialog
    onClose()
  }

  const handleCancel = () => {
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <Layers className="h-5 w-5 text-blue-400" />
            Create New Deck
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter a name for your new proxy deck.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name" className="text-slate-300">
              Deck Name
            </Label>
            <Input
              ref={inputRef}
              id="deck-name"
              value={deckName}
              onChange={(e) => {
                setDeckName(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Gardevoir Deck"
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
              maxLength={50}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
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
              onClick={handleSubmit}
              disabled={!deckName.trim()}
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Create Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
