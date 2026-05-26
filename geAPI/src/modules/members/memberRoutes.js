const express = require('express');
const router = express.Router();
const memberController = require('./memberController');
const authMiddleware = require('../../middleware/authMiddleware');

// Todas as rotas protegidas
router.post('/', authMiddleware, memberController.createMember);
router.get('/', authMiddleware, memberController.getAllMembers);
router.get('/branch/:branch_id', authMiddleware, memberController.getMembersByBranch);
router.put('/:id', authMiddleware, memberController.updateMember);
router.put('/:id/skills', memberController.updateMemberSkills);
router.delete('/:id', authMiddleware, memberController.deleteMember);
// Rota para disparar o cálculo inteligente de divisão de patrulhas por IA
router.post('/balancear', authMiddleware, memberController.balancearPatrulhasComML);
// Rota para balancear jovens sem patrulha usando a IA
router.post('/balancear', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), memberController.balancearPatrulhasComML);
module.exports = router;