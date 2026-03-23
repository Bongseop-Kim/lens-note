# UI SaaS Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the editor window to match a modern shadcn/ui-inspired SaaS dashboard with zinc monochrome tokens, while also replacing ZonePicker's cell-grid interaction with direct resize/move handles.

**Architecture:** Add CSS variable-based semantic color tokens (background, foreground, muted, border, etc.) in `index.css` and expose them in `tailwind.config.js` as custom color utilities. Then systematically replace existing inline Tailwind color classes with semantic token classes across all 6 editor components. ZonePicker gets a logic rewrite: new `DisplayRect` type + pixel-based math functions, and the component replaces grid-drag/presets with corner-resize + inner-move interactions.

**Tech Stack:** Tailwind CSS v3 (class-based dark mode, CSS variables), React 19, TypeScript, Lucide React, @dnd-kit

**Spec:** `docs/specs/2026-03-23-ui-saas-dashboard-design.md`

**Verify after each task:** `pnpm tauri dev` → open editor window, visually confirm change, close.

---

## File Map

| File | Change |
|---|---|
| `src/index.css` | Add CSS variable tokens (light + dark) |
| `tailwind.config.js` | Reference CSS vars as semantic color utilities |
| `src/components/EditorSlider.tsx` | Token-ify label/value colors |
| `src/editor/EditorApp.tsx` | Shell bg, tab bar underline style, action buttons |
| `src/editor/CardList.tsx` | Sidebar bg, card hover/selected styles, add-button |
| `src/editor/CardDetail.tsx` | Remove tag UI entirely, restyle title input + textarea |
| `src/editor/Preferences.tsx` | Section headers, slider/checkbox/select/hotkey inputs |
| `src/utils/zonePickerMath.ts` | Add `DisplayRect`, `displayRectToPhysicalBounds`, `clampDisplayRect` |
| `src/editor/ZonePicker.tsx` | Remove presets + grid logic, implement resize/move/create |

---

## Task 1: Design Tokens

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Add CSS variables to `src/index.css`**

Replace entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #ffffff;
    --foreground: #18181b;
    --card: #ffffff;
    --card-foreground: #18181b;
    --muted: #f4f4f5;
    --muted-foreground: #71717a;
    --border: #e4e4e7;
    --input: #e4e4e7;
    --accent: #f4f4f5;
    --accent-foreground: #18181b;
    --primary: #18181b;
    --primary-foreground: #fafafa;
    --ring: #18181b;
    --destructive: #ef4444;
  }
  .dark {
    --background: #09090b;
    --foreground: #fafafa;
    --card: #09090b;
    --card-foreground: #fafafa;
    --muted: #27272a;
    --muted-foreground: #a1a1aa;
    --border: #27272a;
    --input: #27272a;
    --accent: #18181b;
    --accent-foreground: #fafafa;
    --primary: #fafafa;
    --primary-foreground: #09090b;
    --ring: #fafafa;
    --destructive: #f87171;
  }
}
```

- [ ] **Step 2: Update `tailwind.config.js` to expose tokens as utilities**

Replace entire file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./overlay.html", "./editor.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        ring: "var(--ring)",
        destructive: "var(--destructive)",
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Verify — run `pnpm tauri dev`, open editor, confirm no visual regressions (app still loads)**

- [ ] **Step 4: Commit**

```bash
git add src/index.css tailwind.config.js
git commit -m "feat: add shadcn/ui zinc design tokens (CSS vars + Tailwind config)"
```

---

## Task 2: EditorSlider

**Files:**
- Modify: `src/components/EditorSlider.tsx`

- [ ] **Step 1: Replace EditorSlider with token classes**

Replace entire file with:

```tsx
interface EditorSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
  className?: string;
}

export default function EditorSlider({
  label,
  min,
  max,
  value,
  displayValue,
  onChange,
  className,
}: EditorSliderProps) {
  return (
    <div className={className ?? "flex flex-col gap-1.5"}>
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground cursor-pointer"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EditorSlider.tsx
git commit -m "feat: token-ify EditorSlider colors"
```

---

## Task 3: EditorApp Shell & Tab Bar

**Files:**
- Modify: `src/editor/EditorApp.tsx`

Key changes:
- Shell: `bg-background text-foreground`
- Tab bar: `border-b border-border bg-background`, height `h-9`
- Active tab: underline indicator `border-b-[1.5px] border-foreground -mb-px`
- Inactive tab: `text-muted-foreground hover:text-foreground`
- Import button: outline ghost style
- Export button: primary solid style
- Accessibility banner: keep functional, token-ify

- [ ] **Step 1: Replace `tabClass` helper and update shell + tab bar in `EditorApp.tsx`**

Replace the `tabClass` function (lines 39–41) with:

```tsx
function tabClass(active: boolean) {
  return `px-4 h-9 text-sm font-medium transition-colors border-b-[1.5px] -mb-px ${
    active
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`;
}
```

- [ ] **Step 2: Update the outer shell div (line 126)**

Change:
```tsx
<div className="flex flex-col h-screen pt-8 bg-white dark:bg-gray-900 dark:text-gray-100">
```
To:
```tsx
<div className="flex flex-col h-screen pt-9 bg-background text-foreground">
```

- [ ] **Step 3: Update the accessibility banner (line 128)**

Change:
```tsx
<div role="alert" className="fixed top-0 left-0 right-0 bg-amber-50 text-amber-800 border-b border-amber-200 px-4 py-2 flex items-center justify-between z-50 text-sm">
```
To:
```tsx
<div role="alert" className="fixed top-0 left-0 right-0 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between z-50 text-sm">
```

And update the button inside it:
```tsx
className="text-amber-700 dark:text-amber-400 font-medium hover:text-amber-900 dark:hover:text-amber-200"
```

- [ ] **Step 4: Update the tab bar container (line 151)**

Change:
```tsx
<div className="fixed top-0 left-0 right-0 flex border-b bg-white dark:bg-gray-900 dark:border-gray-700 z-10" data-tauri-drag-region>
```
To:
```tsx
<div className="fixed top-0 left-0 right-0 flex border-b border-border bg-background z-10" data-tauri-drag-region>
```

- [ ] **Step 5: Update the action buttons (lines 176–190)**

Change:
```tsx
<button
  type="button"
  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
  onClick={() => importCards().catch(console.error)}
>
  가져오기
</button>
<button
  type="button"
  className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
  onClick={() => exportCards().catch(console.error)}
>
  내보내기
</button>
```
To:
```tsx
<button
  type="button"
  className="h-[22px] px-2.5 text-xs font-medium text-muted-foreground border border-border rounded-md bg-transparent hover:bg-accent hover:text-foreground transition-colors"
  onClick={() => importCards().catch(console.error)}
>
  가져오기
</button>
<button
  type="button"
  className="h-[22px] px-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
  onClick={() => exportCards().catch(console.error)}
>
  내보내기
</button>
```

- [ ] **Step 6: Update empty state (lines 203–206)**

Change:
```tsx
<div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-gray-500">
```
To:
```tsx
<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
```

- [ ] **Step 7: Verify visually via `pnpm tauri dev`**

- [ ] **Step 8: Commit**

```bash
git add src/editor/EditorApp.tsx
git commit -m "feat: restyle EditorApp shell and tab bar with design tokens"
```

---

## Task 4: CardList Sidebar

**Files:**
- Modify: `src/editor/CardList.tsx`

Key changes:
- Sidebar wrapper: `bg-muted/30` tint, `p-2`
- Card default: `border border-border bg-card hover:bg-accent`
- Card selected: `bg-accent border-border border-l-[3px] border-l-foreground`
- Drag handle: `text-muted-foreground/40 hover:text-muted-foreground`
- Add card button: dashed border, muted text

- [ ] **Step 1: Replace `SortableCard` className logic**

In `SortableCard`, replace the outer div className:

```tsx
className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border transition-colors ${
  isSelected
    ? "bg-accent border-border border-l-[3px] border-l-foreground"
    : "bg-card border-border hover:bg-accent"
}`}
```

- [ ] **Step 2: Update drag handle span**

Change:
```tsx
<span {...attributes} {...listeners} className="cursor-grab text-gray-400">
```
To:
```tsx
<span {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors">
```

- [ ] **Step 3: Update card title and preview text**

Change:
```tsx
<p className="font-medium truncate">{card.title || "(제목 없음)"}</p>
<p className="text-sm text-gray-500 dark:text-gray-400 truncate">{card.body.slice(0, 50)}</p>
```
To:
```tsx
<p className="text-sm font-medium text-foreground truncate">{card.title || "(제목 없음)"}</p>
<p className="text-xs text-muted-foreground truncate">{card.body.slice(0, 50)}</p>
```

- [ ] **Step 4: Update the CardList wrapper div**

Change:
```tsx
<div className="flex flex-col gap-2">
```
To:
```tsx
<div className="flex flex-col gap-1.5">
```

- [ ] **Step 5: Update the sidebar container in `EditorApp.tsx` (line 195)**

Change:
```tsx
<div className="w-72 border-r dark:border-gray-700 overflow-y-auto p-3">
```
To:
```tsx
<div className="w-72 border-r border-border overflow-y-auto p-2 bg-muted/30">
```

- [ ] **Step 6: Update the "새 카드" button in `CardList.tsx`**

Change:
```tsx
className="mt-1 w-full px-4 py-2 text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
```
To:
```tsx
className="mt-1 w-full h-8 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:bg-accent hover:text-foreground transition-colors"
```

- [ ] **Step 7: Verify visually**

- [ ] **Step 8: Commit**

```bash
git add src/editor/CardList.tsx src/editor/EditorApp.tsx
git commit -m "feat: restyle CardList sidebar with design tokens"
```

---

## Task 5: CardDetail — Remove Tags, Restyle

**Files:**
- Modify: `src/editor/CardDetail.tsx`

Key changes:
- Remove all tag state, handlers, and JSX entirely
- Restyle title input and textarea with tokens
- Delete button: muted → destructive on hover

- [ ] **Step 1: Remove tag-related state and handlers**

Remove these lines:
```tsx
const [tagInput, setTagInput] = useState("");
```
```tsx
function enqueueTagUpdate(newTags: string[]) { ... }
function addTag() { ... }
function removeTag(tag: string) { ... }
```

- [ ] **Step 2: Remove tag JSX block**

Remove the entire `<div className="flex flex-wrap gap-2 items-center">` block (the tags + tag input section).

- [ ] **Step 3: Update the container div**

Change:
```tsx
<div className="flex flex-col gap-4 p-4 h-full">
```
To:
```tsx
<div className="flex flex-col gap-3 p-5 h-full">
```

- [ ] **Step 4: Update title input**

Change:
```tsx
className="flex-1 text-xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-1 transition-colors dark:border-gray-600 dark:text-gray-100 dark:focus:border-blue-400"
```
To:
```tsx
className="flex-1 text-base font-semibold bg-transparent border-b border-border focus:border-foreground outline-none pb-1 transition-colors text-foreground placeholder:text-muted-foreground"
```

- [ ] **Step 5: Update delete button**

Change:
```tsx
className="ml-3 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
```
To:
```tsx
className="ml-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
```

- [ ] **Step 6: Update textarea**

Change:
```tsx
className="flex-1 p-3 border border-gray-200 rounded-md resize-none text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-400 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700 dark:focus:border-gray-500"
```
To:
```tsx
className="flex-1 p-3 text-sm leading-relaxed resize-none rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
```

- [ ] **Step 7: Verify — open a card, confirm tags are gone, title/textarea look correct in both light and dark**

- [ ] **Step 8: Commit**

```bash
git add src/editor/CardDetail.tsx
git commit -m "feat: remove tags from CardDetail and restyle with design tokens"
```

---

## Task 6: Preferences

**Files:**
- Modify: `src/editor/Preferences.tsx`

Key changes:
- Section headings: UPPERCASE label + divider line
- Theme select + hotkey inputs: token-ified border/bg/text
- Remove dark: prefixes (tokens handle it)

- [ ] **Step 1: Update container**

Change:
```tsx
<div className="p-6 flex flex-col gap-6 max-w-md">
  <h2 className="text-lg font-semibold dark:text-gray-100">환경설정</h2>
```
To:
```tsx
<div className="p-6 flex flex-col gap-6 max-w-md">
  <h2 className="text-base font-semibold text-foreground">환경설정</h2>
```

- [ ] **Step 2: Update section headers (there are two: 표시 and 단축키)**

Change both `<div className="flex items-center gap-3">` section header blocks.

Each currently has:
```tsx
<div className="flex items-center gap-3">
  <h3 className="font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">표시</h3>
  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
</div>
```

Replace with (update both, 표시 and 단축키):
```tsx
<div className="flex items-center gap-3">
  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">표시</span>
  <div className="flex-1 h-px bg-border" />
</div>
```
(and same for 단축키)

- [ ] **Step 3: Update checkbox**

Change:
```tsx
<input type="checkbox" checked={prefs.highlightCurrentParagraph}
  className="rounded border-gray-300 text-gray-900 focus:ring-gray-300 focus:ring-offset-0 dark:border-gray-600"
```
To:
```tsx
<input type="checkbox" checked={prefs.highlightCurrentParagraph}
  className="rounded border-border text-foreground focus:ring-ring focus:ring-offset-0"
```

- [ ] **Step 4: Update theme select**

Change:
```tsx
<select value={prefs.theme} className="border border-gray-200 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" ...>
```
To:
```tsx
<select value={prefs.theme} className="border border-input rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:border-ring" ...>
```

- [ ] **Step 5: Update hotkey inputs**

Change the input className inside the `map`:
```tsx
className={`border rounded-md px-2 py-1 text-sm font-mono w-32 focus:outline-none dark:bg-transparent dark:text-gray-100 ${
  hotkeyErrors[key] ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-gray-400 dark:border-gray-600 dark:focus:border-gray-500"
}`}
```
To:
```tsx
className={`border rounded-md px-2 py-1 text-sm font-mono w-32 bg-background text-foreground text-right focus:outline-none ${
  hotkeyErrors[key] ? "border-destructive focus:border-destructive" : "border-input focus:border-ring"
}`}
```

- [ ] **Step 6: Update hotkey label text**

Change:
```tsx
<span className="text-sm text-gray-600 dark:text-gray-400">{HOTKEY_LABELS[key]}</span>
```
To:
```tsx
<span className="text-sm text-muted-foreground">{HOTKEY_LABELS[key]}</span>
```

- [ ] **Step 7: Update error message**

Change:
```tsx
<p className="text-xs text-red-600">{hotkeyErrors[key]}</p>
```
To:
```tsx
<p className="text-xs text-destructive">{hotkeyErrors[key]}</p>
```

- [ ] **Step 8: Verify visually**

- [ ] **Step 9: Commit**

```bash
git add src/editor/Preferences.tsx
git commit -m "feat: restyle Preferences with design tokens"
```

---

## Task 7: ZonePicker Math Utilities

**Files:**
- Modify: `src/utils/zonePickerMath.ts`

Add pixel-based types and conversion functions. Keep existing `CellRect` and cell functions — they are no longer used by ZonePicker but may be referenced elsewhere.

- [ ] **Step 1: Add `DisplayRect`, `displayRectToPhysicalBounds`, and `clampDisplayRect` to `zonePickerMath.ts`**

Append to end of file:

```ts
/** A selection rectangle in minimap display pixels */
export interface DisplayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Convert a display-pixel rect (minimap coordinates) to physical global bounds.
 * Minimap display px → monitor logical px (via minimapScale) → physical px (via scaleFactor).
 */
export function displayRectToPhysicalBounds(
  rect: DisplayRect,
  monitor: MonitorInfo
): PhysicalBounds {
  const scale = minimapScale(monitor);
  const logX = rect.x / scale;
  const logY = rect.y / scale;
  const logW = rect.w / scale;
  const logH = rect.h / scale;
  return {
    x: Math.round((logX + monitor.x) * monitor.scaleFactor),
    y: Math.round((logY + monitor.y) * monitor.scaleFactor),
    width: Math.round(logW * monitor.scaleFactor),
    height: Math.round(logH * monitor.scaleFactor),
  };
}

/**
 * Clamp a DisplayRect so it stays within the minimap canvas.
 * Origin is clamped to >= 0; width/height are clamped so the rect doesn't extend past the edge.
 */
export function clampDisplayRect(
  rect: DisplayRect,
  mapW: number,
  mapH: number
): DisplayRect {
  const x = Math.max(0, Math.min(rect.x, mapW));
  const y = Math.max(0, Math.min(rect.y, mapH));
  const w = Math.max(0, Math.min(rect.w, mapW - x));
  const h = Math.max(0, Math.min(rect.h, mapH - y));
  return { x, y, w, h };
}
```

- [ ] **Step 2: Verify TypeScript compiles — run `pnpm build` or check for type errors in IDE**

- [ ] **Step 3: Commit**

```bash
git add src/utils/zonePickerMath.ts
git commit -m "feat: add DisplayRect and pixel-based math utilities to zonePickerMath"
```

---

## Task 8: ZonePicker Component Rewrite

**Files:**
- Modify: `src/editor/ZonePicker.tsx`

Replaces the entire component. Removes: preset buttons, preset math imports, cell-based drag logic.
Adds: `DisplayRect` state, hit-test logic, resize/move/create drag modes, corner handle rendering.

- [ ] **Step 1: Replace entire `ZonePicker.tsx` with new implementation**

```tsx
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  MonitorInfo,
  MINIMAP_DISPLAY_WIDTH,
  minimapScale,
  DisplayRect,
  displayRectToPhysicalBounds,
  clampDisplayRect,
} from "../utils/zonePickerMath";
import { usePrefsStore } from "../store/usePrefsStore";

const HANDLE_HIT = 10; // px radius around corner that triggers resize

type Corner = "tl" | "tr" | "bl" | "br";

type DragState =
  | { type: "create"; ox: number; oy: number }
  | { type: "move"; offX: number; offY: number }
  | { type: "resize"; anchorX: number; anchorY: number };

/** Return which corner (if any) the point is near */
function nearCorner(px: number, py: number, r: DisplayRect): Corner | null {
  const corners: Array<[Corner, number, number]> = [
    ["tl", r.x,       r.y],
    ["tr", r.x + r.w, r.y],
    ["bl", r.x,       r.y + r.h],
    ["br", r.x + r.w, r.y + r.h],
  ];
  for (const [corner, cx, cy] of corners) {
    if (Math.abs(px - cx) <= HANDLE_HIT && Math.abs(py - cy) <= HANDLE_HIT) {
      return corner;
    }
  }
  return null;
}

function insideRect(px: number, py: number, r: DisplayRect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function anchorForCorner(corner: Corner, r: DisplayRect): { anchorX: number; anchorY: number } {
  return {
    anchorX: corner.includes("l") ? r.x + r.w : r.x,
    anchorY: corner.includes("t") ? r.y + r.h : r.y,
  };
}

export default function ZonePicker() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [activeMonitorIdx, setActiveMonitorIdx] = useState(0);
  const [selection, setSelection] = useState<DisplayRect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCursor, setHoverCursor] = useState("crosshair");
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<MonitorInfo[]>("get_monitors").then(setMonitors).catch(console.error);
  }, []);

  const monitor = monitors[activeMonitorIdx];

  function getMapXY(e: React.MouseEvent): { x: number; y: number } | null {
    if (!mapRef.current) return null;
    const rect = mapRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function applySelection(r: DisplayRect) {
    if (!monitor) return;
    const bounds = displayRectToPhysicalBounds(r, monitor);
    invoke("set_overlay_bounds", {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
      .then(() =>
        usePrefsStore.getState().updatePrefs({
          overlayX: bounds.x,
          overlayY: bounds.y,
          overlayWidth: bounds.width,
          overlayHeight: bounds.height,
        })
      )
      .catch(console.error);
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const pt = getMapXY(e);
    if (!pt || !monitor) return;

    if (selection) {
      const corner = nearCorner(pt.x, pt.y, selection);
      if (corner) {
        setDrag({ type: "resize", ...anchorForCorner(corner, selection) });
        return;
      }
      if (insideRect(pt.x, pt.y, selection)) {
        setDrag({ type: "move", offX: pt.x - selection.x, offY: pt.y - selection.y });
        return;
      }
    }
    // Create new selection
    setDrag({ type: "create", ox: pt.x, oy: pt.y });
    setSelection({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pt = getMapXY(e);
    if (!pt) return;

    // Update hover cursor when not dragging
    if (!drag && selection) {
      const corner = nearCorner(pt.x, pt.y, selection);
      if (corner) {
        setHoverCursor(CORNER_CURSORS[corner]);
      } else if (insideRect(pt.x, pt.y, selection)) {
        setHoverCursor("move");
      } else {
        setHoverCursor("crosshair");
      }
    }

    if (!drag || !monitor) return;

    const scale = minimapScale(monitor);
    const mapW = MINIMAP_DISPLAY_WIDTH;
    const mapH = Math.round(monitor.height * scale);

    if (drag.type === "create") {
      setSelection(clampDisplayRect({
        x: Math.min(drag.ox, pt.x),
        y: Math.min(drag.oy, pt.y),
        w: Math.abs(pt.x - drag.ox),
        h: Math.abs(pt.y - drag.oy),
      }, mapW, mapH));
    } else if (drag.type === "move" && selection) {
      setSelection(clampDisplayRect({
        x: pt.x - drag.offX,
        y: pt.y - drag.offY,
        w: selection.w,
        h: selection.h,
      }, mapW, mapH));
    } else if (drag.type === "resize") {
      setSelection(clampDisplayRect({
        x: Math.min(drag.anchorX, pt.x),
        y: Math.min(drag.anchorY, pt.y),
        w: Math.abs(pt.x - drag.anchorX),
        h: Math.abs(pt.y - drag.anchorY),
      }, mapW, mapH));
    }
  }

  function handleMouseUp() {
    if (selection && selection.w > 2 && selection.h > 2) {
      applySelection(selection);
    }
    setDrag(null);
  }

  const CORNER_CURSORS: Record<Corner, string> = {
    tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize",
  };

  function mapCursor(): string {
    if (drag) {
      if (drag.type === "move") return "move";
      if (drag.type === "resize") return "nwse-resize";
    }
    return hoverCursor;
  }

  if (!monitor) {
    return <div className="p-4 text-muted-foreground text-sm">모니터 정보를 불러오는 중...</div>;
  }

  const scale = minimapScale(monitor);
  const mapH = Math.round(monitor.height * scale);
  const bounds = selection ? displayRectToPhysicalBounds(selection, monitor) : null;

  return (
    <div className="p-5 flex flex-col gap-4 max-w-xs">
      <p className="text-xs text-muted-foreground">
        모서리를 드래그해 크기 조절 · 내부를 드래그해 위치 이동
      </p>

      {monitors.length > 1 && (
        <div className="flex gap-1">
          {monitors.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveMonitorIdx(i); setSelection(null); setDrag(null); }}
              className={`h-[22px] px-2.5 text-xs rounded-md font-medium border transition-colors ${
                i === activeMonitorIdx
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {m.name || `모니터 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="border border-border rounded-md overflow-hidden">
        <div
          ref={mapRef}
          className="relative bg-zinc-900 select-none"
          style={{ width: MINIMAP_DISPLAY_WIDTH, height: mapH, cursor: mapCursor() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (drag && selection && selection.w > 2 && selection.h > 2) {
              applySelection(selection);
            }
            setDrag(null);
          }}
        >
          {/* Grid lines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: `${Math.round(MINIMAP_DISPLAY_WIDTH / 12)}px ${Math.round(mapH / 8)}px`,
            }}
          />

          {/* Camera position hint */}
          <div
            className="absolute top-1.5 pointer-events-none text-zinc-600 flex justify-center"
            style={{ left: MINIMAP_DISPLAY_WIDTH / 2 - 6 }}
          >
            <Camera size={12} />
          </div>

          {/* Monitor dimensions label */}
          <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-zinc-600 pointer-events-none">
            {monitor.width}×{monitor.height}
          </div>

          {/* Selection rect with corner handles */}
          {selection && selection.w > 0 && selection.h > 0 && (
            <div
              className="absolute border-[1.5px] border-amber-400 bg-amber-400/15 pointer-events-none"
              style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
            >
              {(["tl", "tr", "bl", "br"] as Corner[]).map((c) => (
                <div
                  key={c}
                  className="absolute w-2 h-2 bg-amber-400 rounded-[2px]"
                  style={{
                    left:   c.includes("l") ? -4 : undefined,
                    right:  c.includes("r") ? -4 : undefined,
                    top:    c.includes("t") ? -4 : undefined,
                    bottom: c.includes("b") ? -4 : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Coordinates bar */}
        <div className="px-2.5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
          {bounds
            ? `X: ${Math.round(bounds.x / monitor.scaleFactor)}  Y: ${Math.round(bounds.y / monitor.scaleFactor)}  W: ${Math.round(bounds.width / monitor.scaleFactor)}  H: ${Math.round(bounds.height / monitor.scaleFactor)}  (논리px)`
            : `${monitor.width}×${monitor.height}`}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
pnpm build 2>&1 | head -30
```
Expected: no type errors. If errors, fix before continuing.

- [ ] **Step 3: Verify interaction via `pnpm tauri dev`**

- Navigate to 위치 tab
- Draw a selection by dragging on empty canvas → amber rect appears
- Drag inside selection → rect moves, size preserved
- Drag a corner handle → rect resizes, opposite corner stays fixed
- Preset buttons are gone
- Coords bar updates on drag

- [ ] **Step 4: Commit**

```bash
git add src/editor/ZonePicker.tsx
git commit -m "feat: rewrite ZonePicker with pixel-based resize/move interaction"
```

---

## Final Verification

- [ ] Run `pnpm tauri dev`, open editor window
- [ ] Switch between light and dark themes via Preferences — confirm all tokens flip correctly
- [ ] Check all 3 tabs: 카드 편집, 환경설정, 위치
- [ ] Confirm no tag UI anywhere in CardDetail
- [ ] Confirm ZonePicker presets are gone, new interaction works

```bash
git log --oneline -8
```

Expected output should show all 8 commits from this plan.
