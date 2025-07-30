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
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, History, Send, ReceiptIcon as Receive } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Family {
  id: string
  name: string
}

interface FamilyMember {
  id: string
  user_id: string
  name: string
  email: string
}

interface WalletBalance {
  family_member_id: string
  user_id: string
  member_name: string
  member_email: string
  role: string
  balance: string // Numeric string
}

interface Transaction {
  id: string
  type: string
  amount: number
  description: string
  created_at: string
  expense_title?: string
  related_member_name?: string
}

export default function WalletsPage() {
  const { user } = useAuth()
  const [families, setFamilies] = useState<Family[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [myMemberId, setMyMemberId] = useState<string | null>(null)
  const [myBalance, setMyBalance] = useState<string>("0.00")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const [settleAmount, setSettleAmount] = useState<number | "">("")
  const [settleReceiverMemberId, setSettleReceiverMemberId] = useState<string>("")

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      try {
        const familiesRes = await api.get("/families")
        setFamilies(familiesRes.data)
        if (familiesRes.data.length > 0) {
          const defaultFamilyId = familiesRes.data[0].id
          setSelectedFamilyId(defaultFamilyId)

          const membersRes = await api.get(`/families/${defaultFamilyId}/members`)
          setFamilyMembers(membersRes.data.filter((m: FamilyMember) => m.status === "active"))

          const currentUserMember = membersRes.data.find((m: FamilyMember) => m.user_id === user?.id)
          if (currentUserMember) {
            setMyMemberId(currentUserMember.id)
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais para carteira:", error)
        toast.error("Erro ao carregar dados iniciais.")
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [user?.id])

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!selectedFamilyId || !myMemberId) return
      setLoading(true)
      try {
        const balanceRes = await api.get(`/wallets/${selectedFamilyId}/balance/${myMemberId}`)
        setMyBalance(balanceRes.data.balance)

        const transactionsRes = await api.get(`/wallets/${selectedFamilyId}/transactions/${myMemberId}`)
        setTransactions(transactionsRes.data)
      } catch (error) {
        console.error("Erro ao buscar dados da carteira:", error)
        toast.error("Erro ao carregar dados da carteira.")
      } finally {
        setLoading(false)
      }
    }
    fetchWalletData()
  }, [selectedFamilyId, myMemberId])

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFamilyId || !myMemberId || !settleReceiverMemberId || !settleAmount || settleAmount <= 0) {
      toast.error("Preencha todos os campos para registrar o acerto.")
      return
    }
    if (myMemberId === settleReceiverMemberId) {
      toast.error("Você não pode fazer um acerto consigo mesmo.")
      return
    }

    try {
      await api.post(`/wallets/${selectedFamilyId}/settle`, {
        payerMemberId: myMemberId,
        receiverMemberId: settleReceiverMemberId,
        amount: Number(settleAmount),
      })
      toast.success("Acerto registrado com sucesso!")
      setSettleAmount("")
      setSettleReceiverMemberId("")
      // Recarregar dados da carteira
      if (selectedFamilyId && myMemberId) {
        const balanceRes = await api.get(`/wallets/${selectedFamilyId}/balance/${myMemberId}`)
        setMyBalance(balanceRes.data.balance)
        const transactionsRes = await api.get(`/wallets/${selectedFamilyId}/transactions/${myMemberId}`)
        setTransactions(transactionsRes.data)
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Erro ao registrar acerto."
      toast.error(errorMessage)
      console.error("Erro ao registrar acerto:", error)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "expense_paid":
        return <Send className="h-4 w-4 text-retro-green" />
      case "expense_owed":
        return <Receive className="h-4 w-4 text-red-500" />
      case "settlement_sent":
        return <Send className="h-4 w-4 text-blue-500" />
      case "settlement_received":
        return <Receive className="h-4 w-4 text-green-500" />
      default:
        return <History className="h-4 w-4 text-gray-500" />
    }
  }

  const getTransactionDescription = (transaction: Transaction) => {
    let desc = transaction.description
    if (transaction.expense_title) {
      desc += ` (Despesa: ${transaction.expense_title})`
    }
    if (transaction.related_member_name) {
      if (transaction.type === "settlement_sent") {
        desc = `Pagamento para ${transaction.related_member_name}`
      } else if (transaction.type === "settlement_received") {
        desc = `Recebimento de ${transaction.related_member_name}`
      }
    }
    return desc
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold retro-text">Minha Carteira</h1>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Saldo Atual</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-retro-green" />
            <span
              className={`text-4xl font-bold ${Number.parseFloat(myBalance) >= 0 ? "text-retro-green" : "text-red-500"}`}
            >
              R$ {Number.parseFloat(myBalance).toFixed(2)}
            </span>
          </div>
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
        </RetroCardContent>
      </RetroCard>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Registrar Acerto</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          <form onSubmit={handleSettleDebt} className="space-y-4">
            <div>
              <Label htmlFor="settleReceiver" className="retro-text">
                Acertar com
              </Label>
              <Select onValueChange={(value) => setSettleReceiverMemberId(value)} value={settleReceiverMemberId}>
                <SelectTrigger className="w-full retro-border bg-white text-retro-text">
                  <SelectValue placeholder="Selecione um membro" />
                </SelectTrigger>
                <SelectContent className="retro-card">
                  {familyMembers
                    .filter((member) => member.id !== myMemberId) // Cannot settle with self
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id} className="retro-text">
                        {member.name || member.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="settleAmount" className="retro-text">
                Valor
              </Label>
              <Input
                id="settleAmount"
                type="number"
                step="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(Number(e.target.value))}
                className="retro-border bg-white text-retro-text"
                placeholder="0.00"
              />
            </div>
            <RetroButton type="submit" className="w-full">
              Registrar Acerto
            </RetroButton>
          </form>
        </RetroCardContent>
      </RetroCard>

      <RetroCard className="p-6">
        <RetroCardHeader>
          <RetroCardTitle>Histórico de Transações</RetroCardTitle>
        </RetroCardHeader>
        <RetroCardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma transação registrada ainda.</p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center gap-3 retro-border p-3">
                  {getTransactionIcon(transaction.type)}
                  <div className="flex-1">
                    <p className="font-semibold retro-text">R$ {transaction.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{getTransactionDescription(transaction)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RetroCardContent>
      </RetroCard>
    </div>
  )
}
