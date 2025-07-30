"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFormik } from "formik"
import * as Yup from "yup"
import { toast } from "sonner"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RetroButton } from "@/components/retro-button"
import api from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface Family {
  id: string
  name: string
}

const AddProjectSchema = Yup.object().shape({
  familyId: Yup.string().required("Família é obrigatória"),
  name: Yup.string().required("Nome do projeto é obrigatório"),
  budget: Yup.number()
    .nullable()
    .min(0, "Orçamento deve ser um número positivo")
    .transform((value, originalValue) => (originalValue === "" ? null : value)),
  description: Yup.string().nullable(),
})

export default function AddProjectPage() {
  const router = useRouter()
  const [families, setFamilies] = useState<Family[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const formik = useFormik({
    initialValues: {
      familyId: "",
      name: "",
      budget: null as number | null,
      description: null as string | null,
    },
    validationSchema: AddProjectSchema,
    onSubmit: async (values) => {
      try {
        await api.post(`/projects/${values.familyId}`, {
          name: values.name,
          budget: values.budget,
          description: values.description,
        })
        toast.success("Projeto criado com sucesso!")
        router.push("/projects")
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "Ocorreu um erro ao criar projeto."
        toast.error(errorMessage)
        console.error("Erro ao criar projeto:", error)
      }
    },
  })

  useEffect(() => {
    const fetchFamilies = async () => {
      setLoadingData(true)
      try {
        const response = await api.get("/families")
        setFamilies(response.data)
        if (response.data.length > 0) {
          formik.setFieldValue("familyId", response.data[0].id)
        }
      } catch (error) {
        console.error("Erro ao carregar famílias:", error)
        toast.error("Erro ao carregar famílias.")
      } finally {
        setLoadingData(false)
      }
    }
    fetchFamilies()
  }, [])

  if (loadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Criar Novo Projeto</h1>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Detalhes do Projeto</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="familyId" className="retro-text">
                Família
              </Label>
              <Select onValueChange={(value) => formik.setFieldValue("familyId", value)} value={formik.values.familyId}>
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione uma família" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id} className="retro-text">
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.familyId && formik.errors.familyId && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.familyId}</div>
              )}
            </div>

            <div>
              <Label htmlFor="name" className="retro-text">
                Nome do Projeto
              </Label>
              <Input
                id="name"
                type="text"
                {...formik.getFieldProps("name")}
                className="retro-border bg-white text-retro-text"
                placeholder="Ex: Viagem de Férias"
              />
              {formik.touched.name && formik.errors.name && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.name}</div>
              )}
            </div>

            <div>
              <Label htmlFor="budget" className="retro-text">
                Orçamento (Opcional)
              </Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                {...formik.getFieldProps("budget")}
                className="retro-border bg-white text-retro-text"
                placeholder="0.00"
              />
              {formik.touched.budget && formik.errors.budget && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.budget}</div>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="retro-text">
                Descrição (Opcional)
              </Label>
              <Textarea
                id="description"
                {...formik.getFieldProps("description")}
                className="retro-border bg-white text-retro-text"
                placeholder="Descreva o objetivo do projeto..."
              />
              {formik.touched.description && formik.errors.description && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.description}</div>
              )}
            </div>

            <RetroButton type="submit" className="w-full" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Criando..." : "Criar Projeto"}
            </RetroButton>
          </form>
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
