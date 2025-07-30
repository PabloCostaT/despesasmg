const jwt = require("jsonwebtoken")

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = (authHeader && authHeader.split(" ")[1]) || req.cookies.token

  if (!token) {
    return res.status(401).json({ message: "Acesso Negado: Token não encontrado" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Acesso Negado: Token inválido" })
    }
    req.user = user // Contém { id: userId, email: userEmail }
    next()
  })
}

const authorizeFamilyMember =
  (role = ["member", "admin"]) =>
  async (req, res, next) => {
    const { familyId } = req.params
    const userId = req.user.id

    if (!familyId) {
      return res.status(400).json({ message: "ID da família é obrigatório" })
    }

    try {
      const result = await req.sql`
        SELECT role, status FROM family_members WHERE family_id = ${familyId} AND user_id = ${userId}
      `

      if (result.length === 0) {
        // neon retorna um array diretamente
        return res.status(403).json({ message: "Proibido: Não é membro desta família" })
      }

      const member = result[0]

      if (member.status !== "active") {
        return res.status(403).json({ message: "Proibido: Status do membro não é ativo" })
      }

      if (!role.includes(member.role)) {
        return res.status(403).json({ message: `Proibido: Requer função de ${role.join(" ou ")}` })
      }

      req.familyMember = member // Anexa detalhes do membro da família à requisição
      next()
    } catch (error) {
      console.error("Erro no middleware authorizeFamilyMember:", error)
      res.status(500).json({ message: "Erro do servidor durante a autorização" })
    }
  }

const authorizeFamilyAdmin = authorizeFamilyMember(["admin"])

module.exports = {
  authenticateToken,
  authorizeFamilyMember,
  authorizeFamilyAdmin,
}
