import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Flower } from '@/types'

interface CartItem {
  flower: Flower
  quantity: number
}

interface CartState {
  items: CartItem[]
  totalItems: number
  totalPrice: number
}

interface CartActions {
  addItem: (flower: Flower, quantity?: number) => void
  removeItem: (flowerId: number) => void
  updateQuantity: (flowerId: number, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (flowerId: number) => number
}

type CartStore = CartState & CartActions

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // State
      items: [],
      totalItems: 0,
      totalPrice: 0,

      // Actions
      addItem: (flower, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.flower.id === flower.id)
          
          if (existingItem) {
            // Update existing item
            const updatedItems = state.items.map(item =>
              item.flower.id === flower.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
            
            const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
            const totalPrice = updatedItems.reduce((sum, item) => sum + (item.flower.price * item.quantity), 0)
            
            return {
              items: updatedItems,
              totalItems,
              totalPrice
            }
          } else {
            // Add new item
            const newItems = [...state.items, { flower, quantity }]
            const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0)
            const totalPrice = newItems.reduce((sum, item) => sum + (item.flower.price * item.quantity), 0)
            
            return {
              items: newItems,
              totalItems,
              totalPrice
            }
          }
        })
      },

      removeItem: (flowerId) => {
        set((state) => {
          const updatedItems = state.items.filter(item => item.flower.id !== flowerId)
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.flower.price * item.quantity), 0)
          
          return {
            items: updatedItems,
            totalItems,
            totalPrice
          }
        })
      },

      updateQuantity: (flowerId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return get().removeItem(flowerId)
          }
          
          const updatedItems = state.items.map(item =>
            item.flower.id === flowerId
              ? { ...item, quantity }
              : item
          )
          
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0)
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.flower.price * item.quantity), 0)
          
          return {
            items: updatedItems,
            totalItems,
            totalPrice
          }
        })
      },

      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalPrice: 0
        })
      },

      getItemQuantity: (flowerId) => {
        const state = get()
        const item = state.items.find(item => item.flower.id === flowerId)
        return item ? item.quantity : 0
      }
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice
      })
    }
  )
) 