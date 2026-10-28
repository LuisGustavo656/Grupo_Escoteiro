const pool = require("../../config/database");

// 1. Criar uma nova atividade (Diário de Bordo)
exports.createActivity = async (req, res) => {
  const { branch_id, title, description, activity_date } = req.body;
  const user_id = req.user.id;
  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  
  // Barricada: Chefes só podem registar no seu próprio ramo
  if (userRole !== 'admin' && userRole !== 'presidente') {
    if (Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ error: "Acesso Negado: Só podes registar atividades para a tua secção!" });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO activities (branch_id, title, description, activity_date, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [branch_id, title, description, activity_date, user_id]
    );
    res.status(201).json({ message: "Atividade registada com sucesso!", activity: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Ver todas as atividades (Diretoria)
exports.getAllActivities = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, b.name AS branch_name, u.name AS created_by_name 
      FROM activities a
      LEFT JOIN branches b ON a.branch_id = b.id
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.activity_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Ver atividades do Ramo (Chefia)
exports.getActivitiesByBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT a.*, u.name AS created_by_name 
      FROM activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.branch_id = $1
      ORDER BY a.activity_date DESC
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Deletar atividade (caso o chefe registe duplicado)
exports.deleteActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM activities WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Atividade não encontrada." });
    res.json({ message: "Atividade apagada com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


 // Busca o histórico de atividades para contextualizar a IA
exports.getActivityHistoryForAI = async (branchId) => {
  const id = Number(branchId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Ramo inválido.");
  }

  const result = await pool.query(
    `
    SELECT
      id,
      title,
      LEFT(COALESCE(description, ''), 1500) AS description,
      activity_date::text AS activity_date
    FROM activities
    WHERE branch_id = $1
      AND activity_date <= CURRENT_DATE
    ORDER BY activity_date DESC, id DESC
    LIMIT 20
    `,
    [id]
  );

  return result.rows;
};
