const express = require('express');
const router = express.Router();
const authController = require('./authController');
const authMiddleware = require('../../middleware/authMiddleware');

// Login (aberto)
router.post('/login', authController.login);

// Troca de senha (precisa estar logado)
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;