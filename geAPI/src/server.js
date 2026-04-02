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
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, global_role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, global_role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, global_role`,
      [name, email, hashedPassword, global_role]
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

    const token = jwt.sign(
      {
        id: user.id,
        global_role: user.global_role,
        branch_id: user.branch_id,
        branch_role: user.branch_role
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no login" });
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
app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});