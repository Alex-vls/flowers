// Flower categories
export const FLOWER_CATEGORIES = [
  { id: 'roses', name: 'Розы', icon: '🌹' },
  { id: 'tulips', name: 'Тюльпаны', icon: '🌷' },
  { id: 'lilies', name: 'Лилии', icon: '🌸' },
  { id: 'chrysanthemums', name: 'Хризантемы', icon: '🌼' },
  { id: 'carnations', name: 'Гвоздики', icon: '🌺' },
  { id: 'mixed', name: 'Смешанные букеты', icon: '💐' },
  { id: 'seasonal', name: 'Сезонные', icon: '🍃' },
] as const

// Subscription frequencies
export const SUBSCRIPTION_FREQUENCIES = [
  { id: 'daily', name: 'Ежедневно', description: 'Каждый день' },
  { id: 'weekly', name: 'Еженедельно', description: 'Раз в неделю' },
  { id: 'monthly', name: 'Ежемесячно', description: 'Раз в месяц' },
  { id: 'custom', name: 'Произвольно', description: 'Выберите дни' },
] as const

// Delivery slots
export const DELIVERY_SLOTS = [
  { id: 'morning', name: 'Утро', time: '8:00 - 12:00' },
  { id: 'afternoon', name: 'День', time: '12:00 - 16:00' },
  { id: 'evening', name: 'Вечер', time: '16:00 - 22:00' },
] as const

// Order statuses
export const ORDER_STATUSES = [
  { id: 'pending', name: 'Ожидает подтверждения', color: 'warning' },
  { id: 'confirmed', name: 'Подтвержден', color: 'info' },
  { id: 'preparing', name: 'Готовится', color: 'info' },
  { id: 'delivering', name: 'Доставляется', color: 'primary' },
  { id: 'delivered', name: 'Доставлен', color: 'success' },
  { id: 'cancelled', name: 'Отменен', color: 'danger' },
] as const

// Payment statuses
export const PAYMENT_STATUSES = [
  { id: 'pending', name: 'Ожидает оплаты', color: 'warning' },
  { id: 'paid', name: 'Оплачен', color: 'success' },
  { id: 'failed', name: 'Ошибка оплаты', color: 'danger' },
  { id: 'refunded', name: 'Возвращен', color: 'info' },
] as const

// Payment methods
export const PAYMENT_METHODS = [
  { id: 'yoomoney', name: 'ЮMoney', icon: '💳' },
  { id: 'card', name: 'Банковская карта', icon: '💳' },
  { id: 'cash', name: 'Наличные', icon: '💰' },
] as const

// Subscription statuses
export const SUBSCRIPTION_STATUSES = [
  { id: 'active', name: 'Активна', color: 'success' },
  { id: 'paused', name: 'Приостановлена', color: 'warning' },
  { id: 'cancelled', name: 'Отменена', color: 'danger' },
] as const

// Bonus types
export const BONUS_TYPES = [
  { id: 'referral', name: 'За приглашение', description: 'Бонус за приглашение друга' },
  { id: 'purchase', name: 'За покупку', description: 'Бонус за покупку' },
  { id: 'gift', name: 'Подарок', description: 'Подарочный бонус' },
  { id: 'promotion', name: 'Акция', description: 'Бонус по акции' },
] as const

// Notification types
export const NOTIFICATION_TYPES = [
  { id: 'order_update', name: 'Обновление заказа', icon: '📦' },
  { id: 'delivery_reminder', name: 'Напоминание о доставке', icon: '🚚' },
  { id: 'payment', name: 'Платеж', icon: '💳' },
  { id: 'bonus', name: 'Бонус', icon: '🎁' },
  { id: 'system', name: 'Системное', icon: '⚙️' },
] as const

// Notification channels
export const NOTIFICATION_CHANNELS = [
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'telegram', name: 'Telegram', icon: '📱' },
  { id: 'push', name: 'Push-уведомления', icon: '🔔' },
  { id: 'sms', name: 'SMS', icon: '📱' },
] as const

// Sort options
export const SORT_OPTIONS = [
  { id: 'name', name: 'По названию' },
  { id: 'price', name: 'По цене' },
  { id: 'created_at', name: 'По дате добавления' },
  { id: 'views_count', name: 'По популярности' },
] as const

// Sort orders
export const SORT_ORDERS = [
  { id: 'asc', name: 'По возрастанию' },
  { id: 'desc', name: 'По убыванию' },
] as const

// Pagination
export const PAGINATION_OPTIONS = [12, 24, 48, 96] as const

// Delivery zones
export const DELIVERY_ZONES = [
  { id: 'moscow_center', name: 'Центр Москвы', delivery_fee: 0 },
  { id: 'moscow_other', name: 'Москва (остальные районы)', delivery_fee: 200 },
  { id: 'moscow_region', name: 'Московская область', delivery_fee: 500 },
] as const

// Business hours
export const BUSINESS_HOURS = {
  start: '8:00',
  end: '22:00',
  days: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
} as const

// Contact info
export const CONTACT_INFO = {
  phone: '+7 (495) 123-45-67',
  email: 'info@msk-flower.su',
  telegram: '@Flower_Moscow_appbot',
  address: 'Москва, центр',
} as const

// Social links
export const SOCIAL_LINKS = {
  telegram: 'https://t.me/Flower_Moscow_appbot',
  instagram: 'https://instagram.com/mskflower',
  vk: 'https://vk.com/mskflower',
} as const

// Telegram Bot settings
export const TELEGRAM_BOT = {
  username: 'Flower_Moscow_appbot',
  name: 'MSK Flower Bot',
  token: '8463349994:AAGKX7FzQk5r5pBrGo0QV6udB41jza4OnkY',
  webhookUrl: 'https://msk-flower.su/api/v1/telegram/webhook',
  supportChat: 'https://t.me/Flower_Moscow_appbot',
} as const

// App settings
export const APP_SETTINGS = {
  name: 'MSK Flower',
  description: 'Ежедневная доставка свежих цветов в Москве',
  version: '1.0.0',
  currency: 'RUB',
  locale: 'ru-RU',
  domain: 'msk-flower.su',
  apiUrl: 'https://msk-flower.su/api/v1',
} as const 