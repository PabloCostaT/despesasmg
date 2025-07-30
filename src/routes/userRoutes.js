const express = require("express")
const { authenticateToken } = require("../middleware/authMiddleware")

const router = express.Router()

// Obter perfil do usuário atual
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await req.sql`SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ${req.user.id}`
    if (result.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }
    res.status(200).json(result[0])
  } catch (error) {
    console.error("Erro ao buscar perfil do usuário:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar perfil do usuário" })
  }
})

// Atualizar perfil do usuário atual
router.put("/me", authenticateToken, async (req, res) => {
  const { name, avatar_url } = req.body
  try {
    const result = await req.sql`
      UPDATE users SET name = COALESCE(${name}, name), avatar_url = COALESCE(${avatar_url}, avatar_url), updated_at = CURRENT_TIMESTAMP WHERE id = ${req.user.id} RETURNING id, name, email, avatar_url
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" })
    }
    res.status(200).json({ message: "Perfil atualizado com sucesso", user: result[0] })
  } catch (error) {
    console.error("Erro ao atualizar perfil do usuário:", error)
    res.status(500).json({ message: "Erro do servidor ao atualizar perfil do usuário" })
  }
})

module.exports = router
