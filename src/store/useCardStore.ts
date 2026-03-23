import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Card } from "../types";
import { clientId } from "./clientId";

interface CardsUpdatedPayload {
  cards: Card[];
  clientId?: string | null;
}

interface CardStore {
  cards: Card[];
  currentIndex: number;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setCards: (cards: Card[]) => void;
  setCurrentIndex: (index: number) => void;
  addCard: (
    card: Omit<Card, "id" | "order" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reorderCards: (cards: Card[]) => Promise<void>;
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  currentIndex: 0,
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const cards = await invoke<Card[]>("read_cards");
      set({ cards, isLoading: false });
    } catch (error) {
      console.error("Failed to hydrate cards", error);
      set({ cards: [], isLoading: false });
    }
  },

  setCards: (cards) => set({ cards }),
  setCurrentIndex: (index) => set({ currentIndex: index }),

  addCard: async (partial) => {
    const previous = get().cards;
    const now = new Date().toISOString();
    const newCard: Card = {
      ...partial,
      id: crypto.randomUUID(),
      order: get().cards.length,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...previous, newCard];
    set({ cards: updated });
    try {
      await invoke("write_cards", { cards: updated, clientId });
    } catch (error) {
      set({ cards: previous });
      throw error;
    }
  },

  updateCard: async (id, patch) => {
    const previous = get().cards;
    const updated = previous.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    );
    set({ cards: updated });
    try {
      await invoke("write_cards", { cards: updated, clientId });
    } catch (error) {
      set({ cards: previous });
      throw error;
    }
  },

  deleteCard: async (id) => {
    const previous = get().cards;
    const updated = previous.filter((c) => c.id !== id);
    set({ cards: updated });
    try {
      await invoke("write_cards", { cards: updated, clientId });
    } catch (error) {
      set({ cards: previous });
      throw error;
    }
  },

  reorderCards: async (cards) => {
    const previous = get().cards;
    set({ cards });
    try {
      await invoke("write_cards", { cards, clientId });
    } catch (error) {
      set({ cards: previous });
      throw error;
    }
  },
}));

// ADR-004: Rust 브로드캐스트 수신 → 스토어 업데이트
const cardsUpdatedListener = listen<CardsUpdatedPayload>("cards-updated", (event) => {
  if (event.payload.clientId === clientId) {
    return;
  }
  useCardStore.setState({ cards: event.payload.cards });
}).catch(console.error);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void cardsUpdatedListener.then((unlisten) => {
      if (typeof unlisten === "function") {
        unlisten();
      }
    });
  });
}
