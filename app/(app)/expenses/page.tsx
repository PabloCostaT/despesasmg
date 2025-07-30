"use client"

import { useEffect, useState } from "react"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { RetroButton } from "@/components/retro-button"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Plus, Trash2, Edit } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Expense {
  id: string
  title: string
  amount: number
  date: string
  category: string
  paid_by_name: string
  paid_by_member_id: string
  project_name?: string
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

interface Family {
  id: string
  name: string
}

export default function ExpensesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
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
    const fetchExpenses = async () => {
      if (!selectedFamilyId) return
      setLoading(true)
      try {
        const response = await api.get(`/expenses/${selectedFamilyId}`)
        setExpenses(response.data)
      } catch (error) {
        console.error("Erro ao buscar despesas:", error)
        toast.error("Erro ao carregar despesas.")
      } finally {
        setLoading(false)
      }
    }
    fetchExpenses()
  }, [selectedFamilyId])

  const handleDeleteExpense = async (expenseId: string, title: string) => {
    if (!selectedFamilyId) return
    if (!confirm(`Tem certeza que deseja excluir a despesa "${title}"?`)) {
      return
    }
    try {
      await api.delete(`/expenses/${selectedFamilyId}/${expenseId}`)
      toast.success(`Despesa "${title}" excluída com sucesso.`)
      setExpenses(expenses.filter((exp) => exp.id !== expenseId))
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao excluir despesa."
      toast.error(errorMessage)
      console.error("Erro ao excluir despesa:", error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Minhas Despesas</h1>

      <div className="flex justify-between items-center">
        <RetroButton onClick={() => router.push("/expenses/add")}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Despesa
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
          <RetroCardTitle>Lista de Despesas</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma despesa registrada para esta família ainda.</p>
          ) : (
            <ul className="space-y-4">
              {expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="retro-border p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg retro-text">{expense.title}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {expense.amount.toFixed(2)} • {format(new Date(expense.date), "dd/MM/yyyy", { locale: ptBR })}{" "}
                      • {expense.category}
                    </p>
                    <p className="text-sm text-muted-foreground">Pago por: {expense.paid_by_name}</p>
                    {expense.project_name && (
                      <p className="text-sm text-muted-foreground">Projeto: {expense.project_name}</p>
                    )}
                    <div className="mt-2 text-xs text-muted-foreground">
                      Divisão:
                      <ul className="list-disc list-inside">
                        {expense.splits.map((split, index) => (
                          <li key={index}>
                            {split.name}: R$ {split.amount_owed.toFixed(2)} ({split.split_type}
                            {split.percentage ? ` - ${split.percentage}%` : ""})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 md:mt-0">
                    <RetroButton
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/expenses/edit/${expense.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </RetroButton>
                    <RetroButton
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id, expense.title)}
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
