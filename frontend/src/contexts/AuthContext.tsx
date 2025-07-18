import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'react-hot-toast'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface Company {
  id: string
  name: string
  accounting_method: string
  base_currency: string
}

interface AuthContextType {
  user: User | null
  company: Company | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('financial-ai-token')
    const storedUser = localStorage.getItem('financial-ai-user')
    const storedCompany = localStorage.getItem('financial-ai-company')

    if (storedToken && storedUser && storedCompany) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      setCompany(JSON.parse(storedCompany))
    }
    
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setCompany(data.company)
        setToken(data.token)

        // Store in localStorage
        localStorage.setItem('financial-ai-token', data.token)
        localStorage.setItem('financial-ai-user', JSON.stringify(data.user))
        localStorage.setItem('financial-ai-company', JSON.stringify(data.company))

        toast.success(`Welcome back, ${data.user.first_name}!`)
        return true
      } else {
        toast.error(data.error || 'Login failed')
        return false
      }
    } catch (error) {
      toast.error('Connection error. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setCompany(null)
    setToken(null)
    
    localStorage.removeItem('financial-ai-token')
    localStorage.removeItem('financial-ai-user')
    localStorage.removeItem('financial-ai-company')
    
    toast.success('Logged out successfully')
  }

  const value = {
    user,
    company,
    token,
    login,
    logout,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}