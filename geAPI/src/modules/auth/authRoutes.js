const express = require("express");
const router = express.Router();
const authController = require("./authController");
const authMiddleware = require("../../middleware/authMiddleware");

// Aberta — qualquer um pode tentar logar
router.post("/login", authController.login);

// Protegida — precisa estar logado para trocar a senha
router.post("/change-password", authMiddleware, authController.changePassword);

module.exports = router;