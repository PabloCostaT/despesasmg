"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
  fetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    const storedToken = localStorage.getItem("minhagrana_jwt_token")
    if (storedToken) {
      setToken(storedToken)
      try {
        const response = await api.get("/users/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        setUser(response.data)
      } catch (error) {
        console.error("Failed to fetch user data:", error)
        localStorage.removeItem("minhagrana_jwt_token")
        setToken(null)
        setUser(null)
        router.push("/login")
      }
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = useCallback(
    (newToken: string, userData: User) => {
      localStorage.setItem("minhagrana_jwt_token", newToken)
      setToken(newToken)
      setUser(userData)
      router.push("/dashboard")
    },
    [router],
  )

  const logout = useCallback(() => {
    localStorage.removeItem("minhagrana_jwt_token")
    setToken(null)
    setUser(null)
    router.push("/login")
  }, [router])

  const isAuthenticated = !!user && !!token

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
