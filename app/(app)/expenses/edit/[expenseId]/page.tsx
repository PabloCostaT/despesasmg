"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useFormik } from "formik"
import * as Yup from "yup"
import { toast } from "sonner"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RetroButton } from "@/components/retro-button"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Family {
  id: string
  name: string
}

interface FamilyMember {
  id: string
  user_id: string
  name: string
  email: string
  status: string // 'active', 'pending', etc.
}

interface Project {
  id: string
  name: string
}

interface Expense {
  id: string
  title: string
  amount: number
  date: string
  category: string
  paid_by_member_id: string
  project_id: string | null
  splits: {
    member_id: string
    user_id: string
    name: string
    email: string
    amount_owed: number
    split_type: string
    percentage?: number
  }[]
}

const expenseCategories = ["alimentacao", "moradia", "transporte", "saude", "educacao", "lazer", "contas", "outros"]

const EditExpenseSchema = Yup.object().shape({
  familyId: Yup.string().required("Família é obrigatória"),
  title: Yup.string().required("Título é obrigatório"),
  amount: Yup.number().min(0.01, "Valor deve ser positivo").required("Valor é obrigatório"),
  date: Yup.date().required("Data é obrigatória"),
  category: Yup.string().oneOf(expenseCategories, "Categoria inválida").required("Categoria é obrigatória"),
  paidByMemberId: Yup.string().required("Quem pagou é obrigatório"),
  projectId: Yup.string().nullable(),
  splitType: Yup.string()
    .oneOf(["equal", "percentage", "manual"], "Tipo de divisão inválido")
    .required("Tipo de divisão é obrigatório"),
  splitDetails: Yup.array()
    .of(
      Yup.object().shape({
        memberId: Yup.string().required("Membro é obrigatório"),
        percentage: Yup.number().when("splitType", {
          is: "percentage",
          then: (schema) =>
            schema
              .min(0, "Porcentagem deve ser >= 0")
              .max(100, "Porcentagem deve ser <= 100")
              .required("Porcentagem é obrigatória"),
          otherwise: (schema) => schema.notRequired(),
        }),
        amountOwed: Yup.number().when("splitType", {
          is: "manual",
          then: (schema) => schema.min(0, "Valor devido deve ser >= 0").required("Valor devido é obrigatório"),
          otherwise: (schema) => schema.notRequired(),
        }),
      }),
    )
    .min(1, "Pelo menos um membro deve ser selecionado para a divisão")
    .required("Detalhes da divisão são obrigatórios"),
})

export default function EditExpensePage() {
  const router = useRouter()
  const params = useParams()
  const expenseId = params.expenseId as string
  const { user } = useAuth()

  const [families, setFamilies] = useState<Family[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [initialExpense, setInitialExpense] = useState<Expense | null>(null)

  const formik = useFormik({
    initialValues: {
      familyId: "",
      title: "",
      amount: 0,
      date: new Date(),
      category: "outros",
      paidByMemberId: "",
      projectId: null as string | null,
      splitType: "equal",
      splitDetails: [] as { memberId: string; percentage?: number; amountOwed?: number }[],
    },
    validationSchema: EditExpenseSchema,
    onSubmit: async (values) => {
      try {
        const payload = {
          ...values,
          date: format(values.date, "yyyy-MM-dd"),
          amount: Number(values.amount),
          splitDetails: values.splitDetails.map((detail) => ({
            ...detail,
            percentage: detail.percentage ? Number(detail.percentage) : undefined,
            amountOwed: detail.amountOwed ? Number(detail.amountOwed) : undefined,
          })),
        }

        await api.put(`/expenses/${values.familyId}/${expenseId}`, payload)
        toast.success("Despesa atualizada com sucesso!")
        router.push("/expenses")
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "Ocorreu um erro ao atualizar despesa."
        toast.error(errorMessage)
        console.error("Erro ao atualizar despesa:", error)
      }
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Fetch families
        const familiesRes = await api.get("/families")
        setFamilies(familiesRes.data)

        // Fetch expense details
        const expenseRes = await api.get(`/expenses/${familiesRes.data[0].id}/${expenseId}`) // Assuming first family for now
        const expenseData: Expense = expenseRes.data
        setInitialExpense(expenseData)

        // Set family ID in formik
        formik.setFieldValue("familyId", expenseData.family_id)

        // Fetch members for the expense's family
        const membersRes = await api.get(`/families/${expenseData.family_id}/members`)
        setFamilyMembers(membersRes.data.filter((m: FamilyMember) => m.status === "active"))

        // Fetch projects for the expense's family
        const projectsRes = await api.get(`/projects/${expenseData.family_id}`)
        setProjects(projectsRes.data)

        // Populate formik with expense data
        formik.setValues({
          familyId: expenseData.family_id,
          title: expenseData.title,
          amount: expenseData.amount,
          date: parseISO(expenseData.date), // Convert string date to Date object
          category: expenseData.category,
          paidByMemberId: expenseData.paid_by_member_id,
          projectId: expenseData.project_id,
          splitType: expenseData.splits[0]?.split_type || "equal", // Assuming all splits have same type
          splitDetails: expenseData.splits.map((s) => ({
            memberId: s.member_id,
            percentage: s.percentage,
            amountOwed: s.amount_owed,
          })),
        })
      } catch (error) {
        console.error("Erro ao carregar dados para o formulário de edição:", error)
        toast.error("Erro ao carregar dados da despesa.")
        router.push("/expenses") // Redirect if expense not found or error
      } finally {
        setLoadingData(false)
      }
    }
    if (expenseId) {
      fetchData()
    }
  }, [expenseId, router])

  useEffect(() => {
    // Recalculate split details when amount or split type changes, only if not loading initial data
    if (!loadingData && initialExpense) {
      if (formik.values.splitType === "equal" && familyMembers.length > 0) {
        const perMemberAmount = Number((formik.values.amount / familyMembers.length).toFixed(2))
        formik.setFieldValue(
          "splitDetails",
          familyMembers.map((member) => ({ memberId: member.id, amountOwed: perMemberAmount })),
        )
      } else if (formik.values.splitType === "percentage" && familyMembers.length > 0) {
        // If switching to percentage, ensure all members have a percentage, default to equal if not set
        const currentSplitDetails = formik.values.splitDetails
        const newSplitDetails = familyMembers.map((member) => {
          const existingDetail = currentSplitDetails.find((d) => d.memberId === member.id)
          return {
            memberId: member.id,
            percentage: existingDetail?.percentage || Number((100 / familyMembers.length).toFixed(2)),
          }
        })
        formik.setFieldValue("splitDetails", newSplitDetails)
      } else if (formik.values.splitType === "manual" && familyMembers.length > 0) {
        // If switching to manual, ensure all members have an amount, default to 0 if not set
        const currentSplitDetails = formik.values.splitDetails
        const newSplitDetails = familyMembers.map((member) => {
          const existingDetail = currentSplitDetails.find((d) => d.memberId === member.id)
          return {
            memberId: member.id,
            amountOwed: existingDetail?.amountOwed || 0,
          }
        })
        formik.setFieldValue("splitDetails", newSplitDetails)
      }
    }
  }, [formik.values.amount, formik.values.splitType, familyMembers.length, loadingData, initialExpense])

  const handleSplitDetailChange = (memberId: string, field: string, value: any) => {
    const newSplitDetails = formik.values.splitDetails.map((detail) =>
      detail.memberId === memberId ? { ...detail, [field]: value } : detail,
    )
    formik.setFieldValue("splitDetails", newSplitDetails)
  }

  const getMemberName = (memberId: string) => {
    return familyMembers.find((m) => m.id === memberId)?.name || "Membro Desconhecido"
  }

  if (loadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Editar Despesa</h1>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Detalhes da Despesa</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="familyId" className="retro-text">
                Família
              </Label>
              <Select
                onValueChange={(value) => {
                  formik.setFieldValue("familyId", value)
                  // In a real app, you'd re-fetch members and projects for the new family
                }}
                value={formik.values.familyId}
                disabled // Family ID should not be changed for an existing expense
              >
                <SelectTrigger className="w-full retro-border bg-gray-100 text-retro-text">
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
              <Label htmlFor="title" className="retro-text">
                Título
              </Label>
              <Input
                id="title"
                type="text"
                {...formik.getFieldProps("title")}
                className="retro-border bg-white text-retro-text"
                placeholder="Ex: Conta de luz"
              />
              {formik.touched.title && formik.errors.title && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.title}</div>
              )}
            </div>

            <div>
              <Label htmlFor="amount" className="retro-text">
                Valor
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...formik.getFieldProps("amount")}
                className="retro-border bg-white text-retro-text"
                placeholder="0.00"
              />
              {formik.touched.amount && formik.errors.amount && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.amount}</div>
              )}
            </div>

            <div>
              <Label htmlFor="date" className="retro-text">
                Data
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <RetroButton
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal retro-border bg-white text-retro-text",
                      !formik.values.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formik.values.date ? (
                      format(formik.values.date, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </RetroButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 retro-card">
                  <Calendar
                    mode="single"
                    selected={formik.values.date}
                    onSelect={(date) => formik.setFieldValue("date", date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {formik.touched.date && formik.errors.date && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.date}</div>
              )}
            </div>

            <div>
              <Label htmlFor="category" className="retro-text">
                Categoria
              </Label>
              <Select onValueChange={(value) => formik.setFieldValue("category", value)} value={formik.values.category}>
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  {expenseCategories.map((category) => (
                    <SelectItem key={category} value={category} className="retro-text">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.category && formik.errors.category && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.category}</div>
              )}
            </div>

            <div>
              <Label htmlFor="paidByMemberId" className="retro-text">
                Quem Pagou?
              </Label>
              <Select
                onValueChange={(value) => formik.setFieldValue("paidByMemberId", value)}
                value={formik.values.paidByMemberId}
              >
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="retro-text">
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.paidByMemberId && formik.errors.paidByMemberId && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.paidByMemberId}</div>
              )}
            </div>

            <div>
              <Label htmlFor="projectId" className="retro-text">
                Projeto (Opcional)
              </Label>
              <Select
                onValueChange={(value) => formik.setFieldValue("projectId", value === "null" ? null : value)}
                value={formik.values.projectId || "null"}
              >
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  <SelectItem value="null" className="retro-text">
                    Nenhum Projeto
                  </SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="retro-text">
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formik.touched.projectId && formik.errors.projectId && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.projectId}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="retro-text">Tipo de Divisão</Label>
              <Select
                onValueChange={(value) => formik.setFieldValue("splitType", value)}
                value={formik.values.splitType}
              >
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione o tipo de divisão" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  <SelectItem value="equal" className="retro-text">
                    Igual
                  </SelectItem>
                  <SelectItem value="percentage" className="retro-text">
                    Porcentagem
                  </SelectItem>
                  <SelectItem value="manual" className="retro-text">
                    Manual
                  </SelectItem>
                </SelectContent>
              </Select>
              {formik.touched.splitType && formik.errors.splitType && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.splitType}</div>
              )}
            </div>

            <div className="space-y-4">
              <Label className="retro-text">Detalhes da Divisão</Label>
              {familyMembers.map((member) => {
                const splitDetail = formik.values.splitDetails.find((d) => d.memberId === member.id) || {
                  memberId: member.id,
                }
                return (
                  <div key={member.id} className="flex items-center gap-2 retro-border p-2">
                    <span className="w-1/3 retro-text">{member.name || member.email}</span>
                    {formik.values.splitType === "equal" && (
                      <Input
                        type="number"
                        step="0.01"
                        value={splitDetail.amountOwed || ""}
                        readOnly
                        className="w-2/3 retro-border bg-gray-100 text-retro-text"
                      />
                    )}
                    {formik.values.splitType === "percentage" && (
                      <Input
                        type="number"
                        step="0.01"
                        value={splitDetail.percentage || ""}
                        onChange={(e) => handleSplitDetailChange(member.id, "percentage", Number(e.target.value))}
                        className="w-2/3 retro-border bg-white text-retro-text"
                      />
                    )}
                    {formik.values.splitType === "manual" && (
                      <Input
                        type="number"
                        step="0.01"
                        value={splitDetail.amountOwed || ""}
                        onChange={(e) => handleSplitDetailChange(member.id, "amountOwed", Number(e.target.value))}
                        className="w-2/3 retro-border bg-white text-retro-text"
                      />
                    )}
                  </div>
                )
              })}
              {formik.touched.splitDetails && formik.errors.splitDetails && (
                <div className="text-red-500 text-xs mt-1">{formik.errors.splitDetails as string}</div>
              )}
            </div>

            <RetroButton type="submit" className="w-full" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Atualizando..." : "Atualizar Despesa"}
            </RetroButton>
          </form>
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
