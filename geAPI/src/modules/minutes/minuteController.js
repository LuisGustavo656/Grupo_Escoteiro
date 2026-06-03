const pool = require("../../config/database");

// 1. Criar uma nova Ata de Reunião
exports.createMinute = async (req, res) => {
  const { title, content, meeting_date } = req.body;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO minutes (title, content, meeting_date, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, content, meeting_date, user_id]
    );
    res.status(201).json({ message: "Ata registada com sucesso!", minute: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Ver todas as Atas (Transparência para a Chefia e Diretoria)
exports.getAllMinutes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.name AS created_by_name 
      FROM minutes m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.meeting_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Ver uma Ata específica pelo ID (para ler o conteúdo completo)
exports.getMinuteById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT m.*, u.name AS created_by_name 
      FROM minutes m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ata não encontrada." });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Deletar uma Ata (Apenas a Diretoria pode apagar documentos oficiais)
exports.deleteMinute = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM minutes WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Ata não encontrada." });
    res.json({ message: "Ata apagada com sucesso!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};