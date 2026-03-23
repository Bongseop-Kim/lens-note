# UI Redesign — Modern SaaS Dashboard

**Date**: 2026-03-23
**Status**: Approved
**Scope**: EditorApp and all sub-components (CardList, CardDetail, Preferences, ZonePicker, EditorSlider)

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Style reference | shadcn/ui | Neutral, minimal, professional |
| Theme support | Light + Dark both | Existing pref toggle preserved |
| Accent color | Zinc (monochrome) | No color accent; pure black/white hierarchy |
| Tag system | **Removed** | Not needed; simplifies CardDetail |
| ZonePicker presets | **Removed** | Replaced by direct interact model |
| ZonePicker interaction | Corner resize + inner move | More intuitive than cell-grid drag |
| Implementation approach | Tailwind config tokens + component restyle | Consistent semantic tokens, IDE autocomplete, Tailwind purge |

---

## Design Tokens (tailwind.config.js)

Extend the Tailwind config with a zinc-based semantic token layer, following shadcn/ui conventions:

```js
theme: {
  extend: {
    colors: {
      background:       { DEFAULT: '#ffffff',  dark: '#09090b' },
      foreground:       { DEFAULT: '#18181b',  dark: '#fafafa' },
      card:             { DEFAULT: '#ffffff',  dark: '#09090b' },
      'card-foreground':{ DEFAULT: '#18181b',  dark: '#fafafa' },
      muted:            { DEFAULT: '#f4f4f5',  dark: '#27272a' },
      'muted-foreground':{ DEFAULT: '#71717a', dark: '#a1a1aa' },
      border:           { DEFAULT: '#e4e4e7',  dark: '#27272a' },
      input:            { DEFAULT: '#e4e4e7',  dark: '#27272a' },
      accent:           { DEFAULT: '#f4f4f5',  dark: '#18181b' },
      'accent-foreground':{ DEFAULT: '#18181b',dark: '#fafafa' },
      primary:          { DEFAULT: '#18181b',  dark: '#fafafa' },
      'primary-foreground':{ DEFAULT: '#fafafa',dark:'#09090b'},
      ring:             { DEFAULT: '#18181b',  dark: '#fafafa' },
    },
    borderRadius: {
      DEFAULT: '6px',
    },
  }
}
```

Dark mode via `darkMode: 'class'` (already configured).

---

## Component Specifications

### EditorApp — Tab Bar & Shell

- Height: `36px`, `border-b border-border`
- macOS traffic light spacer: `w-20` (unchanged)
- Tab (active): `text-sm font-medium text-foreground border-b-[1.5px] border-foreground -mb-px`
- Tab (inactive): `text-sm text-muted-foreground hover:text-foreground border-b-[1.5px] border-transparent`
- Right actions:
  - Import button: `h-[22px] px-2.5 text-xs font-medium text-muted-foreground border border-border rounded-md bg-transparent hover:bg-accent`
  - Export button: `h-[22px] px-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90`
- Shell background: `bg-background text-foreground`

### CardList — Sidebar

- Container: `w-72 border-r border-border overflow-y-auto p-2 bg-muted/30`
- Card (default): `flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent cursor-pointer`
- Card (selected): add `bg-accent shadow-[inset_2px_0_0] shadow-foreground`
- Drag handle: `text-muted-foreground/40 hover:text-muted-foreground`
- Card title: `text-sm font-medium text-foreground truncate`
- Card preview: `text-xs text-muted-foreground truncate`
- Add card button: `w-full h-8 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:bg-accent hover:text-foreground`

### CardDetail — Main Editor

- Container: `flex flex-col gap-3 p-5 h-full`
- Title row: `flex items-center justify-between`
- Title input: `flex-1 text-base font-semibold bg-transparent border-b border-border focus:border-foreground outline-none pb-1 transition-colors text-foreground placeholder:text-muted-foreground`
- **Tags: removed entirely**
- Delete button: `p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10`
- Textarea: `flex-1 p-3 text-sm leading-relaxed resize-none rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring`

### Preferences

- Container: `p-6 flex flex-col gap-6 max-w-md`
- Section header: `flex items-center gap-3` → label `text-xs font-semibold text-muted-foreground uppercase tracking-wide` + divider `flex-1 h-px bg-border`
- Slider label row: `flex justify-between text-sm` → label `text-foreground`, value `text-xs font-mono tabular-nums text-muted-foreground`
- Range input: `accent-foreground` (zinc-900 / zinc-100)
- Checkbox: `rounded border-border text-foreground`
- Theme select: `border border-input rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:border-ring`
- Hotkey input: `border border-input rounded-md px-2 py-1 text-sm font-mono w-32 bg-background text-foreground focus:outline-none focus:border-ring text-right`
- Hotkey error: `text-xs text-red-500`

### ZonePicker — Redesigned Interaction

**Removed**: cell-grid drag-to-select, preset buttons.

**New interaction model**:

1. **Resize** — mousedown on any of 4 corner handles (8×8px, `bg-amber-400`, positioned at each corner of the selection rect) → drag moves that corner, opposite corner is anchor.
2. **Move** — mousedown inside the selection rect (but not on a handle) → drag translates the entire rect, size preserved.
3. **Create** — mousedown on empty canvas (no existing selection or outside selection) → drag creates new selection as before.

**Hit-test logic** (mousedown):
```
if point is within 10px of any corner → resize mode (store which corner)
else if point is inside selection rect → move mode (store drag offset)
else → create mode
```

**Visual**:
- Minimap: `border border-border rounded-md overflow-hidden`
- Canvas: `bg-zinc-900` with subtle grid lines
- Selection: `border-[1.5px] border-amber-400 bg-amber-400/15`
- Corner handles: `absolute w-2 h-2 bg-amber-400 rounded-[2px]` at each corner (offset `-4px`)
- Cursor changes: `cursor-nw-resize` / `cursor-ne-resize` / `cursor-sw-resize` / `cursor-se-resize` on handles, `cursor-move` inside selection, `cursor-crosshair` on empty canvas
- Coords bar: `px-2.5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground`
- Monitor selector (multi-monitor): outline button group, same styling as import button

### EditorSlider

- Wrapper: `flex flex-col gap-1.5` (unchanged)
- Label row: unchanged, just token-ified colors
- Range: `w-full cursor-pointer accent-foreground`

---

## Files to Change

| File | Change |
|---|---|
| `tailwind.config.js` | Add semantic color tokens |
| `src/editor/EditorApp.tsx` | Restyle shell, tab bar, action buttons |
| `src/editor/CardList.tsx` | Restyle sidebar and card items |
| `src/editor/CardDetail.tsx` | Remove tags, restyle title + textarea |
| `src/editor/Preferences.tsx` | Restyle section headers, inputs, selects |
| `src/editor/ZonePicker.tsx` | Remove presets, implement resize+move interaction |
| `src/components/EditorSlider.tsx` | Token-ify colors |

---

## Out of Scope

- Overlay window (`CardDisplay`, `OverlayApp`) — not part of editor UI
- New features or functionality beyond what is described above
- shadcn/ui library installation — use Tailwind tokens only, no new dependencies
