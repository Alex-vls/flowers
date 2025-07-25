import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Можно отправить ошибку в сервис логирования
    // console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl font-bold mb-4">Что-то пошло не так</h1>
          <p className="text-gray-500 mb-4">Панк-рок не терпит ошибок, но мы их ловим. Попробуй обновить страницу.</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary 