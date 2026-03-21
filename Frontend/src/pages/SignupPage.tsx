import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input from '../components/Input'
import Button from '../components/Button'
import IconButton from '../components/IconButton'
import { validateSignupForm } from '../utils/validation'
import { api } from '../utils/api'
import './SignupPage.css'

function SignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/map" replace />
  }
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const validation = validateSignupForm(
      formData.username,
      formData.password,
      formData.confirmPassword
    )
    setErrors(validation.errors)
    return validation.isValid
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await api.signup({
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })

      if (result.success) {
        // According to JWT flow: signup → store token in memory → redirect to login
        // But we're redirecting to login as per the flow spec
        navigate('/login')
      } else {
        setErrors({ submit: result.message || 'Registration failed. Please try again.' })
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="page-container">
        <header className="page-header">
          <h1 className="page-title">SIGN UP</h1>
        </header>

        <form
          className="form-container"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <Input
            id="username"
            label="Username"
            type="text"
            value={formData.username}
            onChange={handleInputChange('username')}
            required
            error={errors.username}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            required
            error={errors.password}
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange('confirmPassword')}
            required
            error={errors.confirmPassword}
          />

          {errors.submit && (
            <div className="submit-error">{errors.submit}</div>
          )}

          <Button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '12px',
              background: '#000000',
              color: '#FFFFFF',
              borderRadius: '20px',
              marginTop: '20px',
            }}
            className={isSubmitting ? 'button-disabled' : ''}
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </Button>
        </form>
      </div>

      <IconButton
        icon="arrow-left"
        position="bottom-left"
        navigateTo="/auth"
      />
    </div>
  )
}

export default SignupPage
