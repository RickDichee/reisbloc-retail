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
  isInitializing: boolean
  isAuthenticated: boolean
  currentUser: User | null
  currentDevice: Device | null
  tickets: number[]  // Números de ticket (antes "tables" - legado restaurante)
  currentTicketNumber: number | null  // (antes "currentTableNumber")
  // Legacy compatibility
  tables?: number[]  // @deprecated - usar tickets
  currentTableNumber?: number | null  // @deprecated - usar currentTicketNumber
  products: Product[]
  users: User[]
  draftOrders: Record<number, OrderItem[]>  // key = ticket number
  organizationSettings: any | null
  orgPlan: string        // 'free' | 'pro' | 'enterprise'
  orgPlanNote: string | null
  accessibility: AccessibilityState
}

interface AppActions {
  setInitializing: (status: boolean) => void
  setAuthenticated: (status: boolean) => void
  setCurrentUser: (user: User | null) => void
  setCurrentDevice: (device: Device | null) => void
  logout: () => void
  setTickets: (tickets: number[]) => void
  setCurrentTicket: (ticketNumber: number | null) => void  // (antes setCurrentTable)
  setProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (productId: string, updates: Partial<Product>) => void
  setUsers: (users: User[]) => void
  addItemToDraft: (ticketNumber: number, product: Product, addedBy: string) => void  // (antes addItemToDraft con tableNumber)
  incrementDraftItem: (ticketNumber: number, itemId: string) => void
  decrementDraftItem: (ticketNumber: number, itemId: string) => void
  removeDraftItem: (ticketNumber: number, itemId: string) => void
  updateDraftItemPrice: (ticketNumber: number, itemId: string, newPrice: number) => void
  clearDraftForTicket: (ticketNumber: number) => void  // (antes clearDraftForTable)
  setOrganizationSettings: (settings: any) => void
  setOrgPlan: (plan: string, note?: string | null) => void
  setAccessibility: (settings: Partial<AccessibilityState>) => void
  // Legacy compatibility
  setTables?: (tables: number[]) => void  // @deprecated
  setCurrentTable?: (tableNumber: number | null) => void  // @deprecated
  addItemToDraftLegacy?: (tableNumber: number, product: Product, addedBy: string) => void  // @deprecated
  incrementDraftItemLegacy?: (tableNumber: number, itemId: string) => void  // @deprecated
  decrementDraftItemLegacy?: (tableNumber: number, itemId: string) => void  // @deprecated
  removeDraftItemLegacy?: (tableNumber: number, itemId: string) => void  // @deprecated
  clearDraftForTable?: (tableNumber: number) => void  // @deprecated
}

export interface AccessibilityState {
  highContrast: boolean
  largeText: boolean
  animations: boolean
}

// Combine state and actions for the store type
type AppStore = AppState & AppActions

const initialState: AppState = {
  isInitializing: true,
  isAuthenticated: false,
  currentUser: null,
  currentDevice: null,
  tickets: Array.from({ length: 12 }, (_, i) => i + 1),  // Números de ticket disponibles
  currentTicketNumber: 1,  // Ticket actual seleccionado
  products: [],
  users: [],
  draftOrders: {},
  organizationSettings: null,
  orgPlan: 'free',
  orgPlanNote: null,
  // ♿ Accesibilidad (Persistente por dispositivo)
  accessibility: {
    highContrast: false,
    largeText: false,
    animations: true
  }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth state
      setInitializing: (status: boolean) => set({ isInitializing: status }),
      setAuthenticated: (status: boolean) => set({ isAuthenticated: status }),
      setCurrentUser: (user: User | null) => set({ currentUser: user }),
      setCurrentDevice: (device: Device | null) => set({ currentDevice: device }),
      logout: () => set({ ...initialState }),

      // Tickets (números de orden)
      setTickets: (tickets: number[]) => set({ tickets }),
      setCurrentTicket: (ticketNumber: number | null) => set({ currentTicketNumber: ticketNumber }),
      
      // Legacy compatibility - mantener nombres antiguos para compatibilidad
      setTables: (tables: number[]) => set({ tickets: tables }),
      setCurrentTable: (tableNumber: number | null) => set({ currentTicketNumber: tableNumber }),
      clearDraftForTable: (tableNumber: number) => set(state => ({
        draftOrders: { ...state.draftOrders, [tableNumber || 1]: [] }
      })),
      clearDraftForTicket: (ticketNumber: number) => set(state => ({
        draftOrders: { ...state.draftOrders, [ticketNumber || 1]: [] }
      })),

      // Products
      setProducts: (products: Product[]) => set({ products }),
      addProduct: (product: Product) => set({ products: [...get().products, product] }),
      updateProduct: (productId: string, updates: Partial<Product>) =>
        set({
          products: get().products.map(p => (p.id === productId ? { ...p, ...updates } : p)),
        }),

      // Users
      setUsers: (users: User[]) => set({ users }),

      // Draft orders by ticket
      addItemToDraft: (ticketNumber: number, product: Product, addedBy: string) =>
        set(state => {
          const ticketKey = ticketNumber || 1
          const currentItems = state.draftOrders[ticketKey] || []
          const existing = currentItems.find(item => item.productId === product.id)

          if (existing) {
            return {
              draftOrders: {
                ...state.draftOrders,
                [ticketKey]: currentItems.map(item =>
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
            parentId: product.parentId,
            packQuantity: product.packQuantity,
          }

          return {
            draftOrders: {
              ...state.draftOrders,
              [ticketKey]: [...currentItems, newItem],
            },
          }
        }),

      incrementDraftItem: (ticketNumber: number, itemId: string) =>
        set(state => {
          const ticketKey = ticketNumber || 1
          const currentItems = state.draftOrders[ticketKey] || []
          return {
            draftOrders: {
              ...state.draftOrders,
              [ticketKey]: currentItems.map(item =>
                item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
              ),
            },
          }
        }),

      decrementDraftItem: (ticketNumber: number, itemId: string) =>
        set(state => {
          const ticketKey = ticketNumber || 1
          const currentItems = state.draftOrders[ticketKey] || []
          return {
            draftOrders: {
              ...state.draftOrders,
              [ticketKey]: currentItems
                .map(item =>
                  item.id === itemId
                    ? { ...item, quantity: item.quantity - 1 }
                    : item
                )
                .filter(item => item.quantity > 0),
            },
          }
        }),

      removeDraftItem: (ticketNumber: number, itemId: string) =>
        set(state => {
          const ticketKey = ticketNumber || 1
          const currentItems = state.draftOrders[ticketKey] || []
          return {
            draftOrders: {
              ...state.draftOrders,
              [ticketKey]: currentItems.filter(item => item.id !== itemId),
            },
          }
        }),

      updateDraftItemPrice: (ticketNumber: number, itemId: string, newPrice: number) =>
        set(state => {
          const ticketKey = ticketNumber || 1
          const currentItems = state.draftOrders[ticketKey] || []
          return {
            draftOrders: {
              ...state.draftOrders,
              [ticketKey]: currentItems.map(item =>
                item.id === itemId ? { ...item, unitPrice: newPrice } : item
              ),
            },
          }
        }),

      // Clear draft functions - legacy + new naming
      clearDraftForTicket: (ticketNumber: number) =>
        set(state => ({
          draftOrders: {
            ...state.draftOrders,
            [ticketNumber || 1]: [],
          },
        })),

      // Legacy alias
      clearDraftForTable: (tableNumber: number) =>
        set(state => ({
          draftOrders: {
            ...state.draftOrders,
            [tableNumber || 1]: [],
          },
        })),

      // Organization Settings
      setOrganizationSettings: (settings: any) => set({ organizationSettings: settings }),

      // Plan del tenant
      setOrgPlan: (plan: string, note: string | null = null) => set({ orgPlan: plan, orgPlanNote: note }),

      // Accessibility Action
      setAccessibility: (newSettings) => set((state) => ({
        accessibility: { ...state.accessibility, ...newSettings }
      })),
    }),
    {
      name: 'app-store',
      // Persistir estado crítico: auth + órdenes en draft
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        currentDevice: state.currentDevice,
        currentTicketNumber: state.currentTicketNumber,
        draftOrders: state.draftOrders,
        organizationSettings: state.organizationSettings,
        orgPlan: state.orgPlan,
        orgPlanNote: state.orgPlanNote,
        accessibility: state.accessibility,
      } as any),
    }
  )
)

// Alias to maintain compatibility with older imports
export const useStore = useAppStore