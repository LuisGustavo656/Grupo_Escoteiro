const express = require('express');
const router = express.Router();
const minuteController = require('./minuteController');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Qualquer chefe ou diretoria pode criar uma ata
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), minuteController.createMinute);

// Todos podem ver a lista de atas
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), minuteController.getAllMinutes);

// Todos podem ler uma ata específica
router.get('/:id', authMiddleware, authorize(['ADMIN', 'presidente', 'FINANCEIRO', 'CHEFE DE SEÇÃO', 'chefe']), minuteController.getMinuteById);

// APENAS a Diretoria pode apagar documentos oficiais
router.delete('/:id', authMiddleware, authorize(['ADMIN', 'presidente']), minuteController.deleteMinute);

module.exports = router;