const express = require("express")
const { authenticateToken, authorizeFamilyMember } = require("../middleware/authMiddleware")
const { v4: uuidv4 } = require("uuid")

const router = express.Router()

// Função auxiliar para calcular divisões
const calculateSplits = (amount, members, splitType, splitDetails) => {
  const splits = []
  let totalAssigned = 0

  if (splitType === "equal") {
    const perMemberAmount = Number.parseFloat((amount / members.length).toFixed(2))
    members.forEach((memberId) => {
      splits.push({ family_member_id: memberId, amount_owed: perMemberAmount, split_type: "equal" })
      totalAssigned += perMemberAmount
    })
  } else if (splitType === "percentage") {
    if (
      !splitDetails ||
      !Array.isArray(splitDetails) ||
      splitDetails.some((d) => !d.memberId || typeof d.percentage !== "number")
    ) {
      throw new Error("Invalid splitDetails for percentage split")
    }
    let totalPercentage = 0
    splitDetails.forEach((detail) => (totalPercentage += detail.percentage))
    if (totalPercentage !== 100) {
      throw new Error("Total percentage must be 100")
    }

    splitDetails.forEach((detail) => {
      const amountOwed = Number.parseFloat(((amount * detail.percentage) / 100).toFixed(2))
      splits.push({
        family_member_id: detail.memberId,
        amount_owed: amountOwed,
        split_type: "percentage",
        percentage: detail.percentage,
      })
      totalAssigned += amountOwed
    })
  } else if (splitType === "manual") {
    if (
      !splitDetails ||
      !Array.isArray(splitDetails) ||
      splitDetails.some((d) => !d.memberId || typeof d.amountOwed !== "number")
    ) {
      throw new Error("Invalid splitDetails for manual split")
    }
    splitDetails.forEach((detail) => {
      splits.push({
        family_member_id: detail.memberId,
        amount_owed: Number.parseFloat(detail.amountOwed.toFixed(2)),
        split_type: "manual",
      })
      totalAssigned += Number.parseFloat(detail.amountOwed.toFixed(2))
    })
  } else {
    throw new Error("Invalid split type")
  }

  // Ajusta para imprecisões de ponto flutuante, se necessário (distribui o restante)
  const remainder = Number.parseFloat((amount - totalAssigned).toFixed(2))
  if (remainder !== 0 && splits.length > 0) {
    // Distribui o restante para o primeiro membro
    splits[0].amount_owed = Number.parseFloat((splits[0].amount_owed + remainder).toFixed(2))
  }

  return splits
}

// Adicionar uma nova despesa
router.post("/:familyId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  const { title, amount, date, category, paidByMemberId, projectId, splitType, splitDetails } = req.body // splitDetails: [{ memberId, percentage/amountOwed }]

  if (!title || !amount || !paidByMemberId || !splitType) {
    return res.status(400).json({ message: "Título, valor, quem pagou e tipo de divisão são obrigatórios" })
  }
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valor deve ser um número positivo" })
  }

  try {
    const expense = await req.sql.begin(async (sql) => {
      // Verifica se o paidByMemberId pertence à família
      const paidByMemberCheck = await sql`
        SELECT id FROM family_members WHERE id = ${paidByMemberId} AND family_id = ${familyId} AND status = ${"active"}
      `
      if (paidByMemberCheck.length === 0) {
        throw new Error("Membro pagador não existe ou não está ativo nesta família")
      }

      // Obtém todos os membros ativos da família para divisão
      const familyMembersResult = await sql`
        SELECT id FROM family_members WHERE family_id = ${familyId} AND status = ${"active"}
      `
      const activeMemberIds = familyMembersResult.map((row) => row.id)

      if (activeMemberIds.length === 0) {
        throw new Error("Nenhum membro ativo nesta família para dividir despesas.")
      }

      // Calcula as divisões
      let calculatedSplits
      try {
        calculatedSplits = calculateSplits(amount, activeMemberIds, splitType, splitDetails)
      } catch (splitError) {
        throw splitError // Re-lança para ser capturado pelo catch externo
      }

      // Insere a despesa
      const expenseResult = await sql`
        INSERT INTO expenses (family_id, title, amount, date, category, paid_by_member_id, project_id)
        VALUES (${familyId}, ${title}, ${amount}, ${date || new Date().toISOString().split("T")[0]}, ${category || "outros"}, ${paidByMemberId}, ${projectId}) RETURNING id, title, amount
      `
      const expense = expenseResult[0]

      // Insere as divisões da despesa
      for (const split of calculatedSplits) {
        await sql`
          INSERT INTO expense_splits (expense_id, family_member_id, amount_owed, split_type, percentage)
          VALUES (${expense.id}, ${split.family_member_id}, ${split.amount_owed}, ${split.split_type}, ${split.percentage || null})
        `
      }
      return expense
    })
    res.status(201).json({ message: "Despesa adicionada com sucesso", expense })
  } catch (error) {
    console.error("Erro ao adicionar despesa:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao adicionar despesa" })
  }
})

// Obter despesas para uma família
router.get("/:familyId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  const { startDate, endDate, category, paidByMemberId, projectId } = req.query // Filtros

  const queryParts = [`e.family_id = ${familyId}`]

  if (startDate) {
    queryParts.push(`e.date >= ${startDate}`)
  }
  if (endDate) {
    queryParts.push(`e.date <= ${endDate}`)
  }
  if (category) {
    queryParts.push(`e.category = ${category}`)
  }
  if (paidByMemberId) {
    queryParts.push(`e.paid_by_member_id = ${paidByMemberId}`)
  }
  if (projectId) {
    queryParts.push(`e.project_id = ${projectId}`)
  }

  const whereClause = queryParts.length > 0 ? `WHERE ${queryParts.join(" AND ")}` : ""

  try {
    const result = await req.sql`
        SELECT
            e.id, e.title, e.amount, e.date, e.category, e.created_at,
            u_payer.name AS paid_by_name, u_payer.email AS paid_by_email,
            fm_payer.id AS paid_by_member_id,
            p.name AS project_name,
            json_agg(json_build_object(
                'member_id', fm_split.id,
                'user_id', u_split.id,
                'name', u_split.name,
                'email', u_split.email,
                'amount_owed', es.amount_owed,
                'split_type', es.split_type,
                'percentage', es.percentage
            )) AS splits
        FROM expenses e
        JOIN family_members fm_payer ON e.paid_by_member_id = fm_payer.id
        JOIN users u_payer ON fm_payer.user_id = u_payer.id
        LEFT JOIN projects p ON e.project_id = p.id
        JOIN expense_splits es ON e.id = es.expense_id
        JOIN family_members fm_split ON es.family_member_id = fm_split.id
        JOIN users u_split ON fm_split.user_id = u_split.id
        ${whereClause}
        GROUP BY e.id, u_payer.name, u_payer.email, fm_payer.id, p.name ORDER BY e.date DESC, e.created_at DESC
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar despesas:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar despesas" })
  }
})

// Obter uma única despesa por ID
router.get("/:familyId/:expenseId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, expenseId } = req.params
  try {
    const result = await req.sql`
      SELECT
          e.id, e.title, e.amount, e.date, e.category, e.created_at,
          u_payer.name AS paid_by_name, u_payer.email AS paid_by_email,
          fm_payer.id AS paid_by_member_id,
          p.name AS project_name, p.id AS project_id,
          json_agg(json_build_object(
              'member_id', fm_split.id,
              'user_id', u_split.id,
              'name', u_split.name,
              'email', u_split.email,
              'amount_owed', es.amount_owed,
              'split_type', es.split_type,
              'percentage', es.percentage
          )) AS splits
      FROM expenses e
      JOIN family_members fm_payer ON e.paid_by_member_id = fm_payer.id
      JOIN users u_payer ON fm_payer.user_id = u_payer.id
      LEFT JOIN projects p ON e.project_id = p.id
      JOIN expense_splits es ON e.id = es.expense_id
      JOIN family_members fm_split ON es.family_member_id = fm_split.id
      JOIN users u_split ON fm_split.user_id = u_split.id
      WHERE e.id = ${expenseId} AND e.family_id = ${familyId}
      GROUP BY e.id, u_payer.name, u_payer.email, fm_payer.id, p.name, p.id
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Despesa não encontrada ou não pertence a esta família" })
    }
    res.status(200).json(result[0])
  } catch (error) {
    console.error("Erro ao buscar despesa:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar despesa" })
  }
})

// Atualizar uma despesa (requer acesso de administrador ou pagador)
router.put("/:familyId/:expenseId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, expenseId } = req.params
  const { title, amount, date, category, paidByMemberId, projectId, splitType, splitDetails } = req.body

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valor deve ser um número positivo" })
  }

  try {
    const updatedExpense = await req.sql.begin(async (sql) => {
      // Verifica se o usuário atual é o pagador ou um administrador da família
      const expenseCheck = await sql`
        SELECT e.paid_by_member_id, fm.role
        FROM expenses e
        JOIN family_members fm ON e.paid_by_member_id = fm.id
        WHERE e.id = ${expenseId} AND e.family_id = ${familyId} AND fm.user_id = ${req.user.id}
      `

      const userIsPayer = expenseCheck.length > 0
      const userIsAdmin = req.familyMember.role === "admin"

      if (!userIsPayer && !userIsAdmin) {
        throw new Error("Proibido: Você deve ser o pagador ou um administrador da família para atualizar esta despesa.")
      }

      // Verifica paidByMemberId se fornecido
      if (paidByMemberId) {
        const paidByMemberCheck = await sql`
          SELECT id FROM family_members WHERE id = ${paidByMemberId} AND family_id = ${familyId} AND status = ${"active"}
        `
        if (paidByMemberCheck.length === 0) {
          throw new Error("Novo paidByMemberId não existe ou não está ativo nesta família")
        }
      }

      // Atualiza os detalhes da despesa
      const updateExpenseResult = await sql`
        UPDATE expenses
        SET title = COALESCE(${title}, title),
            amount = COALESCE(${amount}, amount),
            date = COALESCE(${date}, date),
            category = COALESCE(${category}, category),
            paid_by_member_id = COALESCE(${paidByMemberId}, paid_by_member_id),
            project_id = COALESCE(${projectId}, project_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${expenseId} AND family_id = ${familyId}
        RETURNING id, title, amount
      `

      if (updateExpenseResult.length === 0) {
        throw new Error("Despesa não encontrada ou não pertence a esta família")
      }
      const updatedExpense = updateExpenseResult[0]

      // Se os detalhes de divisão forem fornecidos, atualize-os
      if (splitType && splitDetails) {
        // Exclui as divisões existentes
        await sql`
          DELETE FROM expense_splits WHERE expense_id = ${expenseId}
        `

        // Obtém todos os membros ativos da família para divisão
        const familyMembersResult = await sql`
          SELECT id FROM family_members WHERE family_id = ${familyId} AND status = ${"active"}
        `
        const activeMemberIds = familyMembersResult.map((row) => row.id)

        if (activeMemberIds.length === 0) {
          throw new Error("Nenhum membro ativo nesta família para dividir despesas.")
        }

        // Calcula novas divisões
        let newCalculatedSplits
        try {
          newCalculatedSplits = calculateSplits(updatedExpense.amount, activeMemberIds, splitType, splitDetails)
        } catch (splitError) {
          throw splitError
        }

        // Insere novas divisões
        for (const split of newCalculatedSplits) {
          await sql`
            INSERT INTO expense_splits (expense_id, family_member_id, amount_owed, split_type, percentage)
            VALUES (${expenseId}, ${split.family_member_id}, ${split.amount_owed}, ${split.split_type}, ${split.percentage || null})
          `
        }
      }
      return updatedExpense
    })
    res.status(200).json({ message: "Despesa atualizada com sucesso", expense: updatedExpense })
  } catch (error) {
    console.error("Erro ao atualizar despesa:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao atualizar despesa" })
  }
})

// Excluir uma despesa (requer acesso de administrador ou pagador)
router.delete("/:familyId/:expenseId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, expenseId } = req.params

  try {
    await req.sql.begin(async (sql) => {
      // Verifica se o usuário atual é o pagador ou um administrador da família
      const expenseCheck = await sql`
        SELECT e.paid_by_member_id, fm.role
        FROM expenses e
        JOIN family_members fm ON e.paid_by_member_id = fm.id
        WHERE e.id = ${expenseId} AND e.family_id = ${familyId} AND fm.user_id = ${req.user.id}
      `

      const userIsPayer = expenseCheck.length > 0
      const userIsAdmin = req.familyMember.role === "admin"

      if (!userIsPayer && !userIsAdmin) {
        throw new Error("Proibido: Você deve ser o pagador ou um administrador da família para excluir esta despesa.")
      }

      // A exclusão da despesa irá cascatear a exclusão de suas divisões e transações relacionadas
      const result = await sql`
        DELETE FROM expenses WHERE id = ${expenseId} AND family_id = ${familyId} RETURNING id
      `
      if (result.length === 0) {
        throw new Error("Despesa não encontrada ou não pertence a esta família")
      }
    })
    res.status(200).json({ message: "Despesa excluída com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir despesa:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao excluir despesa" })
  }
})

module.exports = router
