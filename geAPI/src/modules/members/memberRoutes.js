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

module.exports = router;