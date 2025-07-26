import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { NotificationCenter } from '@/components/notifications'
import { ShoppingCart, User, LogOut, Menu, X, Flower } from 'lucide-react'
import { useState } from 'react'
import { CONTACT_INFO, SOCIAL_LINKS } from '@/constants'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: 'Подписка', href: '/subscription' },
    { name: 'Заказы', href: '/orders' },
    { name: 'Бонусы', href: '/bonuses' },
  ]

  const isActive = (path: string) => location.pathname === path

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                <Flower className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-pink-600 bg-clip-text text-transparent">
                MSK Flower
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-green-600 bg-green-50 border border-green-200'
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="p-2 text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                  <NotificationCenter />
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-700 hover:text-rose-600 transition-colors"
                    title="Выйти"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary btn-sm"
                >
                  Войти
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-green-600 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-green-100 bg-white/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-green-600 bg-green-50 border border-green-200'
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Профиль
                  </Link>
                  <NotificationCenter />
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Войти
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-800 to-pink-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
                  <Flower className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MSK Flower</span>
              </div>
              <p className="text-green-100 mb-4">
                Ежедневная доставка свежих цветов в Москве.
                Подписка на цветы для вашего стола.
              </p>
              <div className="flex space-x-4">
                <a
                  href={SOCIAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-100 hover:text-pink-300 transition-colors"
                >
                  Поддержка в Telegram
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Быстрые ссылки</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/catalog" className="text-green-100 hover:text-white transition-colors">
                    Каталог
                  </Link>
                </li>
                <li>
                  <Link to="/subscription" className="text-green-100 hover:text-white transition-colors">
                    Подписка
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="text-green-100 hover:text-white transition-colors">
                    Заказы
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Контакты</h3>
              <ul className="space-y-2 text-green-100">
                <li>{CONTACT_INFO.address}</li>
                <li>Ежедневная доставка</li>
                <li>8:00 - 22:00</li>
                <li>
                  <a href={`tel:${CONTACT_INFO.phone}`} className="hover:text-white transition-colors">
                    {CONTACT_INFO.phone}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-green-700 mt-8 pt-8 text-center text-green-100">
            <p>&copy; 2024 MSK Flower. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 