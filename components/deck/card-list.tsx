"use client"

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  GripVertical,
  MoreVertical,
  Copy,
  ClipboardPaste,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getFullImageUrl } from "@/lib/tcgdex"
import type { ProxyItem } from "@/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu"
import { CardVariantModal } from "@/components/proxy/card-variant-modal"

interface CardListProps {
  items: ProxyItem[]
  onReorder: (newItems: ProxyItem[]) => void
  onRemove: (indices: number[]) => void
}

// Flattened item with unique ID for each row
interface FlattenedItem {
  id: string
  index: number
  cardId: string
  name: string
  image: string | undefined
  setName: string
  setId: string
  localId: string
  variant: "normal" | "holo" | "reverse"
  originalItem: ProxyItem
}

// Selection context for managing selection state across rows
interface SelectionContextType {
  selectedIds: Set<string>
  toggleSelection: (id: string, event?: React.MouseEvent) => void
  isSelected: (id: string) => boolean
  clearSelection: () => void
  clipboardCount: number
}

const SelectionContext = createContext<SelectionContextType | null>(null)

function useSelection() {
  const context = useContext(SelectionContext)
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider")
  }
  return context
}

// Individual card row component
interface CardRowProps {
  item: FlattenedItem
  onRemove: () => void
  onEdit: () => void
  onCopy: () => void
  onPaste: () => void
  isOverlay?: boolean
}

function CardRow({
  item,
  onRemove,
  onEdit,
  onCopy,
  onPaste,
  isOverlay = false,
}: CardRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: isOverlay,
  })

  const { isSelected, toggleSelection, clipboardCount } = useSelection()
  const selected = isSelected(item.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Format card number
  const cardNumber = useMemo(() => {
    const num = parseInt(item.localId, 10)
    if (!isNaN(num)) {
      return num.toString().padStart(3, "0")
    }
    return item.localId || "???"
  }, [item.localId])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 transition-colors select-none",
        selected
          ? "border-blue-500/50 bg-blue-500/20"
          : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-800/50",
        isDragging && "opacity-50",
        isOverlay &&
          "z-50 scale-105 rotate-2 border-slate-700 bg-slate-800 shadow-xl"
      )}
      onClick={(e) => toggleSelection(item.id, e)}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-400 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Card Thumbnail */}
      <div className="h-8 w-6 shrink-0 overflow-hidden rounded bg-slate-800">
        {item.image ? (
          <img
            src={getFullImageUrl(item.image, "low", "webp")}
            alt={item.name}
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              console.warn(
                "[CardList] Failed to load image:",
                item.name,
                item.image?.slice(0, 50)
              )
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-[8px] text-slate-600">
            ?
          </div>
        )}
      </div>

      {/* Card Name and Set */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm leading-tight",
            selected ? "text-blue-200" : "text-slate-300"
          )}
        >
          {item.name}
        </p>
        <p className="truncate text-xs text-slate-500">{item.setName}</p>
      </div>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-800 hover:text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
            <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPaste} disabled={clipboardCount === 0}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste
            <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
            <DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRemove}
            className="text-red-400 focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function CardList({ items, onReorder, onRemove }: CardListProps) {
  // Flatten items - each card instance is its own row
  const flattenedItems: FlattenedItem[] = useMemo(() => {
    return items.map((item, index) => ({
      id: item.id,
      index,
      cardId: item.cardId,
      name: item.name,
      image: item.image,
      setName: item.setName,
      setId: item.setId,
      localId: item.localId,
      variant: item.variant,
      originalItem: item,
    }))
  }, [items])

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastSelectedId = useRef<string | null>(null)

  // Clipboard for copy/paste
  const clipboardRef = useRef<ProxyItem[]>([])
  const [clipboardCount, setClipboardCount] = useState(0)

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null)

  // Edit modal state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)

  // Selection handlers
  const toggleSelection = useCallback(
    (id: string, event?: React.MouseEvent) => {
      setSelectedIds((prev) => {
        const newSelected = new Set(prev)

        if (event) {
          const isCmdOrCtrl = event.metaKey || event.ctrlKey
          const isShift = event.shiftKey

          if (isShift && lastSelectedId.current) {
            // Range selection
            const currentIndex = flattenedItems.findIndex(
              (item) => item.id === id
            )
            const lastIndex = flattenedItems.findIndex(
              (item) => item.id === lastSelectedId.current
            )

            if (currentIndex !== -1 && lastIndex !== -1) {
              const minIndex = Math.min(currentIndex, lastIndex)
              const maxIndex = Math.max(currentIndex, lastIndex)

              for (let i = minIndex; i <= maxIndex; i++) {
                newSelected.add(flattenedItems[i].id)
              }
            }
          } else if (isCmdOrCtrl) {
            // Toggle selection
            if (newSelected.has(id)) {
              newSelected.delete(id)
            } else {
              newSelected.add(id)
            }
          } else {
            // Single selection - clear others and select only this one
            newSelected.clear()
            newSelected.add(id)
          }
        } else {
          // No event (e.g., called programmatically) - single selection
          newSelected.clear()
          newSelected.add(id)
        }

        lastSelectedId.current = id
        return newSelected
      })
    },
    [flattenedItems]
  )

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    lastSelectedId.current = null
  }, [])

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (over && active.id !== over.id) {
        const oldIndex = flattenedItems.findIndex(
          (item) => item.id === active.id
        )
        const newIndex = flattenedItems.findIndex((item) => item.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = arrayMove(items, oldIndex, newIndex)
          onReorder(newItems)
        }
      }
    },
    [flattenedItems, items, onReorder]
  )

  // Remove handlers
  const handleRemove = useCallback(
    (index: number) => {
      onRemove([index])
    },
    [onRemove]
  )

  const handleRemoveSelected = useCallback(() => {
    const indices: number[] = []
    selectedIds.forEach((id) => {
      const index = flattenedItems.findIndex((item) => item.id === id)
      if (index !== -1) {
        indices.push(index)
      }
    })
    if (indices.length > 0) {
      onRemove(indices.sort((a, b) => b - a)) // Sort descending to remove from end first
      clearSelection()
    }
  }, [flattenedItems, onRemove, selectedIds, clearSelection])

  // Copy handlers
  const handleCopy = useCallback(() => {
    const copied: ProxyItem[] = []
    selectedIds.forEach((id) => {
      const item = flattenedItems.find((fi) => fi.id === id)
      if (item) {
        copied.push(item.originalItem)
      }
    })
    if (copied.length > 0) {
      clipboardRef.current = copied
      setClipboardCount(copied.length)
    }
  }, [flattenedItems, selectedIds])

  const handlePaste = useCallback(() => {
    if (clipboardRef.current.length === 0) return

    // Find insertion point - after the last selected item, or at the end
    let insertIndex = items.length
    if (selectedIds.size > 0) {
      const selectedIndices: number[] = []
      selectedIds.forEach((id) => {
        const index = flattenedItems.findIndex((item) => item.id === id)
        if (index !== -1) {
          selectedIndices.push(index)
        }
      })
      if (selectedIndices.length > 0) {
        insertIndex = Math.max(...selectedIndices) + 1
      }
    }

    // Insert copied items
    const itemsToInsert = clipboardRef.current.map((item) => ({
      ...item,
      id: `${item.cardId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }))

    const newItems = [
      ...items.slice(0, insertIndex),
      ...itemsToInsert,
      ...items.slice(insertIndex),
    ]

    onReorder(newItems)
  }, [flattenedItems, items, onReorder, selectedIds])

  // Edit handler
  const handleEdit = useCallback(
    (id: string) => {
      const item = flattenedItems.find((fi) => fi.id === id)
      if (item) {
        setEditingItemId(id)
        setEditingCardId(item.cardId)
      }
    },
    [flattenedItems]
  )

  // Close edit modal handler
  const handleCloseEditModal = useCallback(() => {
    setEditingItemId(null)
    setEditingCardId(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Delete/Backspace - remove selected
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size > 0
      ) {
        e.preventDefault()
        handleRemoveSelected()
        return
      }

      // Ctrl+C - copy selected
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedIds.size > 0) {
        e.preventDefault()
        handleCopy()
        return
      }

      // Ctrl+V - paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault()
        handlePaste()
        return
      }

      // Escape - clear selection
      if (e.key === "Escape") {
        clearSelection()
        return
      }

      // Ctrl+A - select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault()
        setSelectedIds(new Set(flattenedItems.map((item) => item.id)))
        return
      }

      // Ctrl+E - edit (only when exactly one item is selected)
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        if (selectedIds.size === 1) {
          e.preventDefault()
          const selectedId = Array.from(selectedIds)[0]
          handleEdit(selectedId)
        }
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    clearSelection,
    flattenedItems,
    handleCopy,
    handleEdit,
    handlePaste,
    handleRemoveSelected,
    selectedIds,
  ])

  // Get active item for drag overlay
  const activeItem = useMemo(() => {
    if (!activeId) return null
    return flattenedItems.find((item) => item.id === activeId) || null
  }, [activeId, flattenedItems])

  const selectionContextValue: SelectionContextType = {
    selectedIds,
    toggleSelection,
    isSelected,
    clearSelection,
    clipboardCount,
  }

  return (
    <SelectionContext.Provider value={selectionContextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flattenedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {flattenedItems.map((item, index) => (
              <CardRow
                key={item.id}
                item={item}
                onRemove={() => handleRemove(index)}
                onEdit={() => handleEdit(item.id)}
                onCopy={() => {
                  // Select this item if not already selected
                  if (!selectedIds.has(item.id)) {
                    toggleSelection(item.id)
                  }
                  handleCopy()
                }}
                onPaste={handlePaste}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <CardRow
              item={activeItem}
              onRemove={() => {}}
              onEdit={() => {}}
              onCopy={() => {}}
              onPaste={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>

        {/* Edit Modal */}
        <CardVariantModal
          isOpen={editingItemId !== null}
          onClose={handleCloseEditModal}
          cardId={editingCardId}
          itemId={editingItemId}
        />
      </DndContext>
    </SelectionContext.Provider>
  )
}
