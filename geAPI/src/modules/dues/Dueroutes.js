const express = require('express');
const router = express.Router();
const dueController = require('./Duecontroller');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Gerar mensalidades do mês (só quem mexe em dinheiro)
router.post('/generate', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), dueController.generateDues);

// Ver TODAS as mensalidades do mês (Caixa Geral)
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), dueController.getAllDues);

// Ver as mensalidades de um RAMO
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), dueController.getDuesByBranch);

// Histórico de um membro específico
router.get('/member/:member_id', authMiddleware, dueController.getDuesByMember);

// Resumo (pagos/pendentes/atrasados)
router.get('/summary', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), dueController.getSummary);

// Marcar como paga
router.put('/:id/pay', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), dueController.payDue);

module.exports = router;