import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Toast, { ToastType } from '@/components/common/Toast'

export interface ToastMessage {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
}

interface ToastContextType {
  toasts: ToastMessage[]
  add: (type: ToastType, title: string, message: string, duration?: number) => string
  remove: (id: string) => void
  success: (title: string, message: string, duration?: number) => string
  error: (title: string, message: string, duration?: number) => string
  info: (title: string, message: string, duration?: number) => string
  order: (title: string, message: string, duration?: number) => string
  alert: (title: string, message: string, duration?: number) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const add = useCallback((type: ToastType, title: string, message: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastMessage = { id, type, title, message, duration }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const success = (title: string, message: string, duration?: number) => add('success', title, message, duration)
  const error = (title: string, message: string, duration?: number) => add('error', title, message, duration)
  const info = (title: string, message: string, duration?: number) => add('info', title, message, duration)
  const order = (title: string, message: string, duration?: number) => add('order', title, message, duration)
  const alert = (title: string, message: string, duration?: number) => add('alert', title, message, duration)

  const value: ToastContextType = { toasts, add, remove, success, error, info, order, alert }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position="bottom-right" toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastContainerProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  toasts: ToastMessage[]
  remove: (id: string) => void
}

function ToastContainer({ position = 'bottom-right', toasts, remove }: ToastContainerProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-3 pointer-events-none`}>
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={remove}
          />
        </div>
      ))}
    </div>
  )
}
