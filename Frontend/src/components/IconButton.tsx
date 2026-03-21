import { useNavigate } from 'react-router-dom'
import './IconButton.css'

interface IconButtonProps {
  icon: string
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  onClick?: () => void
  navigateTo?: string
}

function IconButton({ icon, position = 'bottom-left', onClick, navigateTo }: IconButtonProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (navigateTo) {
      navigate(navigateTo)
    } else if (onClick) {
      onClick()
    }
  }

  const getIconSVG = () => {
    if (icon === 'arrow-left') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
    return null
  }

  return (
    <button 
      className={`icon-button icon-button-${position}`}
      onClick={handleClick}
      aria-label={icon}
    >
      {getIconSVG()}
    </button>
  )
}

export default IconButton
