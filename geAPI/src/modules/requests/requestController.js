const pool = require("../../config/database");

// 1. Chefe cria um pedido de material
exports.createRequest = async (req, res) => {
  const { branch_id, description, amount } = req.body;
  const user_id = req.user.id;
  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  
  // Barricada: Um chefe só pode pedir material para o seu próprio ramo (a menos que seja da diretoria)
  if (userRole !== 'admin' && userRole !== 'presidente' && userRole !== 'financeiro') {
    if (Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ error: "Acesso Negado: Só podes pedir materiais para a tua secção!" });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO material_requests (branch_id, user_id, description, amount) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [branch_id, user_id, description, amount]
    );
    res.status(201).json({ message: "Pedido enviado para o Financeiro com sucesso!", request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Financeiro vê TODOS os pedidos
exports.getAllRequests = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, b.name AS branch_name, u.name AS requested_by 
      FROM material_requests r
      LEFT JOIN branches b ON r.branch_id = b.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Chefe vê os pedidos do seu Ramo
exports.getRequestsByBranch = async (req, res) => {
  const { branch_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT r.*, u.name AS requested_by 
      FROM material_requests r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.branch_id = $1
      ORDER BY r.created_at DESC
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. A MAGIA: Financeiro aprova o pedido e escolhe de onde sai o dinheiro!
exports.approveRequest = async (req, res) => {
  const { id } = req.params;
  const { fund_source } = req.body; // 'geral' ou 'ramo'
  const finance_user_id = req.user.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Começa a transação segura

    // Verifica se o pedido existe e está pendente
    const requestResult = await client.query("SELECT * FROM material_requests WHERE id = $1 FOR UPDATE", [id]);
    if (requestResult.rows.length === 0) throw new Error("Pedido não encontrado.");
    
    const requestData = requestResult.rows[0];
    if (requestData.status !== 'PENDENTE') throw new Error(`Este pedido já foi ${requestData.status}.`);

    // Atualiza o estado para APROVADO
    await client.query("UPDATE material_requests SET status = 'APROVADO' WHERE id = $1", [id]);

    // Lógica inteligente: Caixa Geral vs Caixa do Ramo
    const finalBranchId = (fund_source === 'geral') ? null : requestData.branch_id;
    const descFinanceira = `Materiais aprovados: ${requestData.description}`;

    // Insere o gasto automaticamente nas Finanças!
    await client.query(
      `INSERT INTO finances (description, amount, type, transaction_date, branch_id, user_id, category) 
       VALUES ($1, $2, 'despesa', CURRENT_DATE, $3, $4, 'evento de ramo')`,
      [descFinanceira, requestData.amount, finalBranchId, finance_user_id]
    );

    await client.query('COMMIT'); // Grava tudo em definitivo
    res.json({ message: "Pedido aprovado e despesa registada com sucesso!" });

  } catch (err) {
    await client.query('ROLLBACK'); // Se algo falhar, desfaz tudo (nem aprova, nem gasta)
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
};

// 5. Financeiro rejeita o pedido (não gasta dinheiro)
exports.rejectRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE material_requests SET status = 'REJEITADO' WHERE id = $1 RETURNING *", [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Pedido não encontrado." });
    res.json({ message: "Pedido rejeitado.", request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};