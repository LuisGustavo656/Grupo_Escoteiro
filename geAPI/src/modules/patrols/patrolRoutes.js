const express = require('express');
const router = express.Router();
const patrolController = require('./patrolController');

const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Criar patrulha - Agora com a lista completa e unificada
router.post('/', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), patrolController.createPatrol);
// Editar patrulha
router.put('/:id', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), patrolController.updatePatrol);
// Listar patrulhas de um ramo
router.get('/branch/:branch_id', authMiddleware, patrolController.getPatrolsByBranch);
module.exports = router;



const pool = require('../../config/database');
