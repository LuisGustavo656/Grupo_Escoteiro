const pool = require("../../config/database");

// Criar seção
exports.createBranch = async (req, res) => {
  const { name, description } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO branches (name, description) VALUES ($1, $2) RETURNING *",
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar todas
exports.getBranches = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM branches ORDER BY id");

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Buscar por ID
exports.getBranchById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM branches WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Seção não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar
exports.updateBranch = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const result = await pool.query(
      "UPDATE branches SET name = $1, description = $2 WHERE id = $3 RETURNING *",
      [name, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Seção não encontrada" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar
exports.deleteBranch = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM branches WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Seção não encontrada" });
    }

    res.json({ message: "Seção deletada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};