const express = require("express")
const { authenticateToken, authorizeFamilyMember, authorizeFamilyAdmin } = require("../middleware/authMiddleware")
const { v4: uuidv4 } = require("uuid")

const router = express.Router()

// Criar um novo projeto para uma família (requer acesso de administrador)
router.post("/:familyId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId } = req.params
  const { name, budget, description } = req.body

  if (!name) {
    return res.status(400).json({ message: "Nome do projeto é obrigatório" })
  }
  if (budget && (isNaN(budget) || budget < 0)) {
    return res.status(400).json({ message: "Orçamento deve ser um número não negativo" })
  }

  try {
    const result = await req.sql`
      INSERT INTO projects (family_id, name, budget, description) VALUES (${familyId}, ${name}, ${budget}, ${description}) RETURNING id, name, budget, description
    `
    res.status(201).json({ message: "Projeto criado com sucesso", project: result[0] })
  } catch (error) {
    console.error("Erro ao criar projeto:", error)
    res.status(500).json({ message: "Erro do servidor ao criar projeto" })
  }
})

// Obter todos os projetos para uma família (requer acesso de membro)
router.get("/:familyId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId } = req.params
  try {
    const result = await req.sql`
      SELECT p.id, p.name, p.budget, p.description, p.created_at,
             COALESCE(SUM(e.amount), 0) AS total_spent
      FROM projects p
      LEFT JOIN expenses e ON p.id = e.project_id
      WHERE p.family_id = ${familyId}
      GROUP BY p.id, p.name, p.budget, p.description, p.created_at
      ORDER BY p.created_at DESC
    `
    res.status(200).json(result)
  } catch (error) {
    console.error("Erro ao buscar projetos:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar projetos" })
  }
})

// Obter um projeto específico por ID (requer acesso de membro)
router.get("/:familyId/:projectId", authenticateToken, authorizeFamilyMember(), async (req, res) => {
  const { familyId, projectId } = req.params
  try {
    const result = await req.sql`
      SELECT p.id, p.name, p.budget, p.description, p.created_at,
             COALESCE(SUM(e.amount), 0) AS total_spent
      FROM projects p
      LEFT JOIN expenses e ON p.id = e.project_id
      WHERE p.id = ${projectId} AND p.family_id = ${familyId}
      GROUP BY p.id, p.name, p.budget, p.description, p.created_at
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Projeto não encontrado ou não pertence a esta família" })
    }
    res.status(200).json(result[0])
  } catch (error) {
    console.error("Erro ao buscar projeto:", error)
    res.status(500).json({ message: "Erro do servidor ao buscar projeto" })
  }
})

// Atualizar um projeto (requer acesso de administrador)
router.put("/:familyId/:projectId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId, projectId } = req.params
  const { name, budget, description } = req.body

  if (!name && !budget && !description) {
    return res
      .status(400)
      .json({ message: "Pelo menos um campo (nome, orçamento, descrição) é obrigatório para atualização" })
  }
  if (budget && (isNaN(budget) || budget < 0)) {
    return res.status(400).json({ message: "Orçamento deve ser um número não negativo" })
  }

  try {
    const result = await req.sql`
      UPDATE projects
      SET name = COALESCE(${name}, name),
          budget = COALESCE(${budget}, budget),
          description = COALESCE(${description}, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${projectId} AND family_id = ${familyId}
      RETURNING id, name, budget, description
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Projeto não encontrado ou não pertence a esta família" })
    }
    res.status(200).json({ message: "Projeto atualizado com sucesso", project: result[0] })
  } catch (error) {
    console.error("Erro ao atualizar projeto:", error)
    res.status(500).json({ message: "Erro do servidor ao atualizar projeto" })
  }
})

// Excluir um projeto (requer acesso de administrador)
router.delete("/:familyId/:projectId", authenticateToken, authorizeFamilyAdmin, async (req, res) => {
  const { familyId, projectId } = req.params
  try {
    // A exclusão de um projeto definirá project_id como NULL nas despesas associadas
    const result = await req.sql`
      DELETE FROM projects WHERE id = ${projectId} AND family_id = ${familyId} RETURNING id
    `
    if (result.length === 0) {
      return res.status(404).json({ message: "Projeto não encontrado ou não pertence a esta família" })
    }
    res.status(200).json({ message: "Projeto excluído com sucesso" })
  } catch (error) {
    console.error("Erro ao excluir projeto:", error)
    res.status(500).json({ message: "Erro do servidor ao excluir projeto" })
  }
})

module.exports = router
