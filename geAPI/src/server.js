require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./config/database");
const authMiddleware = require("./middleware/authMiddleware");
const app = express();
const bcrypt = require("bcrypt");
const roleMiddleware = require("./middleware/roleMiddleware");
const branchRoutes = require("./modules/branches/branchRoutes");
const userRoutes = require('./modules/users/userRoutes');
const financeRoutes = require('./modules/finances/financeRoutes');
const authRoutes = require('./modules/auth/authRoutes');
const memberRoutes = require('./modules/members/memberRoutes');
const patrolRoutes = require('./modules/patrols/patrolRoutes');
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use("/branches", branchRoutes);
app.use('/users', userRoutes);
app.use('/finances', financeRoutes);
app.use('/members', memberRoutes);
app.use('/patrols', patrolRoutes);


app.get("/test", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows[0]);
});
app.post("/register", autenticarToken, verificarCargo(["presidente"]), async (req, res) => {
  try {
    const { name, email, password, global_role } = req.body;
    const cargoFinal = global_role || "chefe";

    const hashedPassword = await bcrypt.hash(password, 10);

    // Salvamos com must_change_password = true
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
const jwt = require("jsonwebtoken");

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

    // 1. Incluímos o 'must_change_password' no payload do JWT
    const token = jwt.sign(
      {
        id: user.id,
        global_role: user.global_role,
        branch_id: user.branch_id,
        branch_role: user.branch_role,
        must_change_password: user.must_change_password // Guardado de forma segura no Token
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    // 2. Devolvemos o token E os dados do usuário para o front-end
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
app.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Rota protegida funcionando",
    user: req.user
  });
});
app.get(
  "/admin-only",
  authMiddleware,
  roleMiddleware(["ADMIN"]),
  (req, res) => {
    res.json({ message: "Você é ADMIN 😎" });
  }
);
app.get("/criar-coluna-secreta", async (req, res) => {
  try {
    // 1. Cria a coluna de primeiro acesso no banco
    await pool.query(
      "ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT TRUE;"
    );
    
    // 2. Transforma o 'admin' em 'presidente' e desativa a troca de senha para você
    await pool.query(
      `UPDATE users 
       SET global_role = 'presidente', must_change_password = false 
       WHERE global_role = 'admin';`
    );

    res.send("🎉 Sucesso! A coluna foi criada E o seu usuário 'admin' agora é 'presidente' oficial!");
  } catch (error) {
    console.error(error);
    res.status(500).send("❌ Erro na migração: " + error.message);
  }
});
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});