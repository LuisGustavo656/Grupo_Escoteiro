const pool = require("../../config/database");

//Criar um novo registro financeiro (Receita ou Despesa)
exports.createTransaction = async (req, res) => {
  const { description, amount, type, transaction_date, branch_id, category } = req.body;
  const user_id = req.user.id; 
  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  const userBranchId = req.user.branch_id;
//Segurança de Ramo e Caixa Geral
  if (userRole !== 'admin' && userRole !== 'financeiro' && userRole !== 'presidente') {
    if (Number(userBranchId) !== Number(branch_id)) {
      return res.status(403).json({ 
        error: "Acesso Negado: Você só pode lançar finanças para o seu próprio ramo!" 
      });
    }
  }

  // Trava do "Evento de Ramo"
  if (category && category.toLowerCase() === 'evento de ramo' && !branch_id) {
    return res.status(400).json({ 
      error: "Para registrar um 'Evento de Ramo', é obrigatório informar o Ramo!" 
    });
  }

  //Se vier vazio, vira NULL no banco. Se não vier categoria, vira 'outros'
  const finalBranchId = branch_id || null; 
  const finalCategory = category || 'outros';

  try {
    const result = await pool.query(
      `INSERT INTO finances (description, amount, type, transaction_date, branch_id, user_id, category) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [description, amount, type, transaction_date, finalBranchId, user_id, finalCategory]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Listar TODAS as finanças (Visão Geral do Grupo Escoteiro)
exports.getAllFinances = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.description, f.amount, f.type, f.transaction_date, f.branch_id, f.category,
             b.name AS branch_name, u.name AS user_name
      FROM finances f
      LEFT JOIN branches b ON f.branch_id = b.id
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.transaction_date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Listar finanças de um RAMO ESPECÍFICO
exports.getFinancesByBranch = async (req, res) => {
  const { branch_id } = req.params;
  
  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  const userBranchId = req.user.branch_id; 
  
  if (userRole !== 'admin' && userRole !== 'financeiro' && userRole !== 'presidente') {
    if (Number(userBranchId) !== Number(branch_id)) {
      return res.status(403).json({ 
        message: "Acesso Negado! Você só tem permissão para visualizar o caixa da sua própria seção." 
      });
    }
  }
  
  try {
    const result = await pool.query(`
      SELECT f.id, f.description, f.amount, f.type, f.transaction_date, f.branch_id, f.category,
             u.name AS user_name
      FROM finances f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.branch_id = $1
      ORDER BY f.transaction_date DESC
    `, [branch_id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deletar um registro (caso alguém cadastre errado)
exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM finances WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Registro financeiro não encontrado" });
    }

    res.json({ message: "Registro deletado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};