const express = require('express');
const router = express.Router();
const financeController = require('./financeController');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

const nocache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store'); // Mata o cache de proxies como o Render
  next();
};
// Criar transação (NÃO precisa de nocache porque é um POST, o Render não faz cache disso)
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), financeController.createTransaction);
//  2. AQUI O 'nocache' FOI COLOCADO NA ROTA DE VER O CAIXA GERAL
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), nocache, financeController.getAllFinances);
//  3. AQUI O 'nocache' FOI COLOCADO NA ROTA DE VER O CAIXA DO RAMO
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), nocache, financeController.getFinancesByBranch);
// Deletar transação (NÃO precisa de nocache porque é um DELETE)
router.delete('/:id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO']), financeController.deleteTransaction);
module.exports = router;