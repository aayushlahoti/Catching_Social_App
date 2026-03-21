import type { ReactNode } from 'react'
import './Button.css'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  style?: React.CSSProperties
  className?: string
}

function Button({ children, onClick, style, className = '' }: ButtonProps) {
  return (
    <button 
      type="button"
      className={`custom-button ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}

export default Button
