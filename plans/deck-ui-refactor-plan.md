# Deck UI Refactor Implementation Plan

## Overview

Transform the tab-based deck sidebar into a unified "My Deck" panel with an interactive file-browser-like card list and a consolidated "Add Cards" modal for all import methods.

## Architecture Changes

### Current Architecture

```
DeckSidebar (Tabs)
├── Tab: decklist (textarea input)
├── Tab: meta (MetaDeckSelector)
└── Tab: url (DeckUrlImport)
    ↓
Add to Proxy List button
    ↓
Proxy List Store (items[])
    ↓
LivePreview (visual cards)
```

### New Architecture

```
DeckSidebar
├── Header ("My Deck", count, actions)
├── CardList (interactive file-browser style)
│   ├── Individual card rows (drag, select, edit)
│   └── Selection & keyboard handlers
└── Footer (+ Add Cards button)
    ↓
AddCardsModal
├── MethodSelector (Type | Meta | URL)
├── ContentArea (contextual to method)
└── Add to Deck button
    ↓
Proxy List Store (items[])
    ↓
CardList & LivePreview (bidirectional sync)
```

---

## Phase 1: Create AddCardsModal Component

### New Files

- `components/deck/add-cards-modal.tsx` - Main modal container
- `components/deck/add-cards-tabs.tsx` - Method selector sub-component

### Component Structure

```typescript
interface AddCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCards: (items: ParsedDeckItem[]) => void;
}

type AddMethod = 'text' | 'meta' | 'url';
```

### UI Layout

```
┌─────────────────────────────────────────────┐
│ Add Cards to Deck                     [×]   │
├─────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐           │
│ │  📝    │ │  🏆    │ │  🔗    │           │
│ │  Type  │ │  Meta  │ │  URL   │           │
│ └────────┘ └────────┘ └────────┘           │
├─────────────────────────────────────────────┤
│                                             │
│  [Contextual Content Area]                  │
│                                             │
│  - Text: Textarea for manual entry          │
│  - Meta: MetaDeckSelector (condensed)       │
│  - URL: URL input + fetch button            │
│                                             │
├─────────────────────────────────────────────┤
│ Cards to add: 24                    [Add]   │
└─────────────────────────────────────────────┘
```

### Implementation Notes

- Use shadcn Dialog component as base
- Animate presence between methods
- Keep parsed results in local state until "Add" clicked
- Show preview count of cards to be added

---

## Phase 2: Refactor deck-sidebar.tsx

### Remove

- Tabs, TabsList, TabsContent, TabsTrigger imports and usage
- Tab state management (activeTab)
- Tab-specific content wrappers

### Add

- CardList component integration
- AddCardsModal integration
- Simplified header with "My Deck" title

### New Layout Structure

```typescript
// State
const [isAddModalOpen, setIsAddModalOpen] = useState(false);

// Render
<div className="flex h-full flex-col">
  {/* Header */}
  <div className="flex-shrink-0 border-b border-slate-800 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="font-semibold text-slate-100">My Deck</h2>
        <p className="text-xs text-slate-500">{totalCards} cards</p>
      </div>
      <div className="flex gap-2">
        {/* Settings/Actions */}
      </div>
    </div>
  </div>

  {/* Card List */}
  <div className="flex-1 overflow-hidden">
    <CardList />
  </div>

  {/* Footer */}
  <div className="flex-shrink-0 border-t border-slate-800 p-4">
    <Button onClick={() => setIsAddModalOpen(true)}>
      + Add Cards
    </Button>
  </div>
</div>
```

---

## Phase 3: Implement CardList Component

### New File

- `components/deck/card-list.tsx`

### Features (File Browser Style)

1. **Individual Card Rows**: Each card on its own line
2. **Drag to Reorder**: Using @dnd-kit
3. **Selection**: Click to select, Ctrl/Cmd+click for multi, Shift+click for range
4. **Keyboard Shortcuts**:
   - Delete/Backspace: Remove selected
   - Ctrl+C: Copy selected
   - Ctrl+V: Paste after selection
5. **Inline Editing**: Click pencil icon to edit card name/set
6. **Double Click**: Open card variant modal
7. **Mobile**: Long press for context menu

### Component Interface

```typescript
interface CardListProps {
  items: ProxyItem[];
  selectedIds: Set<string>;
  onReorder: (activeId: string, overId: string) => void;
  onSelect: (id: string, multi?: boolean, range?: boolean) => void;
  onDelete: (ids: string[]) => void;
  onEdit: (id: string, updates: Partial<ProxyItem>) => void;
  onCopy: (ids: string[]) => void;
  onPaste: (afterId?: string) => void;
}
```

### Row Layout

```
┌────────────────────────────────────────────────────────────┐
│ ⠿ │ ☑ │ 1. │ Charmander        │ OBF │ 26 │ ✎ │ 🗑️ │
├────────────────────────────────────────────────────────────┤
│ ⠿ │ ☑ │ 2. │ Charmander        │ OBF │ 26 │ ✎ │ 🗑️ │
├────────────────────────────────────────────────────────────┤
│ ⠿ │ ☑ │ 3. │ Charizard ex      │ OBF │ 125│ ✎ │ 🗑️ │
└────────────────────────────────────────────────────────────┘

⠿ = drag handle
☑ = selection checkbox
✎ = edit button (hover to show)
🗑️ = delete button (hover to show)
```

---

## Phase 4: Bidirectional Sync Implementation

### Text Generation from Items

```typescript
// Convert proxy items to display text
function itemsToText(items: ProxyItem[]): string {
  return items.map((item, index) => {
    const setCode = item.setId.toUpperCase();
    const cardNum = item.localId;
    return `${index + 1}. ${item.name} ${setCode} ${cardNum}`;
  }).join('\n');
}
```

### Items from Text (for import)

```typescript
// Parse text input to deck items (for AddCardsModal)
function textToItems(text: string): ParsedDeckItem[] {
  const lines = text.trim().split('\n').filter(Boolean);
  return lines.map(line => parseDeckLine(line));
}
```

### Sync Strategy

- CardList displays items directly from proxy-list store
- Reordering in CardList → calls reorderItems() → updates store → CardList re-renders
- No separate "text state" for the main list - it renders from store items directly
- Text parsing only happens in AddCardsModal for importing new cards

---

## Phase 5: Refactor MetaDeckSelector

### Changes

- Remove `onPopulateText` callback
- Add `onSelectDeck` callback that returns parsed cards
- Condense UI for modal context (smaller cards, more compact)
- Keep core functionality: browse, search, load meta decks

### New Interface

```typescript
interface MetaDeckSelectorProps {
  onSelectDeck: (cards: ParsedDeckItem[], deckName: string) => void;
}
```

---

## Phase 6: Refactor DeckUrlImport

### Changes

- Remove `onPopulateText` callback
- Add `onImport` callback that returns parsed cards
- Keep URL input, fetch logic, variant support
- Show preview before confirming

### New Interface

```typescript
interface DeckUrlImportProps {
  onImport: (cards: ParsedDeckItem[], deckName: string) => void;
}
```

---

## Phase 7: Mobile Updates

### Components to Update

- `components/mobile/mobile-deck-section.tsx`
- `components/mobile/mobile-layout.tsx`

### Mobile-Specific Features

- Full-screen sheet for AddCardsModal
- Touch-friendly card list (larger touch targets)
- Long-press context menu for card actions
- Swipe gestures for quick actions

### Context Menu (Mobile)

```
┌─────────────────┐
│ Card Actions    │
├─────────────────┤
│ 📋 Copy         │
│ ✏️ Edit         │
│ 🎨 Change Set   │
│ 🗑️ Delete       │
└─────────────────┘
```

---

## Phase 8: Testing Checklist

### Functionality

- [ ] Add cards via text input works
- [ ] Add cards via meta decks works
- [ ] Add cards via URL works
- [ ] Drag reordering updates visual order
- [ ] Selection (single, multi, range) works
- [ ] Copy/paste cards works
- [ ] Delete selected cards works
- [ ] Edit card inline works
- [ ] Double-click opens variant modal
- [ ] Mobile touch interactions work

### Edge Cases

- [ ] Empty deck state displays correctly
- [ ] Large decks (60+ cards) perform well
- [ ] Rapid selection/deselection is responsive
- [ ] Copy then paste multiple times
- [ ] Drag while items selected
- [ ] Edit card that doesn't exist in TCGdex

---

## File Changes Summary

### New Files

1. `components/deck/add-cards-modal.tsx`
2. `components/deck/add-cards-tabs.tsx`
3. `components/deck/card-list.tsx`
4. `components/deck/card-list-item.tsx` (row component)
5. `components/deck/card-context-menu.tsx` (mobile)

### Modified Files

1. `components/deck/deck-sidebar.tsx` - Major refactor
2. `components/deck/meta-deck-selector.tsx` - Update interface
3. `components/deck/deck-url-import.tsx` - Update interface
4. `components/mobile/mobile-deck-section.tsx` - Update for new design
5. `stores/proxy-list.ts` - Add copy/paste actions

### Deleted Files (Potentially)

- None (keep old components for reference until migration complete)

---

## Migration Strategy

1. Create all new components alongside existing ones
2. Feature flag the new design (optional)
3. Test thoroughly
4. Remove old tab-based code once stable
5. Update documentation

---

## Estimated Effort

| Phase                       | Complexity | Files         |
| --------------------------- | ---------- | ------------- |
| Phase 1: AddCardsModal      | Medium     | 2 new         |
| Phase 2: Refactor Sidebar   | Medium     | 1 major       |
| Phase 3: CardList           | High       | 3 new         |
| Phase 4: Bidirectional Sync | Low        | Store updates |
| Phase 5: Meta Selector      | Low        | 1 update      |
| Phase 6: URL Import         | Low        | 1 update      |
| Phase 7: Mobile             | Medium     | 2 updates     |
| Phase 8: Testing            | Medium     | -             |

**Total**: Significant refactor requiring careful testing

---

## Questions for Implementation

1. Should we keep the existing `deck-parser.ts` logic or refactor it for the new flow?
2. Do we need pagination for large card lists (60+ cards)?
3. Should we add a "Clear All" confirmation dialog?
4. Any specific keyboard shortcuts to avoid?
