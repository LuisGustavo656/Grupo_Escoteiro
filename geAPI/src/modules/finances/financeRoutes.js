const express = require('express');
const router = express.Router();
const financeController = require('./financeController');

// 1. Nossos seguranças importados aqui no topo!
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// 2. As rotas protegidas com os cargos padronizados

// Criar transação (Chefes podem lançar gastos das suas patrulhas/ramos)
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), financeController.createTransaction);

// Ver TODAS as finanças do Grupo (Apenas a diretoria)
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), financeController.getAllFinances);

// Ver finanças de um Ramo específico (Diretoria + Chefes daquele ramo)
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), financeController.getFinancesByBranch);

// Deletar transação (Só a diretoria pode apagar para evitar fraudes)
router.delete('/:id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), financeController.deleteTransaction);

module.exports = router;