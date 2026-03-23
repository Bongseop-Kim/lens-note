import Fuse from "fuse.js";
import { Card } from "../types";

let fuse: Fuse<Card> | null = null;

export function initSearch(cards: Card[]) {
  fuse = new Fuse(cards, {
    keys: ["title", "body"],
    threshold: 0.4,
    includeScore: true,
  });
}

export function resetSearch() {
  fuse = null;
}

export function searchCards(query: string): Card[] {
  if (!query.trim()) return [];
  if (!fuse) {
    throw new Error("Search index has not been initialized");
  }
  return fuse.search(query).map((r) => r.item);
}
