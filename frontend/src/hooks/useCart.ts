import { useCartStore } from '@/store'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { Flower } from '@/types'

export function useCart() {
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    getTotal, 
    getItemCount 
  } = useCartStore()

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiClient.createOrder(orderData)
      return response.data
    },
    onSuccess: () => {
      clearCart()
      toast.success('Заказ создан успешно!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка создания заказа'
      toast.error(message)
    },
  })

  // Add item to cart
  const addToCart = (flower: Flower, quantity: number = 1) => {
    const cartItem = {
      flower_id: flower.id,
      name: flower.name,
      price: flower.price,
      quantity,
      image_url: flower.image_url,
    }

    addItem(cartItem)
    toast.success(`${flower.name} добавлен в корзину`)
  }

  // Remove item from cart
  const removeFromCart = (flowerId: number) => {
    removeItem(flowerId)
    toast.success('Товар удален из корзины')
  }

  // Update item quantity
  const updateItemQuantity = (flowerId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(flowerId)
    } else {
      updateQuantity(flowerId, quantity)
    }
  }

  // Checkout
  const checkout = (deliveryData: any) => {
    if (items.length === 0) {
      toast.error('Корзина пуста')
      return
    }

    const orderData = {
      ...deliveryData,
      items: items.map(item => ({
        flower_id: item.flower_id,
        quantity: item.quantity,
      })),
    }

    createOrderMutation.mutate(orderData)
  }

  return {
    items,
    total: getTotal(),
    itemCount: getItemCount(),
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    checkout,
    isLoading: createOrderMutation.isPending,
  }
} 