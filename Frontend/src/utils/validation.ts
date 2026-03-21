export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required'
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters'
  }

  // Require at least one number
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }

  return null
}

export function validateUsername(username: string): string | null {
  if (!username || !username.trim()) {
    return 'Username is required'
  }

  if (username.trim().length < 3) {
    return 'Username must be at least 3 characters'
  }

  return null
}

export function validateSignupForm(
  username: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  const errors: Record<string, string> = {}

  const usernameError = validateUsername(username)
  if (usernameError) {
    errors.username = usernameError
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    errors.password = passwordError
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function validateLoginForm(
  username: string,
  password: string
): ValidationResult {
  const errors: Record<string, string> = {}

  const usernameError = validateUsername(username)
  if (usernameError) {
    errors.username = usernameError
  }

  if (!password) {
    errors.password = 'Password is required'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
