import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Preferences, DEFAULT_PREFS } from "../types";

interface PrefsStore {
  prefs: Preferences;
  hydrate: () => Promise<void>;
  updatePrefs: (patch: Partial<Preferences>) => Promise<void>;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: DEFAULT_PREFS,

  hydrate: async () => {
    const saved = await invoke<Preferences | null>("read_prefs");
    if (saved) {
      set({ prefs: { ...DEFAULT_PREFS, ...saved } });
    }
  },

  updatePrefs: async (patch) => {
    const updated = { ...get().prefs, ...patch };
    set({ prefs: updated });
    await invoke("write_prefs", { prefs: updated });
  },
}));

listen<Preferences>("prefs-updated", (event) => {
  usePrefsStore.setState({ prefs: { ...DEFAULT_PREFS, ...event.payload } });
}).catch(console.error);
