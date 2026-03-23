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

export function searchCards(query: string): Card[] {
  if (!fuse || !query.trim()) return [];
  return fuse.search(query).map((r) => r.item);
}
