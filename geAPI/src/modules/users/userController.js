const pool = require("../../config/database");
const bcrypt = require("bcrypt"); // Necessário para criptografar a senha

// Criar Usuário
exports.createUser = async (req, res) => {
  const { name, email, password, global_role, branch_id, branch_role } = req.body;

  try {
    // 1. Criptografando a senha antes de salvar
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Salvando no banco
    const result = await pool.query(
      `INSERT INTO users (name, email, password, global_role, branch_id, branch_role) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, global_role, branch_id, branch_role`,
      [name, email, hashedPassword, global_role, branch_id, branch_role]
    );

    // Retornamos os dados criados (sem a senha, por segurança)
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar todos os usuários (Trazendo o nome do Ramo junto)
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.global_role, u.branch_role, b.name AS branch_name 
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.id
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Buscar Usuário por ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.global_role, u.branch_role, b.name AS branch_name 
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar Usuário
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, global_role, branch_id, branch_role } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, global_role = $3, branch_id = $4, branch_role = $5 
       WHERE id = $6 
       RETURNING id, name, email, global_role, branch_id, branch_role`,
      [name, email, global_role, branch_id, branch_role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar Usuário
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário deletado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};