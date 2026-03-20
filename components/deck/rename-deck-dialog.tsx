"use client"

import { useState, useRef, useCallback } from "react"
import { Pencil } from "lucide-react"
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

interface RenameDeckDialogProps {
  deckId: string
  currentName: string
  isOpen: boolean
  onClose: () => void
}

export function RenameDeckDialog({
  deckId,
  currentName,
  isOpen,
  onClose,
}: RenameDeckDialogProps) {
  const [newName, setNewName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const renameDeck = useProxyList((state) => state.renameDeck)

  // Handle dialog open - focus and select input
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setNewName(currentName)
        // Small delay to ensure dialog animation is complete
        setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        }, 50)
      } else {
        onClose()
      }
    },
    [currentName, onClose]
  )

  const handleSubmit = () => {
    const trimmedName = newName.trim()

    // Validate name is not empty
    if (!trimmedName) {
      setError("Deck name is required")
      return
    }

    // Validate name is different from current
    if (trimmedName === currentName.trim()) {
      setError("New name must be different from current name")
      return
    }

    // Rename the deck
    renameDeck(deckId, trimmedName)

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
            <Pencil className="h-5 w-5 text-blue-400" />
            Rename Deck
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter a new name for &ldquo;{currentName}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deck-name" className="text-slate-300">
              New Name
            </Label>
            <Input
              ref={inputRef}
              id="deck-name"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                if (error) setError(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter deck name"
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
              disabled={
                !newName.trim() || newName.trim() === currentName.trim()
              }
              className="bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
