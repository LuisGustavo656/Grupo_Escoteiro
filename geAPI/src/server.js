require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken"); // ✅ 1. Movido para o topo do arquivo!

const pool = require("./config/database");

// ✅ 2. Seus middlewares OFICIAIS e unificados
const authMiddleware = require("./middleware/authMiddleware");
const roleMiddleware = require("./middleware/roleMiddleware");

// Seus módulos de rotas
const branchRoutes = require("./modules/branches/branchRoutes");
const userRoutes = require('./modules/users/userRoutes');
const financeRoutes = require('./modules/finances/financeRoutes');
const authRoutes = require('./modules/auth/authRoutes');
const memberRoutes = require('./modules/members/memberRoutes');
const patrolRoutes = require('./modules/patrols/patrolRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoints principais
app.use('/auth', authRoutes);
app.use("/branches", branchRoutes);
app.use('/users', userRoutes);
app.use('/finances', financeRoutes);
app.use('/members', memberRoutes);
app.use('/patrols', patrolRoutes);

// Teste de conexão com o Banco
app.get("/test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ 3. Rota de Registro usando os middlewares corretos do projeto
app.post("/register", authMiddleware, roleMiddleware(["presidente"]), async (req, res) => {
  try {
    const { name, email, password, global_role } = req.body;
    const cargoFinal = global_role || "chefe";

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, global_role, must_change_password)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, global_role, must_change_password`,
      [name, email, hashedPassword, cargoFinal]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

// Rota de Login direta organizada
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        global_role: user.global_role,
        branch_id: user.branch_id,
        branch_role: user.branch_role,
        must_change_password: user.must_change_password 
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ 
      token,
      user: {
        id: user.id,
        name: user.name,
        global_role: user.global_role,
        mustChangePassword: user.must_change_password 
      }
    }); 

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor ao tentar fazer login" });
  }
}); 

// Rotas de checagem rápida
app.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Rota protegida funcionando",
    user: req.user
  });
});

app.get("/admin-only", authMiddleware, roleMiddleware(["ADMIN"]), (req, res) => {
  res.json({ message: "Você é ADMIN 😎" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});