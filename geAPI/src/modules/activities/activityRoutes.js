
const express = require('express');
const router = express.Router();

const activityController = require('./activityController');
const activitySuggestionsController = require('./activitySuggestionsController');

const authMiddleware = require('../../middleware/authMiddleware');
const authorize = require('../../middleware/roleMiddleware');

// RF08 - Sugestões de atividades usando IA
router.post(
  '/suggestions',
  authMiddleware,
  authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']),
  activitySuggestionsController.suggestActivities
);

// Criar atividade
router.post(
  '/',
  authMiddleware,
  authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']),
  activityController.createActivity
);

// Ver todas as atividades (Diretoria)
router.get(
  '/',
  authMiddleware,
  authorize(['ADMIN', 'presidente']),
  activityController.getAllActivities
);

// Ver atividades do ramo
router.get(
  '/branch/:branch_id',
  authMiddleware,
  authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']),
  activityController.getActivitiesByBranch
);

// Deletar atividade
router.delete(
  '/:id',
  authMiddleware,
  authorize(['ADMIN', 'presidente', 'CHEFE DE SEÇÃO', 'chefe']),
  activityController.deleteActivity
);

module.exports = router;
