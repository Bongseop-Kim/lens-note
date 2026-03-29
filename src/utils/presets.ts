import type { ZonePreset } from "../types";

export const BUILT_IN_PRESETS: ZonePreset[] = [
  { id: "bl-left", label: "Left", x: 0, y: 0, w: 0.5, h: 1, builtIn: true },
  { id: "bl-right", label: "Right", x: 0.5, y: 0, w: 0.5, h: 1, builtIn: true },
  { id: "bl-top", label: "Top", x: 0, y: 0, w: 1, h: 0.5, builtIn: true },
  { id: "bl-bottom", label: "Bottom", x: 0, y: 0.5, w: 1, h: 0.5, builtIn: true },
  { id: "bl-top-left", label: "Top Left", x: 0, y: 0, w: 0.5, h: 0.5, builtIn: true },
  { id: "bl-top-right", label: "Top Right", x: 0.5, y: 0, w: 0.5, h: 0.5, builtIn: true },
  { id: "bl-bottom-left", label: "Bottom Left", x: 0, y: 0.5, w: 0.5, h: 0.5, builtIn: true },
  { id: "bl-bottom-right", label: "Bottom Right", x: 0.5, y: 0.5, w: 0.5, h: 0.5, builtIn: true },
  { id: "bl-top-third", label: "Top Third", x: 0, y: 0, w: 1, h: 1 / 3, builtIn: true },
  { id: "bl-mid-third", label: "Middle Third", x: 0, y: 1 / 3, w: 1, h: 1 / 3, builtIn: true },
  { id: "bl-bot-third", label: "Bottom Third", x: 0, y: 2 / 3, w: 1, h: 1 / 3, builtIn: true },
  { id: "bl-left-third", label: "Left Third", x: 0, y: 0, w: 1 / 3, h: 1, builtIn: true },
  { id: "bl-ctr-third", label: "Center Third", x: 1 / 3, y: 0, w: 1 / 3, h: 1, builtIn: true },
  { id: "bl-right-third", label: "Right Third", x: 2 / 3, y: 0, w: 1 / 3, h: 1, builtIn: true },
];
