import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./tauri";

// ============================================
// APP STORE
// ============================================

interface AppState {
  // Current user
  user: User | null;
  isAuthenticated: boolean;
  
  // UI State
  sidebarCollapsed: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  toggleSidebar: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      sidebarCollapsed: false,
      
      setUser: (user) => set({ 
        user, 
        isAuthenticated: user !== null 
      }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      logout: () => set({
        user: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: "equinox-storage",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// ============================================
// INVOICE DRAFT STORE
// ============================================

interface InvoiceDraftItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountPercent: number;
}

interface InvoiceDraftState {
  clientId: string | null;
  clientName: string;
  clientTaxId: string;
  items: InvoiceDraftItem[];
  notes: string;
  
  // Actions
  setClient: (id: string | null, name: string, taxId: string) => void;
  addItem: (item: Omit<InvoiceDraftItem, "id">) => void;
  updateItem: (id: string, item: Partial<InvoiceDraftItem>) => void;
  removeItem: (id: string) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
  
  // Computed
  getSubtotal: () => number;
  getTaxAmount: () => number;
  getTotal: () => number;
}

export const useInvoiceDraftStore = create<InvoiceDraftState>((set, get) => ({
  clientId: null,
  clientName: "",
  clientTaxId: "",
  items: [],
  notes: "",
  
  setClient: (id, name, taxId) => set({ 
    clientId: id, 
    clientName: name, 
    clientTaxId: taxId 
  }),
  
  addItem: (item) => set((state) => ({
    items: [...state.items, { ...item, id: crypto.randomUUID() }],
  })),
  
  updateItem: (id, updates) => set((state) => ({
    items: state.items.map((item) => 
      item.id === id ? { ...item, ...updates } : item
    ),
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
  
  setNotes: (notes) => set({ notes }),
  
  clear: () => set({
    clientId: null,
    clientName: "",
    clientTaxId: "",
    items: [],
    notes: "",
  }),
  
  getSubtotal: () => {
    return get().items.reduce((acc, item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      return acc + lineTotal;
    }, 0);
  },
  
  getTaxAmount: () => {
    return get().items.reduce((acc, item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      return acc + lineTotal * (item.taxRate / 100);
    }, 0);
  },
  
  getTotal: () => {
    return get().getSubtotal() + get().getTaxAmount();
  },
}));
