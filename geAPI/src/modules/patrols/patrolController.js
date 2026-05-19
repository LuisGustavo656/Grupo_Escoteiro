const pool = require("../../config/database");

exports.createPatrol = async (req, res) => {
  const { name, branch_id, membros, members } = req.body;
  const listaMembros = membros || members || [];

  // 1. Barricada de segurança de Ramos
  const userRole = (req.user.global_role || req.user.branch_role || '').toLowerCase();
  if (userRole === 'chefe' || userRole === 'chefe de seção' || userRole === 'presidente') {   
    if (userRole !== 'presidente' && Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ error: "Acesso Negado: Crie patrulhas apenas no seu ramo!" });
    }
  }

  try {
    // 🔥 2. NOVA BARRICADA: Limite Máximo de Patrulhas
    const LIMITE_PATRULHAS = 4; // Mude esse número para o limite que vocês quiserem

    // O banco de dados conta quantas patrulhas esse ramo já tem
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM patrols WHERE branch_id = $1", 
      [branch_id]
    );
    
    const totalAtual = parseInt(countResult.rows[0].count);

    // Se já bateu no teto, o back-end chuta a requisição de volta!
    if (totalAtual >= LIMITE_PATRULHAS) {
      return res.status(400).json({ 
        error: `Limite atingido! O Ramo já possui o máximo de ${LIMITE_PATRULHAS} patrulhas permitidas.` 
      });
    }

    // Se passou pela barricada, salva a patrulha normalmente...
    const result = await pool.query(
      "INSERT INTO patrols (name, branch_id) VALUES ($1, $2) RETURNING *",
      [name, branch_id]
    );
    
    const novaPatrulha = result.rows[0];

    // 3. Vincula os jovens na tabela correta ('members')
    if (listaMembros.length > 0) {
      for (const membroId of listaMembros) {
        await pool.query(
          "UPDATE members SET patrol_id = $1 WHERE id = $2",
          [novaPatrulha.id, membroId]
        );
      }
    }

    res.status(201).json(novaPatrulha);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar TODAS as Patrulhas de um Ramo (Agora trazendo a array de membros junta)
exports.getPatrolsByBranch = async (req, res) => {
  const { branch_id } = req.params;

  try {
    const queryText = `
      SELECT p.*, COALESCE(json_agg(m.id) FILTER (WHERE m.id IS NOT NULL), '[]') AS membros
      FROM patrols p
      LEFT JOIN members m ON m.patrol_id = p.id
      WHERE p.branch_id = $1
      GROUP BY p.id
      ORDER BY p.name
    `;

    const result = await pool.query(queryText, [branch_id]);
    
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar patrulhas com membros:", err);
    res.status(500).json({ error: err.message });
  }
};

// Atualizar os dados de uma Patrulha (Renomear e alterar membros)
exports.updatePatrol = async (req, res) => {
  const { id } = req.params;
  const { name, membros, members } = req.body; 
  const listaMembros = membros || members || [];

  try {
    // Atualiza apenas o Nome no banco (sem usar a coluna 'status')
    const result = await pool.query(
      "UPDATE patrols SET name = $1 WHERE id = $2 RETURNING *",
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patrulha não encontrada." });
    }

    // Limpa a patrulha (tira todo mundo)
    await pool.query("UPDATE members SET patrol_id = NULL WHERE patrol_id = $1", [id]);

    // Recoloca apenas os jovens que vieram na lista do app
    if (listaMembros.length > 0) {
      for (const membroId of listaMembros) {
        await pool.query(
          "UPDATE members SET patrol_id = $1 WHERE id = $2",
          [id, membroId]
        );
      }
    }

    res.json({
      message: "Patrulha e membros atualizados com sucesso!",
      patrol: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar TODAS as patrulhas do Grupo Escoteiro (Visão do Presidente/Admin)
exports.getAllPatrols = async (req, res) => {
  try {
    const queryText = `
      SELECT p.*, COALESCE(json_agg(m.id) FILTER (WHERE m.id IS NOT NULL), '[]') AS membros
      FROM patrols p
      LEFT JOIN members m ON m.patrol_id = p.id
      GROUP BY p.id
      ORDER BY p.name
    `;

    const result = await pool.query(queryText);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar todas as patrulhas:", err);
    res.status(500).json({ error: err.message });
  }
};