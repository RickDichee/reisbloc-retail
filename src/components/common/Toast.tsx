import { X, AlertCircle, CheckCircle, Info, Package, Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'order' | 'alert'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message: string
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, type, title, message, duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(id), 300)
    }, duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'order':
        return <Bell className="w-5 h-5" />
      case 'alert':
        return <AlertCircle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-white border-l-4 border-green-500 text-gray-800'
      case 'error':
        return 'bg-white border-l-4 border-red-500 text-gray-800'
      case 'order':
        return 'bg-gray-900 border-l-4 border-blue-500 text-white'
      case 'alert':
        return 'bg-white border-l-4 border-orange-500 text-gray-800'
      default:
        return 'bg-white border-l-4 border-gray-500 text-gray-800'
    }
  }

  return (
    <div
      className={`${getColors()} fixed top-4 right-4 z-[100] rounded-xl shadow-2xl p-4 flex items-center gap-4 min-w-[320px] max-w-md transform transition-all duration-500 ease-out backdrop-blur-md ${
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
      role="alert"
    >
      <div className={`flex-shrink-0 p-2 rounded-full ${type === 'order' ? 'bg-white/10' : 'bg-gray-100'}`}>
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <h3 className="font-bold text-sm">{title}</h3>
        <p className={`text-xs mt-0.5 ${type === 'order' ? 'text-gray-300' : 'text-gray-500'}`}>{message}</p>
      </div>
      
      <button
        onClick={() => {
          setIsExiting(true)
          setTimeout(() => onClose(id), 300)
        }}
        className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
          type === 'order' ? 'hover:bg-white/20 text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
        }`}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
