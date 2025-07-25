import { Link } from 'react-router-dom'
import { Flower } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center mb-6">
        <Flower className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-6xl font-bold bg-gradient-to-r from-green-600 to-pink-600 bg-clip-text text-transparent mb-4">404</h1>
      <p className="text-lg text-gray-500 mb-6">Страница не найдена. Но не грусти — цветы всегда рядом!</p>
      <Link to="/" className="btn-primary btn-lg">На главную</Link>
    </div>
  )
} 