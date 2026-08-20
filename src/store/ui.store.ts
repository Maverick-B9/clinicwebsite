import { create } from 'zustand';

interface UIStore {
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  acknowledgedAllergies: Record<string, boolean>;
  acknowledgeAllergy: (visitId: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  recentSearches: [],
  addRecentSearch: (q) => set((s) => ({
    recentSearches: [q, ...s.recentSearches.filter(x => x !== q)].slice(0, 5)
  })),
  acknowledgedAllergies: {},
  acknowledgeAllergy: (visitId) => set((s) => ({
    acknowledgedAllergies: { ...s.acknowledgedAllergies, [visitId]: true },
  })),
}));
