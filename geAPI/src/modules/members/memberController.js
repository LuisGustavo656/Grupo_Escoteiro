const pool = require("../../config/database");

exports.createMember = async (req, res) => {
  // 1. Adicionamos o patrol_id aqui
  const { name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id } = req.body;

  try {
    const result = await pool.query(
      // 2. Adicionamos na query e no array de valores ($6)
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
             p.name AS patrol_name -- 3. Puxando o nome da Patrulha
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.responsible_id = u.id
      LEFT JOIN patrols p ON m.patrol_id = p.id -- 4. Fazendo o link com a tabela patrols
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Essencial para a chefia gerenciar apenas o seu próprio ramo:
exports.getMembersByBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.date_of_birth, m.registration_number, 
             u.name AS responsible_name, p.name AS patrol_name
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
  // 5. Adicionamos o patrol_id aqui
  const { name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id } = req.body;

  try {
    const result = await pool.query(
      // 6. Atualizamos o SET e realocamos o ID para a posição $7
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