
const pool = require('../../config/database');
const axios = require('axios');

// RF08 - Sugestões pedagógicas com IA
exports.suggestActivities = async (req, res) => {
  const body = req.body || {};
  const branchId = Number(body.branch_id);
  const tema = typeof body.tema === 'string'
    ? body.tema.trim()
    : '';

  // 1. Validar os dados recebidos
  if (!Number.isSafeInteger(branchId) || branchId <= 0) {
    return res.status(400).json({
      error: 'Informe um branch_id válido.'
    });
  }

  if (tema.length < 3 || tema.length > 120) {
    return res.status(400).json({
      error: 'O tema deve ter entre 3 e 120 caracteres.'
    });
  }

  // 2. Verificar a permissão do usuário
  const globalRole = String(
    req.user.global_role || ''
  ).toLowerCase();

  const isGlobalManager = [
    'admin',
    'presidente'
  ].includes(globalRole);

  if (
    !isGlobalManager &&
    Number(req.user.branch_id) !== branchId
  ) {
    return res.status(403).json({
      error: 'Você só pode solicitar sugestões para seu próprio ramo.'
    });
  }

  // 3. Configuração do serviço Python
  const baseUrl = (
    process.env.ML_BASE_URL || ''
  ).trim().replace(/\/+$/, '');

  const serviceToken = (
    process.env.ML_SERVICE_TOKEN || ''
  ).trim();

  if (
    !baseUrl ||
    !/^https?:\/\//i.test(baseUrl) ||
    !serviceToken
  ) {
    console.error('Serviço de IA não configurado.');

    return res.status(503).json({
      error: 'Serviço de sugestões ainda não configurado.'
    });
  }

  try {
    // 4. Consultar o ramo selecionado
    const branchResult = await pool.query(
      'SELECT id, name FROM branches WHERE id = $1',
      [branchId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Ramo não encontrado.'
      });
    }

    const ramo = branchResult.rows[0].name;

    // 5. Buscar o histórico do ramo
    const historyResult = await pool.query(
      `
      SELECT
        title,
        LEFT(
          COALESCE(description, ''),
          1200
        ) AS description,
        activity_date::text AS activity_date
      FROM activities
      WHERE branch_id = $1
        AND activity_date <= CURRENT_DATE
      ORDER BY activity_date DESC, id DESC
      LIMIT 20
      `,
      [branchId]
    );

    const historico = historyResult.rows;

    // 6. Enviar ramo, tema e histórico para a IA
    const mlResponse = await axios.post(
      `${baseUrl}/atividades/rf08`,
      {
        ramo,
        tema,
        historico_atividades: historico
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': serviceToken
        },
        timeout: 45000
      }
    );

    // 7. Validar a resposta da IA
    const atividades = mlResponse.data?.atividades;

    if (
      !Array.isArray(atividades) ||
      atividades.length === 0 ||
      atividades.some(
        a =>
          !a ||
          typeof a.title !== 'string' ||
          !a.title.trim() ||
          typeof a.description !== 'string' ||
          !a.description.trim()
      )
    ) {
      console.error('Resposta inválida da IA.');

      return res.status(502).json({
        error: 'O serviço de IA retornou uma resposta inválida.'
      });
    }

    // 8. Retornar sugestões conforme RF08
    return res.json({
      atividades: atividades.map(a => ({
        title: a.title.trim(),
        description: a.description.trim()
      }))
    });

  } catch (error) {
    console.error(
      'Erro ao gerar sugestões:',
      error.message
    );

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'A IA demorou demais para responder.'
      });
    }

    if (error.response) {
      return res.status(502).json({
        error: 'Serviço de IA indisponível ou com falha.'
      });
    }

    return res.status(500).json({
      error: 'Não foi possível gerar as sugestões agora.'
    });
  }
};
