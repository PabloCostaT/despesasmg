const express = require("express")
const { authenticateToken, authorizeFamilyMember, authorizeFamilyAdmin } = require("../middleware/authMiddleware")
const { v4: uuidv4 } = require("uuid")

const router = express.Router()

// Criar uma nova família
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body
  const userId = req.user.id

  if (!name) {
    return res.status(400).json({ message: "Nome da família é obrigatório" })
  }

  try {
    const result = await req.sql.begin(async (sql) => {
      // Cria a família
      const familyResult = await sql`
        INSERT INTO families (name, created_by_user_id) VALUES (${name}, ${userId}) RETURNING id, name
      `
      const family = familyResult[0]

      // Adiciona o criador como membro administrador da família
      const memberResult = await sql`
        INSERT INTO family_members (family_id, user_id, role, status, joined_at) VALUES (${family.id}, ${userId}, ${"admin"}, ${"active"}, CURRENT_TIMESTAMP) RETURNING id, role, status
      `
      const familyMember = memberResult[0]

      // Cria uma carteira para o novo membro ativo da família
      await sql`
        INSERT INTO wallets (family_member_id) VALUES (${familyMember.id})
      `
      return { family, familyMember }
    })
    res.status(201).json({
      message: "Família criada e você agora é um membro administrador",
      family: result.family,
      familyMember: result.familyMember,
    })
  } catch (error) {
    console.error("Erro ao criar família:", error)
    res.status(500).json({ message: "Erro do servidor ao criar família" })
  }
})

// Obter famílias das quais o usuário é membro
router.get("/", authenticateToken, async (req, res) => {
  const userId = req.user.id
  try {
    const result = await req.sql`
      SELECT f.id, f.name, fm.role, fm.status
      FROM families f
      JOIN family_members fm ON f.id = fm.family_id
      WHERE fm.user_id = ${userId}
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar famílias do usuário:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar famílias" })
  }
})

// Obter uma família específica por ID (requer acesso de membro)
router.get("/:familyId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  try {
    const result = await req.sql`
      SELECT id, name, created_by_user_id FROM families WHERE id = ${familyId}
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }
    res.status(200).json(result[0])
  } catch (error) {
    console.error("Erro ao buscar família:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar família" })
  }
})

// Atualizar detalhes da família (requer acesso de administrador)
router.put("/:familyId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId } = req.params
  const { name } = req.body
  if (!name) {
    return res.status(400).json({ message: "Nome da família é obrigatório" })
  }
  try {
    const result = await req.sql`
      UPDATE families SET name = ${name}, updated_at = CURRENT_TIMESTAMP WHERE id = ${familyId} RETURNING id, name
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }
    res.status(200).json({ message: "Família atualizada com sucesso", family: result[0] })
  } catch (error) {
    console.error("Erro ao atualizar família:", error)
    res.status(500).json({ message: "Erro do servidor ao atualizar família" })
  }
})

// Excluir uma família (requer acesso de administrador)
router.delete("/:familyId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId } = req.params
  try {
    const result = await req.sql`
      DELETE FROM families WHERE id = ${familyId} RETURNING id
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Família não encontrada" })
    }
    res.status(200).json({ message: "Família excluída com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir família:", error)
    res.status(500).json({ message: "Erro do servidor ao excluir família" })
  }
})

// Obter todos os membros de uma família (requer acesso de membro)
router.get("/:familyId/members", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  try {
    const result = await req.sql`
      SELECT fm.id, u.id AS user_id, u.name, u.email, u.avatar_url, fm.role, fm.status, fm.joined_at
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      WHERE fm.family_id = ${familyId}
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar membros da família:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar membros da família" })
  }
})

// Convidar um novo membro para a família (requer acesso de administrador)
router.post("/:familyId/members/invite", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId } = req.params
  const { email, role = "member" } = req.body // Função padrão é 'member'
  const invitedByUserId = req.user.id

  if (!email) {
    return res.status(400).json({ message: "Email do usuário a ser convidado é obrigatório" })
  }

  try {
    const member = await req.sql.begin(async (sql) => {
      // Encontra o usuário pelo email
      const userResult = await sql`
        SELECT id FROM users WHERE email = ${email}
      `
      if (userResult.length === 0) {
        // Se o usuário não existe, você pode querer enviar um email de convite para se registrar
        throw new Error("Usuário com este email não encontrado. Por favor, convide-o para se registrar primeiro.")
      }
      const invitedUserId = userResult[0].id

      // Verifica se o usuário já é membro (ativo ou pendente)
      const existingMemberResult = await sql`
        SELECT id FROM family_members WHERE family_id = ${familyId} AND user_id = ${invitedUserId}
      `
      if (existingMemberResult.length > 0) {
        throw new Error("Usuário já é membro ou tem um convite pendente para esta família.")
      }

      // Adiciona como membro pendente
      const memberResult = await sql`
        INSERT INTO family_members (family_id, user_id, role, status, invited_by_user_id) VALUES (${familyId}, ${invitedUserId}, ${role}, ${"pending"}, ${invitedByUserId}) RETURNING id, user_id, role, status
      `
      return memberResult[0]
    })
    res.status(201).json({ message: "Convite enviado com sucesso", member: member })
  } catch (error) {
    console.error("Erro ao convidar membro:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao convidar membro" })
  }
})

// Aceitar convite de família (ação do usuário)
router.post("/members/accept-invite/:familyMemberId", authenticateToken, async (req, res) => {
  const { familyMemberId } = req.params
  const userId = req.user.id

  try {
    const updatedMember = await req.sql.begin(async (sql) => {
      const memberResult = await sql`
        SELECT user_id, status FROM family_members WHERE id = ${familyMemberId}
      `

      if (memberResult.length === 0) {
        throw new Error("Convite não encontrado")
      }

      const member = memberResult[0]

      if (member.user_id !== userId) {
        throw new Error("Proibido: Você só pode aceitar seus próprios convites")
      }

      if (member.status !== "pending") {
        throw new Error("Convite não está pendente ou já foi aceito")
      }

      // Atualiza o status do membro para ativo
      const updateResult = await sql`
        UPDATE family_members SET status = ${"active"}, joined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${familyMemberId} RETURNING id, family_id, user_id, role, status
      `
      const updatedMember = updateResult[0]

      // Cria uma carteira para o novo membro ativo da família
      await sql`
        INSERT INTO wallets (family_member_id) VALUES (${updatedMember.id})
      `
      return updatedMember
    })
    res.status(200).json({ message: "Convite aceito com sucesso", member: updatedMember })
  } catch (error) {
    console.error("Erro ao aceitar convite:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao aceitar convite" })
  }
})

// Atualizar função ou status do membro (requer acesso de administrador)
router.put("/:familyId/members/:memberId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId, memberId } = req.params
  const { role, status } = req.body // role: 'admin' | 'member', status: 'active' | 'inactive'

  if (!role && !status) {
    return res.status(400).json({ message: "Pelo menos um campo (função, status) é obrigatório para atualização" })
  }

  try {
    const result = await req.sql`
      UPDATE family_members
      SET role = COALESCE(${role}, role), status = COALESCE(${status}, status), updated_at = CURRENT_TIMESTAMP
      WHERE id = ${memberId} AND family_id = ${familyId}
      RETURNING id, user_id, role, status
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Membro da família não encontrado nesta família" })
    }
    res.status(200).json({ message: "Membro da família atualizado com sucesso", member: result[0] })
  } catch (error) {
    console.error("Erro ao atualizar membro da família:", error)
    res.status(500).json({ message: "Erro do servidor ao atualizar membro da família" })
  }
})

// Remover um membro da família (requer acesso de administrador)
router.delete("/:familyId/members/:memberId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId, memberId } = req.params
  try {
    await req.sql.begin(async (sql) => {
      // Verifica se o membro a ser excluído é o último administrador
      const memberToDeleteResult = await sql`
        SELECT user_id, role FROM family_members WHERE id = ${memberId} AND family_id = ${familyId}
      `

      if (memberToDeleteResult.length === 0) {
        throw new Error("Membro da família não encontrado nesta família")
      }

      const memberToDelete = memberToDeleteResult[0]

      if (memberToDelete.role === "admin") {
        const adminCountResult = await sql`
          SELECT COUNT(*) FROM family_members WHERE family_id = ${familyId} AND role = ${"admin"} AND status = ${"active"}
        `
        if (Number.parseInt(adminCountResult[0].count) === 1) {
          throw new Error(
            "Não é possível remover o último administrador da família. Atribua outro administrador primeiro.",
          )
        }
      }

      // Exclui o membro da família (isso irá cascatear a exclusão de sua carteira e transações relacionadas)
      const result = await sql`
        DELETE FROM family_members WHERE id = ${memberId} AND family_id = ${familyId} RETURNING id
      `
      if (result.length === 0) {
        throw new Error("Membro da família não encontrado")
      }
    })
    res.status(200).json({ message: "Membro da família removido com sucesso" })
  } catch (error) {
    console.error("Erro ao remover membro da família:", error)
    res.status(500).json({ message: error.message || "Erro do servidor ao remover membro da família" })
  }
})

module.exports = router
