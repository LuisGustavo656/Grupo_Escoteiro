const pool = require("../../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Verificar se o usuário existe pelo email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    const user = result.rows[0];

    // 2. Comparar a senha em texto com a senha encriptada (hash) do banco
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Email ou senha incorretos" });
    }

    // 3. Gerar o Token JWT (o seu "passaporte")
    // Certifique-se de ter a variável JWT_SECRET no seu arquivo .env
    const token = jwt.sign(
      { 
        id: user.id, 
        global_role: user.global_role, 
        branch_id: user.branch_id, 
        branch_role: user.branch_role 
      },
      process.env.JWT_SECRET || 'chave_secreta_padrao', 
      { expiresIn: '8h' } // Token expira em 8 horas
    );

    // 4. Retornar o token e os dados básicos do usuário logado
    res.json({
      message: "Login realizado com sucesso!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        global_role: user.global_role
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};