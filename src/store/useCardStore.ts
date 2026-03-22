import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Card } from "../types";

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
    const cards = await invoke<Card[]>("read_cards");
    set({ cards, isLoading: false });
  },

  setCards: (cards) => set({ cards }),
  setCurrentIndex: (index) => set({ currentIndex: index }),

  addCard: async (partial) => {
    const now = new Date().toISOString();
    const newCard: Card = {
      ...partial,
      id: crypto.randomUUID(),
      order: get().cards.length,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...get().cards, newCard];
    set({ cards: updated });
    await invoke("write_cards", { cards: updated });
  },

  updateCard: async (id, patch) => {
    const updated = get().cards.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    );
    set({ cards: updated });
    await invoke("write_cards", { cards: updated });
  },

  deleteCard: async (id) => {
    const updated = get().cards.filter((c) => c.id !== id);
    set({ cards: updated });
    await invoke("write_cards", { cards: updated });
  },

  reorderCards: async (cards) => {
    set({ cards });
    await invoke("write_cards", { cards });
  },
}));

// ADR-004: Rust 브로드캐스트 수신 → 스토어 업데이트
listen<Card[]>("cards-updated", (event) => {
  useCardStore.setState({ cards: event.payload });
}).catch(console.error);
