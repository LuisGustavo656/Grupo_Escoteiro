const pool = require("../../config/database");

exports.createPatrol = async (req, res) => {
  const { name, branch_id } = req.body;
  // Verifica se o req.user existe (veio do token) e se o cargo é chefe
  if (req.user && (req.user.role === 'chefe' || req.user.role === 'CHEFE DE SEÇÃO' || req.user.role === 'presidente')) {
    
    // Converte para número por segurança e compara: Ramo do Chefe x Ramo da Patrulha
    if (req.user.role !== 'presidente' && Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ 
        error: "Acesso Negado: Um chefe só pode criar patrulhas dentro do seu próprio ramo!" 
      });
    }
  }

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