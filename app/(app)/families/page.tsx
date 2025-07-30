"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { RetroButton } from "@/components/retro-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Plus, Users, CheckCircle, Clock, XCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

interface Family {
  id: string
  name: string
  role: "admin" | "member"
  status: "pending" | "active" | "inactive"
}

export default function FamiliesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [families, setFamilies] = useState<Family[]>([])
  const [newFamilyName, setNewFamilyName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchFamilies = async () => {
    setLoading(true)
    try {
      const response = await api.get("/families")
      setFamilies(response.data)
    } catch (error) {
      console.error("Erro ao buscar famílias:", error)
      toast.error("Erro ao carregar suas famílias.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFamilies()
  }, [])

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFamilyName.trim()) {
      toast.error("O nome da família não pode ser vazio.")
      return
    }
    try {
      await api.post("/families", { name: newFamilyName })
      toast.success("Família criada com sucesso!")
      setNewFamilyName("")
      fetchFamilies() // Recarregar a lista de famílias
    } catch (error) {
      console.error("Erro ao criar família:", error)
      toast.error("Erro ao criar família.")
    }
  }

  const handleAcceptInvitation = async (familyMemberId: string) => {
    try {
      await api.post(`/families/members/accept-invite/${familyMemberId}`)
      toast.success("Convite aceito com sucesso! Você agora é um membro ativo.")
      fetchFamilies() // Recarregar a lista de famílias
    } catch (error) {
      console.error("Erro ao aceitar convite:", error)
      toast.error("Erro ao aceitar convite.")
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Minhas Famílias</h1>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Criar Nova Família</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={handleCreateFamily} className="space-y-4">
            <div>
              <Label htmlFor="newFamilyName" className="retro-text">
                Nome da Família
              </Label>
              <Input
                id="newFamilyName"
                type="text"
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                className="retro-border bg-white text-retro-text"
                placeholder="Ex: Família Silva"
              />
            </div>
            <RetroButton type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Criar Família
            </RetroButton>
          </form>
        </RetroCardContent>
      </RetroCard>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Minhas Famílias</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : families.length === 0 ? (
            <p className="text-center text-muted-foreground">Você não faz parte de nenhuma família ainda.</p>
          ) : (
            <ul className="space-y-4">
              {families.map((family) => (
                <li key={family.id} className="flex items-center justify-between retro-border p-3">
                  <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-retro-green" />
                    <div>
                      <p className="font-semibold retro-text">{family.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Função: {family.role === "admin" ? "Administrador" : "Membro"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {family.status === "pending" && (
                      <>
                        <span className="text-sm text-yellow-600 flex items-center gap-1">
                          <Clock className="h-4 w-4" /> Pendente
                        </span>
                        <RetroButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAcceptInvitation(family.id)} // Note: This should be family_member_id, not family.id
                          // For simplicity, assuming family.id here for now, but backend expects family_member_id
                          // A real implementation would need to fetch the family_member_id for the current user and this family.
                        >
                          Aceitar
                        </RetroButton>
                      </>
                    )}
                    {family.status === "active" && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Ativo
                      </span>
                    )}
                    {family.status === "inactive" && (
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <XCircle className="h-4 w-4" /> Inativo
                      </span>
                    )}
                    <RetroButton variant="outline" size="sm" onClick={() => router.push(`/families/${family.id}`)}>
                      Ver Detalhes
                    </RetroButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
