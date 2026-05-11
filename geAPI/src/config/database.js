const { Pool } = require("pg");
require("dotenv").config(); // Garante o carregamento das variáveis no topo

const connString = process.env.DATABASE_URL;

if (!connString) {
  console.log("❌ ERRO CRÍTICO: A variável DATABASE_URL está VAZIA ou UNDEFINED na Render!");
} else {
  // Esconde a sua senha com segurança antes de printar nas logs públicas da Render
  const safeUrl = connString.replace(/:([^:@]+)@/, ":******@");
  console.log(`🔌 [DEBUG] Tentando conectar no banco usando o link: ${safeUrl}`);
}

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false }
});

module.exports = pool;