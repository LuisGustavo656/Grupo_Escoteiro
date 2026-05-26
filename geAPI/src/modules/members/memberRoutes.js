const express = require('express');
const router = express.Router();
const memberController = require('./memberController');
const authMiddleware = require('../../middleware/authMiddleware');

// 👇 O import do segurança que estava faltando!
const authorize = require('../../middleware/roleMiddleware'); 

// Todas as rotas protegidas
router.post('/', authMiddleware, memberController.createMember);
router.get('/', authMiddleware, memberController.getAllMembers);
router.get('/branch/:branch_id', authMiddleware, memberController.getMembersByBranch);
router.put('/:id', authMiddleware, memberController.updateMember);

// Dica: Adicionei o authMiddleware aqui também para ninguém de fora alterar as notas de habilidades!
router.put('/:id/skills', authMiddleware, memberController.updateMemberSkills); 

router.delete('/:id', authMiddleware, memberController.deleteMember);

// Rota ÚNICA para balancear jovens sem patrulha usando a IA
router.post('/balancear', authMiddleware, authorize(['ADMIN', 'CHEFE DE SEÇÃO', 'chefe', 'presidente']), memberController.balancearPatrulhasComML);

module.exports = router;