const pool = require("../../config/database");

exports.createPatrol = async (req, res) => {
  const { name, branch_id } = req.body;
  // Junta as duas opções de cargo do usuário em uma só para facilitar
  const userRole = req.user.global_role || req.user.branch_role;
  if (req.user && (userRole === 'chefe' || userRole === 'CHEFE DE SEÇÃO' || userRole === 'presidente')) {   
    // Se não for presidente, exige que o Ramo do Chefe seja igual ao da patrulha
    if (userRole !== 'presidente' && Number(req.user.branch_id) !== Number(branch_id)) {
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
// Listar TODAS as Patrulhas de um Ramo (Ativas e Desativadas)
exports.getPatrolsByBranch = async (req, res) => {
  const { branch_id } = req.params;

  try {
    // Removemos o "AND status = 'ativa'" para o Front receber tudo e decidir como filtrar
    const result = await pool.query(
      "SELECT * FROM patrols WHERE branch_id = $1 ORDER BY name",
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};