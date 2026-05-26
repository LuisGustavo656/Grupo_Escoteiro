const pool = require("../../config/database");
const axios = require('axios');
function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  
  // Se o mês atual for menor que o mês do aniversário, ou se for o mesmo mês mas o dia ainda não chegou, tira 1 ano
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}
//Define o ID do banco baseado na idade e nas regras do escotismo
function definirRamoPorIdade(idade) {
  if (idade >= 6 && idade <= 10) return 2; // ID 2: Lobinho (6,5 a 10 anos)
  if (idade >= 11 && idade <= 14) return 1; // ID 1: Escoteiro (11 a 14 anos)
  if (idade >= 15 && idade <= 17) return 3; // ID 3: Sênior (15 a 17 anos)
  // Se for 18+ seria Pioneiro/Chefe, mas vou retornar Sênior como teto por enquanto
  return 3; 
}
// Criar membro já definindo o Ramo automaticamente pela IDADE
exports.createMember = async (req, res) => {
  const { 
    name, date_of_birth, registration_number, 
    responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia 
  } = req.body;
  try {
  //O Back-end calcula a idade e força o Ramo correto!
    const idade = calcularIdade(date_of_birth);
    const branch_id_calculado = definirRamoPorIdade(idade);
    const result = await pool.query(
      `INSERT INTO members 
       (name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        name, date_of_birth, registration_number, 
        branch_id_calculado, 
        responsible_id, patrol_id,
        skill_fisico || 1, skill_tecnico || 1, skill_experiencia || 1
      ]
    );
    res.status(201).json({
      message: `Jovem cadastrado com sucesso no Ramo correto (Idade calculada: ${idade} anos)`,
      member: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Listar todos os membros com joins
exports.getAllMembers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.date_of_birth, m.registration_number, 
             b.name AS branch_name, u.name AS responsible_name,
             p.name AS patrol_name,
             m.skill_fisico, m.skill_tecnico, m.skill_experiencia,
             m.especialidade, m.pontuacao_total, m.grupo_balanceado
      FROM members m
      LEFT JOIN branches b ON m.branch_id = b.id
      LEFT JOIN users u ON m.responsible_id = u.id
      LEFT JOIN patrols p ON m.patrol_id = p.id
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Filtrar membros por Ramo (Chefia) - Versão Blindada
exports.getMembersByBranch = async (req, res) => {
  const { branch_id } = req.params;
  const userRole = req.user.global_role || req.user.branch_role || '';
  if (userRole.toLowerCase() !== 'presidente' && userRole.toLowerCase() !== 'admin') {
    if (Number(req.user.branch_id) !== Number(branch_id)) {
      return res.status(403).json({ 
        error: "Acesso Negado: Você só tem permissão para ver os jovens do seu próprio ramo!" 
      });
    }
  }
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.date_of_birth, m.registration_number, 
             u.name AS responsible_name, p.name AS patrol_name,
             m.skill_fisico, m.skill_tecnico, m.skill_experiencia,
             m.especialidade, m.pontuacao_total, m.grupo_balanceado
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

// Atualizar os dados cadastrais de um jovem
exports.updateMember = async (req, res) => {
  const { id } = req.params;
  const { name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id } = req.body;

  try {
    const result = await pool.query(
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
// Lançar ou atualizar apenas as notas (Skills)
exports.updateMemberSkills = async (req, res) => {
  const { id } = req.params;
  const { skill_fisico, skill_tecnico, skill_experiencia } = req.body;

  if (
    skill_fisico < 1 || skill_fisico > 10 ||
    skill_tecnico < 1 || skill_tecnico > 10 ||
    skill_experiencia < 1 || skill_experiencia > 10
  ) {
    return res.status(400).json({ error: "Todas as notas devem ser de 1 a 10." });
  }

  try {
    const result = await pool.query(
      `UPDATE members 
       SET skill_fisico = $1, skill_tecnico = $2, skill_experiencia = $3
       WHERE id = $4 
       RETURNING *`,
      [skill_fisico, skill_tecnico, skill_experiencia, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    res.json({
      message: "Notas atualizadas com sucesso! Pronto para o balanceamento.",
      member: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// Cadastro em Massa para o Algoritmo de ML
exports.createMembersBulk = async (req, res) => {
  const members = req.body;

  if (!Array.isArray(members)) {
    return res.status(400).json({ error: "O corpo da requisição deve ser um array de escoteiros." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertedMembers = [];

    for (const member of members) {
      const { 
        name, date_of_birth, registration_number, branch_id, 
        responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia 
      } = member;

      const result = await client.query(
        `INSERT INTO members 
         (name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, date_of_birth, registration_number, branch_id, responsible_id, patrol_id, skill_fisico, skill_tecnico, skill_experiencia]
      );
      
      insertedMembers.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `Sucesso! ${insertedMembers.length} escoteiros cadastrados de uma vez.`,
      data: insertedMembers
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: "Erro no cadastro em massa: " + error.message });
  } finally {
    client.release();
  }
};
// Excluir um escoteiro específico por ID
exports.deleteMember = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM members WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Membro não encontrado." });
    }

    res.json({
      message: `Membro '${result.rows[0].name}' excluído com sucesso!`,
      deletedMember: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Chamar a Inteligência Artificial no Render para organizar os NOVATOS
exports.balancearPatrulhasComML = async (req, res) => {
  const { branch_id, quantidade_grupos } = req.body;
  if (!branch_id || !quantidade_grupos) {
    return res.status(400).json({ error: "Os campos branch_id e quantidade_grupos são obrigatórios." });
  }
  try {
    const membrosResult = await pool.query(
      `SELECT id, name, skill_fisico, skill_tecnico, skill_experiencia 
       FROM members 
       WHERE branch_id = $1 AND patrol_id IS NULL`, 
      [branch_id]
    );
    const membros = membrosResult.rows;
    if (membros.length === 0) {
      return res.status(404).json({ error: "Não há membros sem patrulha disponíveis para balancear neste ramo." });
    }
    // Monta a estrutura para o Python
    const dadosParaIA = {
      quantidade_grupos: Number(quantidade_grupos),
      membros: membros.map(m => ({
        id: m.id,
        name: m.name,
        skill_fisico: Number(m.skill_fisico || 1),
        skill_tecnico: Number(m.skill_tecnico || 1),
        skill_experiencia: Number(m.skill_experiencia || 1)
      }))
    };
    // Dispara para o Render da IA
    console.log(`🤖 Enviando ${membros.length} novatos para o modelo de ML...`);
    const urlML = 'https://mlrender-8jl0.onrender.com/gerar-grupos';
    
    const respostaML = await axios.post(urlML, dadosParaIA, {
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({
      message: "Jovens sem patrulha balanceados com sucesso!",
      resultado: respostaML.data
    });

  } catch (err) {
    console.error("❌ Erro ao integrar com o ML:", err.message);
    res.status(500).json({ 
      error: "Falha ao processar balanceamento.",
      details: err.message 
    });
  }
};