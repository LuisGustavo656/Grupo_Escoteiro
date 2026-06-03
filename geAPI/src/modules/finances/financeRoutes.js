const express = require('express');
const router = express.Router();
const financeController = require('./financeController');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');
const nocache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};
// Criar transação
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), financeController.createTransaction);
// Ver o CAIXA GERAL (Só chefões)
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), nocache, financeController.getAllFinances);
// Ver o CAIXA DO RAMO
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), nocache, financeController.getFinancesByBranch);
// Deletar transação
router.delete('/:id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), financeController.deleteTransaction);
module.exports = router;