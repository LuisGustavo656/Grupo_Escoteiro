const pool = require("../../config/database");

// 1. Criar um novo registro financeiro (Receita ou Despesa)
exports.createTransaction = async (req, res) => {
  const { description, amount, type, transaction_date, branch_id, user_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO finances (description, amount, type, transaction_date, branch_id, user_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [description, amount, type, transaction_date, branch_id, user_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Listar TODAS as finanças (Visão Geral do Grupo Escoteiro)
exports.getAllFinances = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.description, f.amount, f.type, f.transaction_date, 
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

// 3. Listar finanças de um RAMO ESPECÍFICO (O requisito principal do PDF)
exports.getFinancesByBranch = async (req, res) => {
  const { branch_id } = req.params;

  // --- 🔒 NOVA REGRA DE SEGURANÇA AQUI ---
  // Pegamos os dados de quem está logado (vieram embutidos no token JWT)
  const userGlobalRole = req.user.global_role; 
  const userBranchId = req.user.branch_id; 

  // Se a pessoa logada NÃO for da diretoria (ADMIN ou FINANCEIRO)...
  if (userGlobalRole !== 'ADMIN' && userGlobalRole !== 'FINANCEIRO') {
    
    // ...Significa que ela é da chefia da seção. 
    // Então, verificamos se o número da seção que ela quer ver é diferente da seção dela:
    if (userBranchId !== parseInt(branch_id)) {
      return res.status(403).json({ 
        message: "Acesso Negado! Você só tem permissão para visualizar o caixa da sua própria seção." 
      });
    }
  }
  // ----------------------------------------

  try {
    const result = await pool.query(`
      SELECT f.id, f.description, f.amount, f.type, f.transaction_date, 
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

// 4. Deletar um registro (caso alguém cadastre errado)
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