const pool = require("../../config/database");

// Gerar as mensalidades do mês pra todos os membros ativos de um ramo
// (idempotente: rodar de novo no mesmo mês não duplica)
// due_day = dia do vencimento (ex: 10). Se não vier, usa 10 como padrão.
exports.generateDues = async (req, res) => {
  const { branch_id, reference_month, amount, due_day } = req.body;

  if (!branch_id || !reference_month || !amount) {
    return res.status(400).json({ error: "branch_id, reference_month e amount são obrigatórios." });
  }

  const dia = String(due_day || 10).padStart(2, '0');
  // reference_month chega como 'YYYY-MM-01' -> troca só o dia
  const dueDate = `${reference_month.slice(0, 7)}-${dia}`;

  try {
    const result = await pool.query(
      `
      INSERT INTO dues (member_id, branch_id, reference_month, due_date, amount, status)
      SELECT id, $1, $2, $3, $4, 'pendente'
      FROM members
      WHERE branch_id = $1
      ON CONFLICT (member_id, reference_month) DO NOTHING
      RETURNING *
      `,
      [branch_id, reference_month, dueDate, amount]
    );

    res.status(201).json({
      message: `${result.rows.length} mensalidade(s) gerada(s), vencimento em ${dueDate}.`,
      dues: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trecho reaproveitado em todas as listagens: calcula "atrasado" na hora,
// sem precisar de cron job guardando isso fisicamente no banco.
const STATUS_CALCULADO = `
  CASE
    WHEN d.status = 'pendente' AND d.due_date < CURRENT_DATE THEN 'atrasado'
    ELSE d.status
  END AS status_calculado
`;

// Listar mensalidades de um mês (Visão Geral do Grupo Escoteiro)
exports.getAllDues = async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Informe o mês de referência (?month=YYYY-MM-01)." });
  }

  try {
    const result = await pool.query(`
      SELECT d.*, ${STATUS_CALCULADO}, m.name AS member_name, b.name AS branch_name
      FROM dues d
      JOIN members m ON m.id = d.member_id
      LEFT JOIN branches b ON b.id = d.branch_id
      WHERE d.reference_month = $1
      ORDER BY m.name
    `, [month]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar mensalidades de um RAMO ESPECÍFICO num mês (mesma trava de acesso do financeController)
exports.getDuesByBranch = async (req, res) => {
  const { branch_id } = req.params;
  const { month } = req.query;

  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  const userBranchId = req.user.branch_id;

  if (userRole !== 'admin' && userRole !== 'financeiro' && userRole !== 'presidente') {
    if (Number(userBranchId) !== Number(branch_id)) {
      return res.status(403).json({
        error: "Acesso Negado: Você só pode ver as mensalidades do seu próprio ramo!"
      });
    }
  }

  if (!month) {
    return res.status(400).json({ error: "Informe o mês de referência (?month=YYYY-MM-01)." });
  }

  try {
    const result = await pool.query(`
      SELECT d.*, ${STATUS_CALCULADO}, m.name AS member_name
      FROM dues d
      JOIN members m ON m.id = d.member_id
      WHERE d.branch_id = $1 AND d.reference_month = $2
      ORDER BY m.name
    `, [branch_id, month]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Histórico de mensalidades de um membro
exports.getDuesByMember = async (req, res) => {
  const { member_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT d.*, ${STATUS_CALCULADO}
       FROM dues d
       WHERE d.member_id = $1
       ORDER BY d.reference_month DESC`,
      [member_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Marcar mensalidade como paga e lançar automaticamente em `finances`
// (mesmo padrão transacional do requestController.approveRequest)
exports.payDue = async (req, res) => {
  const { id } = req.params;
  const finance_user_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dueResult = await client.query(
      `SELECT d.*, m.name AS member_name
       FROM dues d JOIN members m ON m.id = d.member_id
       WHERE d.id = $1 FOR UPDATE`,
      [id]
    );

    if (dueResult.rows.length === 0) throw new Error("Mensalidade não encontrada.");

    const due = dueResult.rows[0];
    if (due.status === 'pago') throw new Error("Essa mensalidade já está paga.");

    const financeResult = await client.query(
      `INSERT INTO finances (description, amount, type, transaction_date, branch_id, user_id, category)
       VALUES ($1, $2, 'receita', CURRENT_DATE, $3, $4, 'mensalidade')
       RETURNING id`,
      [`Mensalidade - ${due.member_name}`, due.amount, due.branch_id, finance_user_id]
    );

    const updated = await client.query(
      `UPDATE dues
       SET status = 'pago', payment_date = CURRENT_DATE, finance_id = $1
       WHERE id = $2
       RETURNING *`,
      [financeResult.rows[0].id, id]
    );

    await client.query('COMMIT');
    res.json({ message: "Mensalidade paga e lançada no financeiro!", due: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

// Resumo rápido (quantos pagos / pendentes / atrasados e valores)
// Usa o status calculado (não o bruto), pra "atrasado" aparecer certo mesmo
// sem nenhum processo automático rodando.
exports.getSummary = async (req, res) => {
  const { month, branch_id } = req.query;

  if (!month) {
    return res.status(400).json({ error: "Informe o mês de referência (?month=YYYY-MM-01)." });
  }

  try {
    const params = [month];
    let query = `
      SELECT
        ${STATUS_CALCULADO.replace('AS status_calculado', 'AS status')},
        COUNT(*)::int AS total,
        COALESCE(SUM(d.amount), 0) AS valor
      FROM dues d
      WHERE d.reference_month = $1
    `;
    if (branch_id) {
      params.push(branch_id);
      query += ` AND d.branch_id = $${params.length}`;
    }
    query += ' GROUP BY 1';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};