import React, { useEffect, useRef } from 'react'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginWidgetProps {
  botName: string
  onAuth: (user: TelegramUser) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: boolean
  usePic?: boolean
  className?: string
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramUser) => void
    }
  }
}

export default function TelegramLoginWidget({
  botName,
  onAuth,
  buttonSize = 'large',
  cornerRadius,
  requestAccess = true,
  usePic = false,
  className = ''
}: TelegramLoginWidgetProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Create unique callback name
    const callbackName = `telegramCallback_${Date.now()}`
    
    // Set global callback
    ;(window as any)[callbackName] = (user: TelegramUser) => {
      onAuth(user)
    }

    if (ref.current) {
      // Clear existing content
      ref.current.innerHTML = ''
      
      // Create script element
      const script = document.createElement('script')
      script.src = 'https://telegram.org/js/telegram-widget.js?22'
      script.setAttribute('data-telegram-login', botName)
      script.setAttribute('data-size', buttonSize)
      script.setAttribute('data-onauth', callbackName)
      script.setAttribute('data-request-access', requestAccess ? 'write' : 'read')
      script.setAttribute('data-userpic', usePic.toString())
      
      // Используем стандартный popup для всех браузеров
      // Убрали костыльную логику определения Firefox
      
      if (cornerRadius !== undefined) {
        script.setAttribute('data-radius', cornerRadius.toString())
      }
      
      // Add error handling
      script.onerror = () => {
        console.error('Failed to load Telegram widget script')
        if (ref.current) {
          ref.current.innerHTML = `
            <div style="padding: 12px; background: #fee; border: 1px solid #fcc; border-radius: 6px; color: #c33;">
              ❌ Ошибка загрузки Telegram Widget<br>
              <small>Проверьте настройки бота или CSP</small>
            </div>
          `
        }
      }
      
      script.onload = () => {
        console.log('Telegram widget script loaded successfully')
        console.log('Using standard popup authentication for all browsers')
      }
      
      ref.current.appendChild(script)
    }

    // Cleanup function
    return () => {
      delete (window as any)[callbackName]
    }
  }, [botName, onAuth, buttonSize, cornerRadius, requestAccess, usePic])

  return <div ref={ref} className={className} />
} 