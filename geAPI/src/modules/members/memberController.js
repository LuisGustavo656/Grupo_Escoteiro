const pool = require("../../config/database");

exports.createMember = async (req, res) => {
  const { name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO members (name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllMembers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.date_of_birth, m.registration_number, 
             b.name AS branch_name, u.name AS responsible_name,
             p.name AS patrol_name,
             m.skill_fisico, m.skill_tecnico, m.skill_experiencia,
             m.especialidade, m.pontuacao_total, m.grupo_balanceado
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.responsible_id = u.id
      LEFT JOIN patrols p ON m.patrol_id = p.id
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Essencial para a chefia gerir apenas o seu próprio ramo:
exports.getMembersByBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.date_of_birth, m.registration_number, 
             u.name AS responsible_name, p.name AS patrol_name,
             m.skill_fisico, m.skill_tecnico, m.skill_experiencia,
             m.especialidade, m.pontuacao_total, m.grupo_balanceado
      FROM members m
      LEFT JOIN users u ON m.responsible_id = u.id
      LEFT JOIN patrols p ON m.patrol_id = p.id
      WHERE m.branch_id = $1
      ORDER BY m.name
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar os dados de um jovem (Ex: Passagem de Ramo)
exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const { name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE members 
       SET name = $1, date_of_birth = $2, registration_number = $3, branch_id = $4, responsible_id = $5, patrol_id = $6
       WHERE id = $7 
       RETURNING *`,
      [name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    res.json({
      message: "Membro atualizado com sucesso!",
      member: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lançar ou atualizar as notas de um jovem (Para a ML usar depois)
exports.updateMemberSkills = async (req, res) => {
  const { id } = req.params;
  const { skill_fisico, skill_tecnico, skill_experiencia } = req.body;

  // Validação de Segurança: Garante que as notas fiquem entre 1 e 10
  if (
    skill_fisico < 1 || skill_fisico > 10 ||
    skill_tecnico < 1 || skill_tecnico > 10 ||
    skill_experiencia < 1 || skill_experiencia > 10
  ) {
    return res.status(400).json({ error: "Todas as notas devem ser de 1 a 10." });
  }

  try {
    const result = await pool.query(
      `UPDATE members 
       SET skill_fisico = $1, skill_tecnico = $2, skill_experiencia = $3
       WHERE id = $4 
       RETURNING *`,
      [skill_fisico, skill_tecnico, skill_experiencia, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    res.json({
      message: "Notas atualizadas com sucesso! Pronto para o balanceamento.",
      member: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Cadastro em Massa para o Algoritmo de ML
exports.createMembersBulk = async (req, res) => {
  const members = req.body;

  if (!Array.isArray(members)) {
    return res.status(400).json({ error: "O corpo da requisição deve ser um array de escoteiros." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedMembers = [];

    for (const member of members) {
      const { 
        name, date_of_birth, registration_number, branch_id, 
        responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia 
      } = member;

      const result = await client.query(
        `INSERT INTO members 
         (name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia]
      );
      
      insertedMembers.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `Sucesso! ${insertedMembers.length} escoteiros cadastrados de uma vez.`,
      data: insertedMembers
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: "Erro no cadastro em massa: " + error.message });
  } finally {
    client.release();
  }
};