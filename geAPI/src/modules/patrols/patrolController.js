const pool = require("../../config/database");

// Criar uma nova Patrulha/Matilha
exports.createPatrol = async (req, res) => {
  const { name, branch_id } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO patrols (name, branch_id) VALUES ($1, $2) RETURNING *",
      [name, branch_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar as Patrulhas de um Ramo específico
exports.getPatrolsByBranch = async (req, res) => {
  const { branch_id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM patrols WHERE branch_id = $1 ORDER BY name",
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};