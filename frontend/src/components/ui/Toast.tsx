import toast, { Toaster, ToastOptions } from 'react-hot-toast'

export const showToast = (message: string, type: 'success' | 'error' = 'success', options?: ToastOptions) => {
  if (type === 'success') {
    toast.success(message, options)
  } else {
    toast.error(message, options)
  }
}

export { Toaster } 