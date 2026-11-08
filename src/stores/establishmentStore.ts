import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EstablishmentState {
  selectedEstablishmentId: string | null;
  setSelectedEstablishment: (id: string | null) => void;
}

export const useEstablishmentStore = create<EstablishmentState>()(
  persist(
    (set) => ({
      selectedEstablishmentId: null,
      setSelectedEstablishment: (id) => set({ selectedEstablishmentId: id }),
    }),
    {
      name: 'establishment-storage',
    }
  )
);
