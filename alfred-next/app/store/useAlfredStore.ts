import { create } from 'zustand';

interface AlfredStore {
  matrixText: string;
  setMatrixText: (text: string) => void;
  contextText: string;
  setContextText: (text: string) => void;
}

export const useAlfredStore = create<AlfredStore>((set) => ({
  matrixText: '',
  setMatrixText: (text) => set({ matrixText: text }),
  contextText: '',
  setContextText: (text) => set({ contextText: text }),
}));
