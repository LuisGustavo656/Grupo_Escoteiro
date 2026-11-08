const pool = require("../../config/database");

// Retorna apenas os dados necessários ao seletor financeiro.
exports.getMembersForDues = async (req, res) => {
  const branchId = Number(req.query.branch_id);
  if (!Number.isSafeInteger(branchId) || branchId <= 0) {
    return res.status(400).json({ error: "Informe um ramo válido." });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, branch_id FROM members WHERE branch_id = $1 ORDER BY name, id',
      [branchId]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Falha ao listar membros para mensalidades:', err);
    return res.status(500).json({ error: "Não foi possível carregar os membros." });
  }
};

// Esta rota exige um membro. Nunca utiliza o gerador em lote como alternativa.
exports.generateMemberDue = async (req, res) => {
  const body = req.body || {};
  const branchId = Number(body.branch_id);
  const memberId = Number(body.member_id);
  const amount = Number(body.amount);
  const day = Number(body.due_day);
  const reference = typeof body.reference_month === 'string' ? body.reference_month : '';
  if (!Number.isSafeInteger(branchId) || branchId <= 0 ||
      !Number.isSafeInteger(memberId) || memberId <= 0) {
    return res.status(400).json({ error: "Selecione um ramo e um membro válidos." });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000 ||
      Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    return res.status(400).json({ error: "Informe um valor positivo com até duas casas decimais." });
  }
  if (!/^\d{4}-\d{2}-01$/.test(reference)) {
    return res.status(400).json({ error: "Informe a referência no formato YYYY-MM-01." });
  }
  const year = Number(reference.slice(0, 4));
  const month = Number(reference.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1000 || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > lastDay) {
    return res.status(400).json({ error: "Informe uma data de vencimento válida para o mês de referência." });
  }
  const dueDate = `${reference.slice(0, 7)}-${String(day).padStart(2, '0')}`;
  try {
    const member = await pool.query(
      'SELECT id, name FROM members WHERE id = $1 AND branch_id = $2',
      [memberId, branchId]
    );
    if (!member.rows.length) {
      return res.status(404).json({ error: "Membro não encontrado no ramo selecionado." });
    }
    const result = await pool.query(
      `INSERT INTO dues (member_id, branch_id, reference_month, due_date, amount, status)
       SELECT id, branch_id, $3, $4, $5, 'pendente'
       FROM members WHERE id = $1 AND branch_id = $2
       ON CONFLICT (member_id, reference_month) DO NOTHING RETURNING *`,
      [memberId, branchId, reference, dueDate, amount]
    );
    if (!result.rows.length) {
      return res.status(409).json({ error: "Nenhuma cobrança criada: o membro já possui mensalidade neste mês ou mudou de ramo. Atualize os dados antes de tentar novamente." });
    }
    return res.status(201).json({
      message: `Mensalidade gerada para ${member.rows[0].name}, com vencimento em ${dueDate.split('-').reverse().join('/')}.`,
      dues: result.rows
    });
  } catch (err) {
    console.error('Falha ao gerar mensalidade individual:', err);
    return res.status(500).json({ error: "Não foi possível gerar a mensalidade. Atualize os dados antes de tentar novamente." });
  }
};

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


// A mesma trava de linha usada no pagamento impede editar/excluir durante a baixa.
async function mutateUnpaidDue(req, res, remove) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Mensalidade inválida." });
  const { amount, due_date } = req.body || {};
  if (!remove) {
    const value = Number(amount);
    const parts = typeof due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(due_date) ? due_date.split('-').map(Number) : [];
    const [year, month, day] = parts;
    if (!Number.isFinite(value) || value <= 0 || value > 10000000 || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001 ||
        !year || year < 1000 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) {
      return res.status(400).json({ error: "Informe valor positivo com até duas casas decimais e vencimento válido." });
    }
  }
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query("SELECT *, to_char(reference_month, 'YYYY-MM') AS reference_key FROM dues WHERE id = $1 FOR UPDATE", [id]);
    const due = result.rows[0];
    if (!due) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Mensalidade não encontrada. Atualize a lista." });
    }
    if (!['pendente', 'atrasado'].includes(due.status) || due.finance_id != null || due.payment_date != null) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: "Mensalidade com pagamento registrado não pode ser editada ou excluída. É necessário tratar o estorno financeiro primeiro." });
    }
    if (!remove && due_date.slice(0, 7) !== due.reference_key) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "O vencimento deve estar dentro do mês de referência." });
    }
    if (remove) await client.query('DELETE FROM dues WHERE id = $1', [id]);
    else await client.query('UPDATE dues SET amount = $1, due_date = $2 WHERE id = $3', [Number(amount), due_date, id]);
    await client.query('COMMIT');
    return res.json({ message: remove ? "Mensalidade excluída." : "Mensalidade atualizada." });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Falha ao alterar mensalidade:', err);
    return res.status(500).json({ error: "Não foi possível concluir. Atualize os dados antes de tentar novamente." });
  } finally {
    if (client) client.release();
  }
}
exports.updateDue = (req, res) => mutateUnpaidDue(req, res, false);
exports.deleteDue = (req, res) => mutateUnpaidDue(req, res, true);
