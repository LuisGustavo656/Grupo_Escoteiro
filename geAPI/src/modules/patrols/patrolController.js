const pool = require("../../config/database");

exports.createPatrol = async (req, res) => {
  // Agora recebemos a lista de membros do Front-end (aceita 'membros' ou 'members')
  const { name, branch_id, membros, members } = req.body;
  const listaMembros = membros || members || [];

  // 🛡️ Barricada de segurança de Ramos
  const userRole = req.user.global_role || req.user.branch_role;
  if (req.user && (userRole === 'chefe' || userRole === 'CHEFE DE SEÇÃO' || userRole === 'presidente')) {   
    if (userRole !== 'presidente' && Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ 
        error: "Acesso Negado: Um chefe só pode criar patrulhas dentro do seu próprio ramo!" 
      });
    }
  }

  try {
    // 🔥 Regra de Negócio: Nasce ativa se tiver jovens, ou desativada se estiver vazia
    const initialStatus = listaMembros.length > 0 ? 'ativa' : 'desativada';

    // 1. Cria a patrulha já com o status correto
    const result = await pool.query(
      "INSERT INTO patrols (name, branch_id, status) VALUES ($1, $2, $3) RETURNING *",
      [name, branch_id, initialStatus]
    );
    
    const novaPatrulha = result.rows[0];

    // 2. Vincula os jovens na tabela correta ('members')
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

// Listar TODAS as Patrulhas de um Ramo (Ativas e Desativadas)
exports.getPatrolsByBranch = async (req, res) => {
  const { branch_id } = req.params;

  try {
    // Traz todas as patrulhas para o Front-end decidir como filtrar e exibir
    const result = await pool.query(
      "SELECT * FROM patrols WHERE branch_id = $1 ORDER BY name",
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar os dados de uma Patrulha (Renomear e alterar membros)
exports.updatePatrol = async (req, res) => {
  const { id } = req.params;
  
  // Agora lemos TUDO que o app manda: nome e lista de membros
  const { name, membros, members } = req.body; 
  const listaMembros = membros || members || [];

  try {
    // 1. Regra de Negócio: Atualiza o status
    const novoStatus = listaMembros.length > 0 ? 'ativa' : 'desativada';

    // 2. Atualiza o Nome e o Status no banco
    const result = await pool.query(
      "UPDATE patrols SET name = $1, status = $2 WHERE id = $3 RETURNING *",
      [name, novoStatus, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Patrulha não encontrada." });
    }

    // 3. Limpa a patrulha (tira todo mundo)
    await pool.query("UPDATE members SET patrol_id = NULL WHERE patrol_id = $1", [id]);

    // 4. Recoloca apenas os jovens que vieram na lista do app
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