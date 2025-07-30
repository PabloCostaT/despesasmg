require("dotenv").config()
const express = require("express")
const cors = require("cors")
const { sql } = require("./db") // Importa o cliente Neon

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const familyRoutes = require("./routes/familyRoutes")
const expenseRoutes = require("./routes/expenseRoutes")
const projectRoutes = require("./routes/projectRoutes")
const walletRoutes = require("./routes/walletRoutes")

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Torna o cliente SQL acessível para as rotas
app.use((req, res, next) => {
  req.sql = sql // Anexa o cliente Neon ao objeto de requisição
  next()
})

// Rotas
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/families", familyRoutes)
app.use("/api/expenses", expenseRoutes)
app.use("/api/projects", projectRoutes)
app.use("/api/wallets", walletRoutes)

// Verificação básica de saúde da API e conexão com o DB
app.get("/api/health", async (req, res) => {
  try {
    // Testa a conexão com o banco de dados
    await req.sql`SELECT 1`
    res.status(200).json({ status: "ok", message: "MinhaGrana API está rodando e conectada ao DB!" })
  } catch (error) {
    console.error("Erro no health check do DB:", error)
    res.status(500).json({ status: "error", message: "Falha na conexão com o DB", error: error.message })
  }
})

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send("Algo deu errado!")
})

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
