const express = require("express")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { v4: uuidv4 } = require("uuid")

const router = express.Router()

// Register a new user
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios" })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await req.sql`
      INSERT INTO users (name, email, password_hash) VALUES (${name}, ${email}, ${hashedPassword}) RETURNING id, name, email
    `
    const user = result[0] // neon retorna um array diretamente
    res.status(201).json({ message: "Usuário registrado com sucesso", user })
  } catch (error) {
    if (error.code === "23505") {
      // Violação de unicidade
      return res.status(409).json({ message: "Email já registrado" })
    }
    console.error("Erro ao registrar usuário:", error)
    res.status(500).json({ message: "Erro do servidor durante o registro" })
  }
})

// Login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios" })
  }

  try {
    const result = await req.sql`
      SELECT id, name, email, password_hash FROM users WHERE email = ${email}
    `
    const user = result[0] // neon retorna um array diretamente

    if (!user) {
      return res.status(400).json({ message: "Credenciais inválidas" })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciais inválidas" })
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    })

    res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error("Erro ao fazer login do usuário:", error)
    res.status(500).json({ message: "Erro do servidor durante o login" })
  }
})

// TODO: Implement password recovery (e.g., send email with reset link)
router.post("/forgot-password", (req, res) => {
  res.status(501).json({ message: "Recuperação de senha ainda não implementada" })
})

module.exports = router
