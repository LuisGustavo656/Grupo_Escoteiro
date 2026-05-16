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