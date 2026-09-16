require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const pool = require("./config/database");
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");

// Rotas dos módulos
const authRoutes = require("./modules/auth/authRoutes");
const branchRoutes = require("./modules/branches/branchRoutes");
const userRoutes = require("./modules/users/userRoutes");
const financeRoutes = require("./modules/finances/financeRoutes");
const memberRoutes = require("./modules/members/memberRoutes");
const patrolRoutes = require("./modules/patrols/patrolRoutes");
const requestRoutes = require("./modules/requests/requestRoutes");
const activityRoutes = require("./modules/activities/activityRoutes");
const minuteRoutes = require("./modules/minutes/minuteRoutes");
const dueRoutes = require('./modules/dues/Dueroutes');

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim());

// ─── Segurança: headers HTTP ─────────────────────────────────────────────────
app.use(helmet());

// ─── CORS: só aceita origem conhecida ────────────────────────────────────────
// Coloque a URL do seu app no .env como ALLOWED_ORIGIN
// Ex: ALLOWED_ORIGIN=https://meu-app.com
// Em desenvolvimento pode deixar http://localhost:3000 ou a porta do seu front
// ─── CORS: só aceita origem conhecida ────────────────────────────────────────
// Coloque as URLs permitidas no .env como ALLOWED_ORIGIN, separadas por vírgula
// Ex: ALLOWED_ORIGIN=https://meu-app.com,http://localhost:8081
const corsOptions = {
  origin: (origin, callback) => {
    // sem "origin" = app mobile nativo, Postman, curl → sempre libera
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Não permitido pelo CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(express.json());

// ─── Rate limiting: protege contra brute force no login ──────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 10,                   // máximo de 10 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
});

// ─── Rotas ───────────────────────────────────────────────────────────────────
app.use("/auth", authLimiter, authRoutes); // rate limit só nas rotas de auth
app.use("/branches", branchRoutes);
app.use("/users", userRoutes);
app.use("/finances", financeRoutes);
app.use("/members", memberRoutes);
app.use("/patrols", patrolRoutes);
app.use("/requests", requestRoutes);
app.use("/activities", activityRoutes);
app.use("/minutes", minuteRoutes);

// ─── Rota de checagem de conexão com o banco ─────────────────────────────────
app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro na conexão com o banco:", err);
    res.status(500).json({ error: "Falha na conexão com o banco de dados." });
  }
});

// ─── Rota de checagem do usuário logado ──────────────────────────────────────
app.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ─── Middleware global de erros ───────────────────────────────────────────────
// Captura qualquer erro não tratado nos controllers
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err);
  res.status(500).json({ error: "Erro interno no servidor." });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});