/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, Device, Product, OrderItem } from '@/types'

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

interface AppState {
  isAuthenticated: boolean
  currentUser: User | null
  currentDevice: Device | null
  tables: number[]
  currentTableNumber: number | null
  products: Product[]
  users: User[]
  draftOrders: Record<number, OrderItem[]>
}

interface AppActions {
  setAuthenticated: (status: boolean) => void
  setCurrentUser: (user: User | null) => void
  setCurrentDevice: (device: Device | null) => void
  logout: () => void
  setTables: (tables: number[]) => void
  setCurrentTable: (tableNumber: number | null) => void
  setProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (productId: string, updates: Partial<Product>) => void
  setUsers: (users: User[]) => void
  addItemToDraft: (tableNumber: number, product: Product, addedBy: string) => void
  incrementDraftItem: (tableNumber: number, itemId: string) => void
  decrementDraftItem: (tableNumber: number, itemId: string) => void
  removeDraftItem: (tableNumber: number, itemId: string) => void
  clearDraftForTable: (tableNumber: number) => void
}

// Combine state and actions for the store type
type AppStore = AppState & AppActions

const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
  currentDevice: null,
  tables: Array.from({ length: 12 }, (_, i) => i + 1),
  currentTableNumber: 1,
  products: [],
  users: [],
  draftOrders: {},
}

export const useAppStore = create<AppStore>(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth state
      setAuthenticated: (status: boolean) => set({ isAuthenticated: status }),
      setCurrentUser: (user: User | null) => set({ currentUser: user }),
      setCurrentDevice: (device: Device | null) => set({ currentDevice: device }),
      logout: () => set({ ...initialState }),

  // Tables
  setTables: (tables: number[]) => set({ tables }),
  setCurrentTable: (tableNumber: number | null) => set({ currentTableNumber: tableNumber }),

  // Products
  setProducts: (products: Product[]) => set({ products }),
  addProduct: (product: Product) => set({ products: [...get().products, product] }),
  updateProduct: (productId: string, updates: Partial<Product>) =>
    set({
      products: get().products.map(p => (p.id === productId ? { ...p, ...updates } : p)),
    }),

  // Users
  setUsers: (users: User[]) => set({ users }),

  // Draft orders by table
  addItemToDraft: (tableNumber: number, product: Product, addedBy: string) =>
    set(state => {
      const tableKey = tableNumber || 1
      const currentItems = state.draftOrders[tableKey] || []
      const existing = currentItems.find(item => item.productId === product.id)

      if (existing) {
        return {
          draftOrders: {
            ...state.draftOrders,
            [tableKey]: currentItems.map(item =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          },
        }
      }

      const newItem: OrderItem = {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        addedAt: new Date(),
        addedBy,
        canBeDeleted: true,
      }

      return {
        draftOrders: {
          ...state.draftOrders,
          [tableKey]: [...currentItems, newItem],
        },
      }
    }),

  incrementDraftItem: (tableNumber: number, itemId: string) =>
    set(state => {
      const tableKey = tableNumber || 1
      const currentItems = state.draftOrders[tableKey] || []
      return {
        draftOrders: {
          ...state.draftOrders,
          [tableKey]: currentItems.map(item =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
          ),
        },
      }
    }),

  decrementDraftItem: (tableNumber: number, itemId: string) =>
    set(state => {
      const tableKey = tableNumber || 1
      const currentItems = state.draftOrders[tableKey] || []
      return {
        draftOrders: {
          ...state.draftOrders,
          [tableKey]: currentItems
            .map(item =>
              item.id === itemId
                ? { ...item, quantity: Math.max(1, item.quantity - 1) }
                : item
            )
            .filter(item => item.quantity > 0),
        },
      }
    }),

  removeDraftItem: (tableNumber: number, itemId: string) =>
    set(state => {
      const tableKey = tableNumber || 1
      const currentItems = state.draftOrders[tableKey] || []
      return {
        draftOrders: {
          ...state.draftOrders,
          [tableKey]: currentItems.filter(item => item.id !== itemId),
        },
      }
    }),

  clearDraftForTable: (tableNumber: number) =>
    set(state => ({
      draftOrders: {
        ...state.draftOrders,
        [tableNumber || 1]: [],
      },
    })),
    }),
    {
      name: 'app-store',
      // Persistir estado crítico: auth + órdenes en draft
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        currentDevice: state.currentDevice,
        currentTableNumber: state.currentTableNumber,
        draftOrders: state.draftOrders, // CRÍTICO: órdenes en progreso
      }),
    }
  )
)

// Alias to maintain compatibility with older imports
export const useStore = useAppStore