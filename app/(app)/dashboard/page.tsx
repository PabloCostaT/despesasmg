"use client"

import { useEffect, useState } from "react"
import { RetroCard, RetroCardContent, RetroCardHeader, RetroCardTitle } from "@/components/retro-card"
import { DollarSign, Users } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Legend, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { RetroButton } from "@/components/retro-button" // Assuming RetroButton is a component

interface FamilyBalance {
  family_member_id: string
  user_id: string
  member_name: string
  member_email: string
  role: string
  balance: string // Numeric string
}

interface Expense {
  id: string
  title: string
  amount: number
  date: string
  category: string
  paid_by_name: string
  splits: { amount_owed: number; name: string }[]
}

const COLORS = ["#007A33", "#009944", "#005C26", "#33CC66", "#66FF99"] // Tons de verde

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [familyBalances, setFamilyBalances] = useState<FamilyBalance[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingBalances, setLoadingBalances] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const response = await api.get("/families")
        if (response.data.length > 0) {
          setSelectedFamilyId(response.data[0].id) // Seleciona a primeira família por padrão
        } else {
          toast.info("Você não faz parte de nenhuma família. Crie ou seja convidado para uma!")
        }
      } catch (error) {
        console.error("Erro ao buscar famílias:", error)
        toast.error("Erro ao carregar suas famílias.")
      }
    }
    fetchFamilies()
  }, [])

  useEffect(() => {
    if (selectedFamilyId) {
      const fetchFamilyData = async () => {
        setLoadingBalances(true)
        setLoadingExpenses(true)
        try {
          // Fetch balances
          const balancesRes = await api.get(`/wallets/${selectedFamilyId}/balances`)
          setFamilyBalances(balancesRes.data)

          // Fetch expenses
          const expensesRes = await api.get(`/expenses/${selectedFamilyId}`)
          setExpenses(expensesRes.data)
        } catch (error) {
          console.error("Erro ao buscar dados da família:", error)
          toast.error("Erro ao carregar dados da família.")
        } finally {
          setLoadingBalances(false)
          setLoadingExpenses(false)
        }
      }
      fetchFamilyData()
    }
  }, [selectedFamilyId])

  // Process data for charts
  const expensesByCategory = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const categoryChartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }))

  const expensesByMember = expenses.reduce(
    (acc, expense) => {
      expense.splits.forEach((split) => {
        acc[split.name] = (acc[split.name] || 0) + split.amount_owed
      })
      return acc
    },
    {} as Record<string, number>,
  )

  const memberChartData = Object.entries(expensesByMember).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Olá, {user?.name || user?.email}!</h1>
      <p className="text-lg retro-text">Bem-vindo ao MinhaGrana. Aqui está um resumo das suas finanças familiares.</p>

      {selectedFamilyId ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <RetroCard>
              <RetroCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <RetroCardTitle className="text-sm font-medium">Total de Despesas</RetroCardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </RetroCardHeader>
              <RetroCardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <div className="text-2xl font-bold">
                    R$ {expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                  </div>
                )}
              </RetroCardContent>
            </RetroCard>
            <RetroCard>
              <RetroCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <RetroCardTitle className="text-sm font-medium">Membros da Família</RetroCardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </RetroCardHeader>
              <RetroCardContent>
                {loadingBalances ? (
                  <Skeleton className="h-8 w-1/2" />
                ) : (
                  <div className="text-2xl font-bold">{familyBalances.length}</div>
                )}
              </RetroCardContent>
            </RetroCard>
            <RetroCard>
              <RetroCardHeader>
                <RetroCardTitle>Projetos Ativos</RetroCardTitle>
              </RetroCardHeader>
              <RetroCardContent>
                <div className="text-2xl font-bold">0</div> {/* Placeholder */}
              </RetroCardContent>
            </RetroCard>
            <RetroCard>
              <RetroCardHeader>
                <RetroCardTitle>Seu Saldo</RetroCardTitle>
              </RetroCardHeader>
              <RetroCardContent>
                {loadingBalances ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <div className="text-2xl font-bold">
                    R$ {familyBalances.find((b) => b.user_id === user?.id)?.balance || "0.00"}
                  </div>
                )}
              </RetroCardContent>
            </RetroCard>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <RetroCard>
              <RetroCardHeader>
                <RetroCardTitle>Despesas por Categoria</RetroCardTitle>
              </RetroCardHeader>
              <RetroCardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ChartContainer
                    config={{
                      value: { label: "Valor", color: "hsl(var(--retro-green))" },
                    }}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </RetroCardContent>
            </RetroCard>

            <RetroCard>
              <RetroCardHeader>
                <RetroCardTitle>Despesas por Membro</RetroCardTitle>
              </RetroCardHeader>
              <RetroCardContent>
                {loadingExpenses ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ChartContainer
                    config={{
                      value: { label: "Valor", color: "hsl(var(--retro-green))" },
                    }}
                    className="h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={memberChartData}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="value" fill="var(--color-value)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </RetroCardContent>
            </RetroCard>
          </div>
        </>
      ) : (
        <RetroCard className="p-6 text-center">
          <RetroCardTitle>Comece sua jornada financeira!</RetroCardTitle>
          <RetroCardContent className="mt-4">
            <p className="mb-4">Para começar a registrar despesas, você precisa criar ou entrar em uma família.</p>
            <RetroButton onClick={() => router.push("/families")}>Gerenciar Famílias</RetroButton>
          </RetroCardContent>
        </RetroCard>
      )}
    </div>
  )
}
