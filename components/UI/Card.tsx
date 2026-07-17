import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
}

export function Card({ children, className = '', glass = false }: CardProps) {
  const baseClass = glass ? 'glass-card' : 'bg-surface border border-outline-variant/30 rounded-xl shadow-sm'
  
  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  )
}
