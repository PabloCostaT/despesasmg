"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { RetroButton } from "@/components/retro-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import api from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Mail, XCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FamilyDetails {
  id: string
  name: string
  created_by_user_id: string
}

interface FamilyMember {
  id: string
  user_id: string
  name: string
  email: string
  avatar_url?: string
  role: "admin" | "member"
  status: "pending" | "active" | "inactive"
  joined_at?: string
}

export default function FamilyDetailsPage() {
  const params = useParams()
  const familyId = params.familyId as string
  const [family, setFamily] = useState<FamilyDetails | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")

  const fetchFamilyDetails = async () => {
    setLoading(true)
    try {
      const familyRes = await api.get(`/families/${familyId}`)
      setFamily(familyRes.data)

      const membersRes = await api.get(`/families/${familyId}/members`)
      setMembers(membersRes.data)
    } catch (error) {
      console.error("Erro ao buscar detalhes da família:", error)
      toast.error("Erro ao carregar detalhes da família.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (familyId) {
      fetchFamilyDetails()
    }
  }, [familyId])

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error("O email do convidado é obrigatório.")
      return
    }
    try {
      await api.post(`/families/${familyId}/members/invite`, { email: inviteEmail, role: inviteRole })
      toast.success(`Convite enviado para ${inviteEmail} como ${inviteRole}.`)
      setInviteEmail("")
      setInviteRole("member")
      fetchFamilyDetails() // Recarregar membros
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao enviar convite."
      toast.error(errorMessage)
      console.error("Erro ao convidar membro:", error)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Tem certeza que deseja remover ${memberName} desta família?`)) {
      return
    }
    try {
      await api.delete(`/families/${familyId}/members/${memberId}`)
      toast.success(`${memberName} removido com sucesso.`)
      fetchFamilyDetails() // Recarregar membros
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao remover membro."
      toast.error(errorMessage)
      console.error("Erro ao remover membro:", error)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: "admin" | "member") => {
    try {
      await api.put(`/families/${familyId}/members/${memberId}`, { role: newRole })
      toast.success("Função do membro atualizada com sucesso.")
      fetchFamilyDetails()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao atualizar função do membro."
      toast.error(errorMessage)
      console.error("Erro ao atualizar função do membro:", error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (!family) {
    return <p className="retro-text">Família não encontrada.</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Família: {family.name}</h1>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Membros da Família</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum membro nesta família ainda.</p>
          ) : (
            <ul className="space-y-4">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between retro-border p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar_url || "/placeholder.svg?height=32&width=32&query=user-avatar"}
                      alt={`${member.name}'s avatar`}
                      className="h-8 w-8 rounded-full border border-retro-border"
                    />
                    <div>
                      <p className="font-semibold retro-text">{member.name || member.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Função: {member.role === "admin" ? "Administrador" : "Membro"}
                        {member.status === "pending" && <span className="text-yellow-600 ml-2">(Pendente)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value: "admin" | "member") => handleUpdateMemberRole(member.id, value)}
                    >
                      <SelectTrigger className="w-[120px] retro-border bg-white text-retro-text">
                        <SelectValue placeholder="Função" />
                      </SelectTrigger>
                      <SelectContent className="retro-card">
                        <SelectItem value="member" className="retro-text">
                          Membro
                        </SelectItem>
                        <SelectItem value="admin" className="retro-text">
                          Administrador
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <RetroButton variant="destructive" size="sm">
                          <XCircle className="h-4 w-4" />
                        </RetroButton>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="retro-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="retro-text">Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription className="retro-text">
                            Esta ação removerá {member.name} da família. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="retro-button retro-border">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="retro-button retro-button-destructive"
                            onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </RetroCardContent>
      </RetroCard>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Convidar Novo Membro</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <Label htmlFor="inviteEmail" className="retro-text">
                Email do Convidado
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="retro-border bg-white text-retro-text"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="inviteRole" className="retro-text">
                Função
              </Label>
              <Select value={inviteRole} onValueChange={(value: "member" | "admin") => setInviteRole(value)}>
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  <SelectItem value="member" className="retro-text">
                    Membro
                  </SelectItem>
                  <SelectItem value="admin" className="retro-text">
                    Administrador
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <RetroButton type="submit" className="w-full">
              <Mail className="mr-2 h-4 w-4" /> Enviar Convite
            </RetroButton>
          </form>
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
