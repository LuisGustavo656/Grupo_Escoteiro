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


 // Editar lançamento financeiro
exports.updateTransaction = async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};

  const description = String(body.description || '').trim();
  const amount = Number(body.amount);
  const type = body.type;
  const date = String(body.transaction_date || '');
  const category = String(body.category || 'outros').trim();

  const branchId =
    body.branch_id == null || body.branch_id === ''
      ? null
      : Number(body.branch_id);

  // Validar data
  const [year, month, day] = date.split('-').map(Number);

  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    year >= 1000 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(
      Date.UTC(year, month, 0)
    ).getUTCDate();

  // Validar dados recebidos
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    description.length < 3 ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 10000000 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 ||
    !['receita', 'despesa'].includes(type) ||
    !validDate ||
    !category ||
    (
      branchId !== null &&
      (
        !Number.isSafeInteger(branchId) ||
        branchId <= 0
      )
    )
  ) {
    return res.status(400).json({
      error: 'Confira a descrição, o valor, o tipo, a data e o ramo.'
    });
  }

  if (
    category.toLowerCase() === 'evento de ramo' &&
    !branchId
  ) {
    return res.status(400).json({
      error: 'Para registrar um evento de ramo, selecione o ramo.'
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Bloquear o lançamento durante a edição
    const existing = await client.query(
      'SELECT id FROM finances WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (!existing.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        error: 'Lançamento não encontrado. Atualize a lista.'
      });
    }

    // Impedir alteração de mensalidades pagas
    const linkedDue = await client.query(
      'SELECT id FROM dues WHERE finance_id = $1 LIMIT 1',
      [id]
    );

    if (linkedDue.rows.length) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        error:
          'Este lançamento está vinculado a uma mensalidade paga. ' +
          'É necessário tratar o estorno antes de alterá-lo.'
      });
    }

    // Atualizar lançamento
    const updated = await client.query(
      `UPDATE finances
       SET description = $1,
           amount = $2,
           type = $3,
           transaction_date = $4,
           branch_id = $5,
           category = $6
       WHERE id = $7
       RETURNING *`,
      [
        description,
        amount,
        type,
        date,
        branchId,
        category,
        id
      ]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Lançamento atualizado com sucesso!',
      transaction: updated.rows[0]
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('Erro ao editar lançamento:', error);

    return res.status(500).json({
      error: 'Não foi possível salvar o lançamento.'
    });

  } finally {
    if (client) {
      client.release();
    }
  }
};
