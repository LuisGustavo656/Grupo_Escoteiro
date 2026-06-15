const pool = require("../../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validação básica de entrada
  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    // Mesma mensagem para email errado e senha errada — não revela qual dos dois falhou
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email ou senha incorretos." });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou senha incorretos." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("ERRO CRÍTICO: JWT_SECRET não está definido no ambiente.");
      return res.status(500).json({ message: "Erro de configuração no servidor." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        global_role: user.global_role,
        branch_id: user.branch_id,
        branch_role: user.branch_role,
        must_change_password: user.must_change_password,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Login realizado com sucesso!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        global_role: user.global_role,
        mustChangePassword: user.must_change_password,
      },
    });

  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};

// Troca de senha obrigatória (quando must_change_password = true)
exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.id;

  if (!newPassword) {
    return res.status(400).json({ message: "A nova senha é obrigatória." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres." });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users 
       SET password = $1, must_change_password = false 
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({ message: "Senha alterada com sucesso!" });

  } catch (err) {
    console.error("Erro ao trocar senha:", err);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};