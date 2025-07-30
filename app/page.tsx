"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [isAuthenticated, loading, router])

  // Exibe um spinner enquanto o status de autenticação está sendo verificado
  return (
    <div className="flex min-h-screen items-center justify-center bg-retro-background">
      <Loader2 className="h-10 w-10 animate-spin text-retro-green" />
      <span className="sr-only">Carregando...</span>
    </div>
  )
}
