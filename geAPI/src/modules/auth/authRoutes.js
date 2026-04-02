const express = require('express');
const router = express.Router();
const authController = require('./authController');

// Rota de login (aberta para todos, obviamente!)
router.post('/login', authController.login);

module.exports = router;