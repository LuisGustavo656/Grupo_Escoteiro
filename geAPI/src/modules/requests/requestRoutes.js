const express = require('express');
const router = express.Router();
const requestController = require('./requestController');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Qualquer chefe pode pedir material
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), requestController.createRequest);

// Chefia vê os seus próprios pedidos
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), requestController.getRequestsByBranch);

// APENAS Diretoria vê todos os pedidos do Grupo Escoteiro
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), requestController.getAllRequests);

// APENAS Diretoria aprova e gera despesa
router.put('/:id/approve', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), requestController.approveRequest);

// APENAS Diretoria pode rejeitar
router.put('/:id/reject', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), requestController.rejectRequest);

module.exports = router;