import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Preferences, DEFAULT_PREFS } from "../types";
import { clientId } from "./clientId";

interface PrefsUpdatedPayload {
  prefs: Preferences;
  clientId?: string | null;
}

interface PrefsStore {
  prefs: Preferences;
  hydrate: () => Promise<void>;
  updatePrefs: (patch: Partial<Preferences>) => Promise<void>;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: DEFAULT_PREFS,

  hydrate: async () => {
    const saved = await invoke<Preferences>("read_prefs");
    if (saved) {
      set({ prefs: { ...DEFAULT_PREFS, ...saved } });
    }
  },

  updatePrefs: async (patch) => {
    const previous = get().prefs;
    const updated = { ...previous, ...patch };
    set({ prefs: updated });
    try {
      await invoke("write_prefs", { prefs: updated, clientId });
    } catch (error) {
      set({ prefs: previous });
      throw error;
    }
  },
}));

// ADR-004: Rust 브로드캐스트 수신 → 스토어 업데이트
const prefsUpdatedListener = listen<PrefsUpdatedPayload>("prefs-updated", (event) => {
  if (event.payload.clientId === clientId) {
    return;
  }
  usePrefsStore.setState({ prefs: { ...DEFAULT_PREFS, ...event.payload.prefs } });
}).catch(console.error);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void prefsUpdatedListener.then((unlisten) => {
      if (typeof unlisten === "function") {
        unlisten();
      }
    });
  });
}
