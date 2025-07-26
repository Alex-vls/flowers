import { useCartStore } from '@/store'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { Flower } from '@/types'
import MetricsService from '@/services/metrics'

export function useCart() {
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart,
    totalItems,
    totalPrice
  } = useCartStore()

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiClient.createOrder(orderData)
      return response.data
    },
    onSuccess: (data) => {
      // Track successful order creation
      MetricsService.trackBeginCheckout(
        items.map(item => ({
          id: item.flower.id.toString(),
          name: item.flower.name,
          category: item.flower.category || 'flowers',
          price: item.flower.price,
          quantity: item.quantity
        })),
        totalPrice
      )
      
      clearCart()
      toast.success('Заказ создан успешно!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка создания заказа'
      toast.error(message)
    },
  })

  // Add item to cart with metrics
  const addToCart = (flower: Flower, quantity: number = 1) => {
    addItem(flower, quantity)
    
    // Track add to cart event
    MetricsService.trackAddToCart({
      id: flower.id.toString(),
      name: flower.name,
      category: flower.category || 'flowers',
      price: flower.price,
      quantity
    })

    toast.success(`${flower.name} добавлен в корзину`)
  }

  // Remove item from cart with metrics
  const removeFromCart = (flowerId: number) => {
    const item = items.find(item => item.flower.id === flowerId)
    
    if (item) {
      // Track remove from cart event
      MetricsService.trackRemoveFromCart({
        id: item.flower.id.toString(),
        name: item.flower.name,
        category: item.flower.category || 'flowers',
        price: item.flower.price,
        quantity: item.quantity
      })
    }

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

  // Get total price - для CartPage
  const getTotalPrice = () => {
    return totalPrice
  }

  // Get total items count - для CartPage  
  const getTotalItems = () => {
    return totalItems
  }

  // Create order - для CartPage
  const createOrder = async (orderData: any) => {
    if (items.length === 0) {
      toast.error('Корзина пуста')
      return null
    }

    const fullOrderData = {
      ...orderData,
      items: items.map(item => ({
        flower_id: item.flower.id,
        quantity: item.quantity,
      })),
      total_amount: totalPrice,
      bonus_points_used: orderData.bonusPointsUsed || 0,
      promo_code: orderData.promoCode || ''
    }

    try {
      const response = await apiClient.createOrder(fullOrderData)
      
      // Track begin checkout
      MetricsService.trackBeginCheckout(
        items.map(item => ({
          id: item.flower.id.toString(),
          name: item.flower.name,
          category: item.flower.category || 'flowers',
          price: item.flower.price,
          quantity: item.quantity
        })),
        totalPrice
      )

      clearCart()
      toast.success('Заказ создан успешно!')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Ошибка создания заказа'
      toast.error(message)
      throw error
    }
  }

  // Checkout (legacy method)
  const checkout = (deliveryData: any) => {
    createOrder(deliveryData)
  }

  // Check if cart is empty
  const isEmpty = () => {
    return items.length === 0
  }

  // Get cart subtotal (without delivery)
  const getSubtotal = () => {
    return totalPrice
  }

  // Calculate delivery fee
  const getDeliveryFee = (subtotal: number) => {
    return subtotal >= 1000 ? 0 : 300 // Бесплатная доставка от 1000₽
  }

  // Get cart summary for checkout
  const getCartSummary = () => {
    const subtotal = getSubtotal()
    const deliveryFee = getDeliveryFee(subtotal)
    const total = subtotal + deliveryFee

    return {
      subtotal,
      deliveryFee,
      total,
      itemsCount: getTotalItems(),
      items: items
    }
  }

  return {
    items,
    total: totalPrice,
    itemCount: totalItems,
    addToCart,
    removeFromCart,
    updateItemQuantity,
    clearCart,
    checkout,
    createOrder,
    getTotalPrice,
    getTotalItems,
    isEmpty,
    getSubtotal,
    getDeliveryFee,
    getCartSummary,
    isLoading: createOrderMutation.isPending,
    updateQuantity: updateItemQuantity, // Alias для совместимости
    removeItem: removeFromCart, // Alias для совместимости
  }
} 