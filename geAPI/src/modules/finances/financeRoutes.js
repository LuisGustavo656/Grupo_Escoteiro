const express = require('express');
const router = express.Router();
const financeController = require('./financeController');

// 1. Nossos seguranças importados aqui no topo!
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware'); // <-- ESSA É A LINHA QUE EVITA O ERRO!

// 2. As rotas protegidas
router.post('/', authMiddleware, authorize(['ADMIN', 'FINANCEIRO', 'CHEFE DE SEÇÃO']), financeController.createTransaction);

router.get('/', authMiddleware, authorize(['ADMIN', 'FINANCEIRO']), financeController.getAllFinances);

router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'FINANCEIRO', 'CHEFE DE SEÇÃO']), financeController.getFinancesByBranch);

router.delete('/:id', authMiddleware, authorize(['ADMIN']), financeController.deleteTransaction);

module.exports = router;