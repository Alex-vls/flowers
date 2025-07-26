// User types
export interface User {
  id: number
  email: string
  full_name: string
  phone?: string
  address?: string
  bonus_points: number
  is_verified: boolean
  created_at: string
  role: 'client' | 'admin' | 'courier'
}

// Flower types
export interface Flower {
  id: number
  name: string
  description?: string
  category: string
  price: number
  image_url?: string
  is_available: boolean
  is_seasonal?: boolean
  stock_quantity?: number
  views_count: number
  orders_count: number
  min_order_quantity?: number
  max_order_quantity?: number
  created_at: string
  updated_at?: string
}

// Subscription types
export interface Subscription {
  id: number
  user_id: number
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  custom_days?: number[]
  quantity: number
  price_per_delivery: number
  total_price: number
  status: 'active' | 'paused' | 'cancelled'
  start_date: string
  end_date?: string
  next_delivery_date: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  delivery_address: string
  auto_renewal: boolean
  created_at: string
  updated_at: string
}

// Order types
export interface Order {
  id: number
  order_number: string
  user_id: number
  subscription_id?: number
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  delivery_address: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  delivery_date: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method?: string
  payment_id?: string
  tracking_number?: string
  notes?: string
  created_at: string
  updated_at: string
  items: OrderItem[]
}

export interface OrderItem {
  id: number
  order_id: number
  flower_id: number
  quantity: number
  price: number
  flower: Flower
}

// Payment types
export interface Payment {
  id: number
  order_id: number
  user_id: number
  amount: number
  currency: string
  method: 'yoomoney' | 'card' | 'cash'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  external_id?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

// Bonus types
export interface Bonus {
  id: number
  user_id: number
  points: number
  type: 'referral' | 'purchase' | 'gift' | 'promotion'
  status: 'active' | 'used' | 'expired'
  expires_at?: string
  created_at: string
}

export interface Referral {
  id: number
  referrer_id: number
  referred_id: number
  bonus_paid: boolean
  created_at: string
  referrer: User
  referred: User
}

export interface GiftCertificate {
  id: number
  code: string
  amount?: number
  bouquet_count?: number
  used: boolean
  used_by?: number
  expires_at?: string
  created_at: string
}

// Review types
export interface Review {
  id: number
  user_id: number
  order_id?: number
  flower_id?: number
  rating: number
  title?: string
  content: string
  is_approved: boolean
  is_flagged: boolean
  flagged_reason?: string
  admin_notes?: string
  helpful_votes: number
  total_votes: number
  created_at: string
  updated_at?: string
  user: User
  flower?: Flower
}

// Notification types
export interface Notification {
  id: number
  user_id: number
  type: 'order_update' | 'delivery_reminder' | 'payment' | 'bonus' | 'system'
  channel: 'email' | 'telegram' | 'push' | 'sms'
  title: string
  content: string
  status: 'unread' | 'read'
  is_read: boolean
  metadata?: Record<string, any>
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

// Filter types
export interface FlowerFilter {
  category?: string
  min_price?: number
  max_price?: number
  is_available?: boolean
  is_seasonal?: boolean
  min_rating?: number
  search?: string
  sort_by?: 'name' | 'price' | 'created_at' | 'views_count'
  sort_order?: 'asc' | 'desc'
}

export interface OrderFilter {
  status?: string
  payment_status?: string
  date_from?: string
  date_to?: string
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  email: string
  password: string
  full_name: string
  phone?: string
}

export interface SubscriptionForm {
  name: string
  description?: string
  frequency: string
  custom_days?: number[]
  quantity: number
  delivery_slot: string
  delivery_address: string
  auto_renewal: boolean
}

export interface OrderForm {
  subscription_id?: number
  delivery_address: string
  delivery_slot: string
  delivery_date: string
  items: Array<{
    flower_id: number
    quantity: number
  }>
  notes?: string
} 