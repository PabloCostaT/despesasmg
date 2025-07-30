const { neon } = require("@neondatabase/serverless")

// Cria uma instância do cliente Neon.
// Em ambientes serverless, esta função é reutilizada para cada invocação.
const sql = neon(process.env.DATABASE_URL)

module.exports = {
  sql: sql, // Exporta a função do cliente Neon para ser usada nas rotas
}
