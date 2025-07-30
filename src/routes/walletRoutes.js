const express = require("express")
const { authenticateToken, authorizeFamilyMember } = require("../middleware/authMiddleware")
const { v4: uuidv4 } = require("uuid")

const router = express.Router()

// Obter saldo da carteira para um membro específico em uma família
router.get("/:familyId/balance/:memberId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, memberId } = req.params
  const userId = req.user.id

  try {
    // Garante que o memberId solicitado pertence ao usuário atual ou que o usuário é um administrador
    const memberCheck = await req.sql`
      SELECT fm.user_id, fm.role
      FROM family_members fm
      WHERE fm.id = ${memberId} AND fm.family_id = ${familyId}
    `

    if (memberCheck.length === 0) {
      return res.status(404).json({ message: "Membro da família não encontrado nesta família" })
    }

    const targetMember = memberCheck[0]
    const userIsTargetMember = targetMember.user_id === userId
    const userIsAdmin = req.familyMember.role === "admin"

    if (!userIsTargetMember && !userIsAdmin) {
      return res
        .status(403)
        .json({ message: "Proibido: Você só pode ver sua própria carteira ou se for um administrador." })
    }

    const result = await req.sql`
      SELECT w.balance, u.name AS member_name, u.email AS member_email
      FROM wallets w
      JOIN family_members fm ON w.family_member_id = fm.id
      JOIN users u ON fm.user_id = u.id
      WHERE w.family_member_id = ${memberId}
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Carteira não encontrada para este membro" })
    }
    res.status(200).json(result[0])
  } catch (error) {
    console.error("Erro ao buscar saldo da carteira:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar saldo da carteira" })
  }
})

// Obter todos os saldos da carteira para uma família (visão geral)
router.get("/:familyId/balances", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  try {
    const result = await req.sql`
      SELECT
          fm.id AS family_member_id,
          u.id AS user_id,
          u.name AS member_name,
          u.email AS member_email,
          fm.role,
          w.balance
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      JOIN wallets w ON fm.id = w.family_member_id
      WHERE fm.family_id = ${familyId} AND fm.status = ${"active"}
      ORDER BY u.name
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar saldos da carteira da família:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar saldos da carteira da família" })
  }
})

// Obter histórico de transações para a carteira de um membro específico
router.get("/:familyId/transactions/:memberId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, memberId } = req.params
  const userId = req.user.id

  try {
    // Garante que o memberId solicitado pertence ao usuário atual ou que o usuário é um administrador
    const memberCheck = await req.sql`
      SELECT fm.user_id, fm.role
      FROM family_members fm
      WHERE fm.id = ${memberId} AND fm.family_id = ${familyId}
    `

    if (memberCheck.length === 0) {
      return res.status(404).json({ message: "Membro da família não encontrado nesta família" })
    }

    const targetMember = memberCheck[0]
    const userIsTargetMember = targetMember.user_id === userId
    const userIsAdmin = req.familyMember.role === "admin"

    if (!userIsTargetMember && !userIsAdmin) {
      return res
        .status(403)
        .json({ message: "Proibido: Você só pode ver suas próprias transações ou se for um administrador." })
    }

    const result = await req.sql`
      SELECT
          t.id, t.type, t.amount, t.description, t.created_at,
          e.title AS expense_title,
          u_related.name AS related_member_name,
          u_related.email AS related_member_email
      FROM transactions t
      JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN expenses e ON t.related_expense_id = e.id
      LEFT JOIN family_members fm_related ON t.related_member_id = fm_related.id
      LEFT JOIN users u_related ON fm_related.user_id = u_related.id
      WHERE w.family_member_id = ${memberId}
      ORDER BY t.created_at DESC
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar transações da carteira:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar transações da carteira" })
  }
})

// Registrar um acerto entre dois membros (requer acesso de membro para ambos, ou administrador)
router.post("/:familyId/settle", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  const { payerMemberId, receiverMemberId, amount } = req.body // payerMemberId paga receiverMemberId

  if (!payerMemberId || !receiverMemberId || !amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Pagador, recebedor e um valor positivo são obrigatórios" })
  }

  try {
    await req.sql.begin(async (sql) => {
      // Verifica se ambos os membros pertencem à família e estão ativos
      const membersCheck = await sql`
        SELECT id, user_id FROM family_members WHERE id IN (${payerMemberId}, ${receiverMemberId}) AND family_id = ${familyId} AND status = 'active'
      `

      if (membersCheck.length !== 2) {
        throw new Error("Um ou ambos os membros não encontrados ou não ativos nesta família")
      }

      // Garante que o usuário atual está envolvido no acerto ou é um administrador
      const currentUserIsPayer = membersCheck.some((m) => m.id === payerMemberId && m.user_id === req.user.id)
      const currentUserIsReceiver = membersCheck.some((m) => m.id === receiverMemberId && m.user_id === req.user.id)
      const userIsAdmin = req.familyMember.role === "admin"

      if (!currentUserIsPayer && !currentUserIsReceiver && !userIsAdmin) {
        throw new Error(
          "Proibido: Você deve estar envolvido no acerto ou ser um administrador da família para registrá-lo.",
        )
      }

      // Obtém os IDs das carteiras
      const payerWalletResult = await sql`
        SELECT id FROM wallets WHERE family_member_id = ${payerMemberId}
      `
      const receiverWalletResult = await sql`
        SELECT id FROM wallets WHERE family_member_id = ${receiverMemberId}
      `

      if (payerWalletResult.length === 0 || receiverWalletResult.length === 0) {
        throw new Error("Carteiras não encontradas para um ou ambos os membros")
      }

      const payerWalletId = payerWalletResult[0].id
      const receiverWalletId = receiverWalletResult[0].id

      // Atualiza o saldo do pagador (diminui)
      await sql`
        UPDATE wallets SET balance = balance + ${amount}, updated_at = CURRENT_TIMESTAMP WHERE id = ${payerWalletId}
      `
      // Atualiza o saldo do recebedor (aumenta)
      await sql`
        UPDATE wallets SET balance = balance - ${amount}, updated_at = CURRENT_TIMESTAMP WHERE id = ${receiverWalletId}
      `

      // Registra as transações
      await sql`
        INSERT INTO transactions (wallet_id, type, amount, description, related_member_id)
        VALUES (${payerWalletId}, ${"settlement_sent"}, ${amount}, ${`Pagamento para ${receiverMemberId}`}, ${receiverMemberId})
      `
      await sql`
        INSERT INTO transactions (wallet_id, type, amount, description, related_member_id)
        VALUES (${receiverWalletId}, ${"settlement_received"}, ${amount}, ${`Recebimento de ${payerMemberId}`}, ${payerMemberId})
      `
    })
    res.status(200).json({ message: "Acerto registrado com sucesso" })
  } catch (error) {
    console.error("Erro ao registrar acerto:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao registrar acerto" })
  }
})

module.exports = router
