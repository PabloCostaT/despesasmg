"use client"

import { useEffect, useState } from "react"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { RetroButton } from "@/components/retro-button"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Plus, Trash2, Edit, DollarSign } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"

interface Project {
  id: string
  name: string
  budget: number | null
  description: string | null
  total_spent: number
}

interface Family {
  id: string
  name: string
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [families, setFamilies] = useState<Family[]>([])

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const response = await api.get("/families")
        setFamilies(response.data)
        if (response.data.length > 0) {
          setSelectedFamilyId(response.data[0].id)
        }
      } catch (error) {
        console.error("Erro ao buscar famílias:", error)
        toast.error("Erro ao carregar suas famílias.")
      }
    }
    fetchFamilies()
  }, [])

  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedFamilyId) return
      setLoading(true)
      try {
        const response = await api.get(`/projects/${selectedFamilyId}`)
        setProjects(response.data)
      } catch (error) {
        console.error("Erro ao buscar projetos:", error)
        toast.error("Erro ao carregar projetos.")
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [selectedFamilyId])

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!selectedFamilyId) return
    if (
      !confirm(
        `Tem certeza que deseja excluir o projeto "${name}"? As despesas associadas não serão excluídas, mas perderão a associação com este projeto.`,
      )
    ) {
      return
    }
    try {
      await api.delete(`/projects/${selectedFamilyId}/${projectId}`)
      toast.success(`Projeto "${name}" excluído com sucesso.`)
      setProjects(projects.filter((proj) => proj.id !== projectId))
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao excluir projeto."
      toast.error(errorMessage)
      console.error("Erro ao excluir projeto:", error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Meus Projetos</h1>

      <div className="flex justify-between items-center">
        <RetroButton onClick={() => router.push("/projects/add")}>
          <Plus className="mr-2 h-4 w-4" /> Criar Projeto
        </RetroButton>
        {families.length > 0 && (
          <select
            value={selectedFamilyId || ""}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            className="retro-border bg-white text-retro-text p-2 rounded-none"
          >
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Lista de Projetos</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum projeto registrado para esta família ainda.</p>
          ) : (
            <ul className="space-y-4">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="retro-border p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg retro-text">{project.name}</p>
                    {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <DollarSign className="h-4 w-4 text-retro-green" />
                      <p className="text-sm retro-text">
                        Orçamento: {project.budget ? `R$ ${project.budget.toFixed(2)}` : "Não definido"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      <p className="text-sm retro-text">Gasto: R$ {project.total_spent.toFixed(2)}</p>
                    </div>
                    {project.budget && (
                      <p className="text-sm text-muted-foreground">
                        Restante: R$ {(project.budget - project.total_spent).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 md:mt-0">
                    <RetroButton
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/projects/edit/${project.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </RetroButton>
                    <RetroButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id, project.name)}
                    >
                      <Trash2 className="h-4 w-4" />
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
