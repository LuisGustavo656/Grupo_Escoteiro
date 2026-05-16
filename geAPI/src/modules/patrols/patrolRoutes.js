const express = require('express');
const router = express.Router();
const patrolController = require('./patrolController');

const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Somente a Chefia e Diretoria podem criar patrulhas
router.post('/', authMiddleware, authorize(['presidente', 'chefe']), patrolController.createPatrol);

// Todos logados podem ver a lista de patrulhas da seção
router.get('/branch/:branch_id', authMiddleware, patrolController.getPatrolsByBranch);

module.exports = router;



const pool = require('../../config/database');

// ROTA TEMPORÁRIA PARA ATUALIZAR O BANCO
router.get('/update-db', async (req, res) => {
  try {
    await pool.query("ALTER TABLE patrols ADD COLUMN status VARCHAR(20) DEFAULT 'ativa'");
    res.send("✅ Coluna 'status' adicionada com sucesso no banco da Render!");
  } catch (err) {
    res.status(500).send("❌ Erro (ou a coluna já existe): " + err.message);
  }
});