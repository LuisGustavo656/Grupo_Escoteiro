const express = require('express');
const router = express.Router();
const patrolController = require('./patrolController');

const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// NOVA ROTA: Visão geral para o Presidente/Admin
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente']), patrolController.getAllPatrols);

// Criar patrulha - Agora com a lista completa e unificada
router.post('/', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), patrolController.createPatrol);

// Editar patrulha
router.put('/:id', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), patrolController.updatePatrol);

// Listar patrulhas de um ramo
router.get('/branch/:branch_id', authMiddleware, patrolController.getPatrolsByBranch);

//  Veja que no final agora está balancearPatrolsComML
router.post('/balancear', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), patrolController.balancearPatrolsComML);

module.exports = router;