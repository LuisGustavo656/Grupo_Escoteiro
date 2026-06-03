const express = require('express');
const router = express.Router();
const activityController = require('./activityController');
const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// Qualquer chefe ou diretoria pode criar
router.post('/', authMiddleware, authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']), activityController.createActivity);

// APENAS Diretoria vê o panorama geral
router.get('/', authMiddleware, authorize(['ADMIN', 'presidente']), activityController.getAllActivities);

// Chefia vê do seu Ramo
router.get('/branch/:branch_id', authMiddleware, authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']), activityController.getActivitiesByBranch);

// Qualquer chefe ou diretoria pode deletar (o ideal seria travar para só quem criou apagar, mas vamos manter simples por agora)
router.delete('/:id', authMiddleware, authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']), activityController.deleteActivity);

module.exports = router;